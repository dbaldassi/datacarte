import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { DuckDBManager } from "./duckdb_manager.ts";
import { DuckDBResultReader } from '@duckdb/node-api';

const duck = new DuckDBManager;

const router = new Router();

router.get("/datacenters", (ctx: RouterContext<string>) => list_datacenters(ctx));

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

    // TODO: Transform reader json results into a usable geojson object, using Longitude and Latitude key for the coordinates, and put other keys into the properties of the point.
    // try to use the .map method

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
