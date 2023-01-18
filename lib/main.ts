import express from "express";
import core from "express-serve-static-core";
import fetch from "node-fetch";
import path from "path";
import colors from "picocolors";
import Vite from "vite";

const { NODE_ENV } = process.env;

const Config = {
  mode: (NODE_ENV === "production" ? "production" : "development") as
    | "production"
    | "development",
  vitePort: 5173,
};

function getViteHost() {
  return `http://localhost:${Config.vitePort}`;
}

function info(msg: string) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${colors.dim(timestamp)} ${colors.bold(
      colors.cyan("[vite-express]")
    )} ${colors.green(msg)}`
  );
}

function isStaticFilePath(path: string) {
  return path.match(/\.\w+$/);
}

async function serveStatic(app: core.Express) {
  if (Config.mode === "production") {
    const config = await Vite.resolveConfig({}, "build");
    app.use(
      express.static(path.resolve(__dirname, config.root, config.build.outDir))
    );
  } else {
    app.use((req, res, next) => {
      if (isStaticFilePath(req.path)) {
        fetch(`${getViteHost()}${req.path}`).then((response) => {
          if (!response.ok) return next();
          res.redirect(response.url);
        });
      } else next();
    });
  }
}

async function startDevServer(app: core.Express) {
  info("Vite dev server is starting...");
  const server = await Vite.createServer({
    clearScreen: false,
    server: { port: Config.vitePort },
  });

  app.get("/*", async (req, res, next) => {
    if (isStaticFilePath(req.path)) return next();

    fetch(getViteHost())
      .then((res) => res.text())
      .then((content) =>
        content.replace(
          /(\/@react-refresh|\/@vite\/client)/g,
          `${getViteHost()}$1`
        )
      )
      .then((content) => res.header("Content-Type", "text/html").send(content));
  });

  await server.listen();
  info(`Vite dev server is listening on port ${Config.vitePort}!`);
}

function config(config: Partial<typeof Config>) {
  if (config.mode) Config.mode = config.mode;
  if (config.vitePort) Config.vitePort = config.vitePort;
}

async function serve(app: core.Express) {
  await serveStatic(app);
  if (Config.mode === "development") await startDevServer(app);
}

async function listen(app: core.Express, port: number, callback?: () => void) {
  await serve(app);
  app.listen(port, callback);
}

async function build() {
  info("Building Vite app...");
  await Vite.build();
  info("Build completed!");
}

export default { build, config, listen, serve, static: serveStatic };
