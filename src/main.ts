import express from "express";
import core from "express-serve-static-core";
import fs from "fs";
import http from "http";
import https from "https";
import fetch from "node-fetch";
import path from "path";
import pc from "picocolors";
import Vite from "vite";

const { NODE_ENV } = process.env;

const Config = {
  mode: (NODE_ENV === "production" ? "production" : "development") as
    | "production"
    | "development",
  vitePort: 5173,
  viteServerSecure: false,
  printViteDevServerHost: false,
};
type ConfigurationOptions = Partial<Omit<typeof Config, "viteServerSecure">>;

function getViteHost() {
  return `${Config.viteServerSecure ? "https" : "http"}://localhost:${
    Config.vitePort
  }`;
}

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

async function serveStatic(app: core.Express) {
  info(`Running in ${pc.yellow(Config.mode)} mode`);
  if (Config.mode === "production") {
    const config = await Vite.resolveConfig({}, "build");
    const distPath = path.resolve(config.root, config.build.outDir);
    app.use(express.static(distPath));

    if (!fs.existsSync(distPath)) {
      info(`${pc.yellow(`Static files at ${pc.gray(distPath)} not found!`)}`);
      await build();
    }

    info(`${pc.green(`Serving static files from ${pc.gray(distPath)}`)}`);
  } else {
    app.use((req, res, next) => {
      if (isStaticFilePath(req.path)) {
        fetch(new URL(req.url, getViteHost())).then(async (viteResponse) => {
          if (!viteResponse.ok) return next();

          viteResponse.headers.forEach((value, name) => res.set(name, value));

          if (req.path.match(/@vite\/client/)) {
            const text = await viteResponse.text();
            return res.send(
              text.replace(/hmrPort = null/, `hmrPort = ${Config.vitePort}`)
            );
          }

          viteResponse.body.pipe(res);
        });
      } else next();
    });
  }

  const layer = app._router.stack.pop();
  app._router.stack = [
    ...app._router.stack.slice(0, 2),
    layer,
    ...app._router.stack.slice(2),
  ];
}

async function startDevServer() {
  const server = await Vite.createServer({
    clearScreen: false,
    server: { port: Config.vitePort },
  }).then((server) => server.listen());

  const vitePort = server.config.server.port;
  if (vitePort && vitePort !== Config.vitePort) Config.vitePort = vitePort;

  Config.viteServerSecure = Boolean(server.config.server.https);

  if (Config.printViteDevServerHost)
    info(`Vite is listening ${pc.gray(getViteHost())}`);

  return server;
}

async function serveHTML(app: core.Express) {
  if (Config.mode === "production") {
    const config = await Vite.resolveConfig({}, "build");
    const distPath = path.resolve(config.root, config.build.outDir);

    app.use("*", (_, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    app.get("/*", async (req, res, next) => {
      if (isStaticFilePath(req.path)) return next();

      fetch(new URL(req.path, getViteHost())).then((viteResponse) => {
        viteResponse.headers.forEach((value, name) => res.set(name, value));
        viteResponse.body.pipe(res);
      });
    });
  }
}

function config(config: ConfigurationOptions) {
  if (config.mode !== undefined) Config.mode = config.mode;
  if (config.vitePort !== undefined) Config.vitePort = config.vitePort;
  if (config.printViteDevServerHost !== undefined)
    Config.printViteDevServerHost = config.printViteDevServerHost;
}

async function bind(
  app: core.Express,
  server: http.Server | https.Server,
  callback?: () => void
) {
  if (Config.mode === "development") {
    const devServer = await startDevServer();
    server.on("close", () => devServer?.close());
  }

  await serveStatic(app);
  await serveHTML(app);
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

export default { config, bind, listen, build };
