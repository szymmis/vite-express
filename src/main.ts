import express, { RequestHandler } from "express";
import core from "express-serve-static-core";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import pc from "picocolors";
import Vite from "vite";

const { NODE_ENV } = process.env;

const Config = {
  mode: (NODE_ENV === "production" ? "production" : "development") as
    | "production"
    | "development",
};
type ConfigurationOptions = Partial<Omit<typeof Config, "viteServerSecure">>;

function info(msg: string) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${pc.dim(timestamp)} ${pc.bold(pc.cyan("[vite-express]"))} ${pc.green(
      msg
    )}`
  );
}

function isStaticFilePath(path: string) {
  return path.match(/(\.\w+$)|@vite|@id|@react-refresh/);
}

async function serveStatic(): Promise<RequestHandler> {
  const config = await Vite.resolveConfig({}, "build");
  const distPath = path.resolve(config.root, config.build.outDir);

  if (!fs.existsSync(distPath)) {
    info(`${pc.yellow(`Static files at ${pc.gray(distPath)} not found!`)}`);
    await build();
  }

  info(`${pc.green(`Serving static files from ${pc.gray(distPath)}`)}`);

  return express.static(distPath, { index: false });
}

const stubMiddleware: RequestHandler = (req, res, next) => next();

async function injectStaticMiddleware(
  app: core.Express,
  middleware: RequestHandler
) {
  app.use(middleware);

  const stubMiddlewareLayer = app._router.stack.find(
    (layer: { handle?: RequestHandler }) => layer.handle === stubMiddleware
  );

  if (stubMiddlewareLayer !== undefined) {
    const serveStaticLayer = app._router.stack.pop();
    app._router.stack = app._router.stack.map((layer: unknown) => {
      return layer === stubMiddlewareLayer ? serveStaticLayer : layer;
    });
  }
}

async function injectViteIndexMiddleware(
  app: core.Express,
  server: Vite.ViteDevServer
) {
  const config = await Vite.resolveConfig({}, "build");
  const template = fs.readFileSync(
    path.resolve(config.root, "index.html"),
    "utf8"
  );

  app.get("/*", async (req, res, next) => {
    if (isStaticFilePath(req.path)) next();
    else res.send(await server.transformIndexHtml(req.originalUrl, template));
  });
}

async function injectIndexMiddleware(app: core.Express) {
  const config = await Vite.resolveConfig({}, "build");
  const distPath = path.resolve(config.root, config.build.outDir);

  app.use("*", (_, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

async function startServer(server: http.Server | https.Server) {
  const vite = await Vite.createServer({
    clearScreen: false,
    appType: "custom",
    server: { middlewareMode: true },
  });
  server.on("close", () => vite.close());

  return vite;
}

function config(config: ConfigurationOptions) {
  if (config.mode !== undefined) Config.mode = config.mode;
}

async function bind(
  app: core.Express,
  server: http.Server | https.Server,
  callback?: () => void
) {
  info(`Running in ${pc.yellow(Config.mode)} mode`);

  if (Config.mode === "development") {
    const vite = await startServer(server);
    await injectStaticMiddleware(app, vite.middlewares);
    await injectViteIndexMiddleware(app, vite);
  } else {
    await injectStaticMiddleware(app, await serveStatic());
    await injectIndexMiddleware(app);
  }

  callback?.();
}

function listen(app: core.Express, port: number, callback?: () => void) {
  const server = app.listen(port, () => bind(app, server, callback));
  return server;
}

async function build() {
  info("Build starting...");
  await Vite.build();
  info("Build completed!");
}

export default { config, bind, listen, build, static: () => stubMiddleware };
