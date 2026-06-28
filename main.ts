import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { DuckDBManager } from "./duckdb_manager.ts";
import { DuckDBResultReader } from '@duckdb/node-api';

const duck = new DuckDBManager;

const router = new Router();

router.get("/datacenters", (ctx: RouterContext<string>) => list_datacenters(ctx));
router.get("/linear_index", (ctx: RouterContext<string>) => get_linear_index(ctx));

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
