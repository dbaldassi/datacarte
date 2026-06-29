import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { DuckDBManager } from "./duckdb_manager.ts";
import { DuckDBResultReader } from '@duckdb/node-api';
import { HistoryQuery } from './type.ts';

const duck = new DuckDBManager;

const router = new Router();

router.get("/datacenters", (ctx: RouterContext<string>) => list_datacenters(ctx));
router.get("/linear_index", (ctx: RouterContext<string>) => get_linear_index(ctx));
router.get("/naf", (ctx: RouterContext<string>) => get_naf_map(ctx));
router.get("/naf/:id", (ctx: RouterContext<string>) => get_naf(ctx, Number.parseInt(ctx.params["id"])));
router.post("/history", (ctx: RouterContext<string>) => get_history(ctx));

const app = new Application();

app.use(async (context: RouterContext<string>, next: any) => {
  try {
    await context.send({
      root: `${Deno.cwd()}/www`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });


async function list_datacenters(ctx: RouterContext<string>): Promise<void> {
    const query = `SELECT * FROM datacenters`;
    const reader: DuckDBResultReader = await duck.execute(query);
    const rows = reader.getRowObjectsJson();

    const features = rows.map((row: any) => {
        const properties: any = {};
        for (const key of Object.keys(row)) {
            if (key !== 'Longitude' && key !== 'Latitude') {
                properties[key] = row[key];
            }
        }
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [row.Longitude, row.Latitude]
            },
            properties: properties
        };
    });

    const geojson = {
        type: 'FeatureCollection',
        features: features
    };

    ctx.response.type = 'application/json';
    ctx.response.body = JSON.stringify(geojson);
}


async function get_linear_index(ctx: RouterContext<string>) : Promise<void> {
    const query = `WITH raw_data AS (SELECT conso,SUM(Superficie)::DOUBLE AS Superficie, SUM(ITSurface)::DOUBLE as IT, AVG(Hauteur)::DOUBLE AS Hauteur FROM datacenters
WHERE ("ITSurface" IS NOT NULL OR "Superficie" IS NOT NULL) AND ("Code IRIS" IS NULL OR "Nom commune"  IN ('Marcoussis', 'Labruguière')) AND conso IS NOT NULL
GROUP BY conso
ORDER BY Superficie),
data AS (
SELECT conso, ROUND(COALESCE(IT, (Superficie * (1 + COALESCE(Hauteur, 0) / 6.0)) / 2.0) ) AS surface
FROM raw_data
)
SELECT regr_slope(conso, surface) AS slope, regr_intercept(conso, surface) AS origin FROM data
`;

    const reader: DuckDBResultReader = await duck.execute(query);
    const rows = reader.getRowObjectsJson();

    ctx.response.body = JSON.stringify(rows[0]);
}

async function get_naf_map(ctx: RouterContext<string>) : Promise<void> {
    const query = `SELECT * FROM codenaf2`;

    const reader = await duck.execute(query);
    const rows = reader.getRowObjectsJson();

    ctx.response.body = JSON.stringify(rows);
}

async function get_naf(ctx: RouterContext<string>, code: number) : Promise<void> {
    if(!code) ctx.throw(400, "You need to provide a NAF code");

    const query = `SELECT * FROM codenaf2 WHERE code=${code}`;

    const reader = await duck.execute(query);
    const rows = reader.getRowObjectsJson();

    if(rows.length > 0) ctx.response.body = JSON.stringify(rows[0]);
    else ctx.response.body = JSON.stringify({});
}

async function get_history(ctx: RouterContext<string>) : Promise<void> {
    const params: HistoryQuery = await ctx.request.body.json();

    if(!params.naf) ctx.throw(400, "You need to provide the naf code");
    if(!params.address) ctx.throw(400, "You need to provide the address");
    if(!params.city) ctx.throw(400, "You need to provide the city")

    const query = `SELECT Année, "Consommation annuelle totale de l'adresse (MWh)" AS conso FROM consommation_entreprise
WHERE "Nom commune" = '${params.city}' AND "code_secteur_naf2"='${params.naf}' AND Adresse='${params.address}'
ORDER BY Année DESC`;

    const reader = await duck.execute(query);
    const rows = reader.getRowObjectsJson();

    ctx.response.body = JSON.stringify(rows);
}
