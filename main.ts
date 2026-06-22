import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";

const router = new Router();
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
