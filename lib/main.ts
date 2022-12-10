import e from "express";
import core from "express-serve-static-core";
import path from "path";
import { createServer, build, resolveConfig } from "vite";
import fetch from "node-fetch";

const { NODE_ENV } = process.env;

const MODE = NODE_ENV === "production" ? NODE_ENV : "development";
const PORT = 5173;
const VITE_HOST = `http://127.0.0.1:${PORT}`;

function serveStatic() {
  if (MODE === "production") {
    return (_: e.Request, __: e.Response, next: e.NextFunction) => next();
  }

  return (req: e.Request, res: e.Response, next: e.NextFunction) => {
    if (req.path.match(/(\.\w+$)|(@react-refresh|@vite)/))
      return res.redirect(`${VITE_HOST}${req.path}`);
    next();
  };
}

async function serveProduction(app: core.Express) {
  await build();
  const config = await resolveConfig({}, "build");
  console.log(path.resolve(__dirname, config.root, config.build.outDir));
  app.use(e.static(path.resolve(__dirname, config.root, config.build.outDir)));
}

async function serveDevelopment(app: core.Express) {
  const server = await createServer({
    clearScreen: false,
    server: { port: PORT },
  });

  app.use(serveStatic());

  app.get("/*", async (_, res) => {
    const content = await fetch(VITE_HOST).then((res) => res.text());
    res.header("Content-Type", "text/html").send(content);
  });

  await server.listen();
}

async function serve(app: core.Express) {
  MODE === "production"
    ? await serveProduction(app)
    : await serveDevelopment(app);
}

async function listen(app: core.Express, port: number, callback: () => void) {
  await serve(app);
  app.listen(port, callback);
}

export = { static: serveStatic, serve, listen };
