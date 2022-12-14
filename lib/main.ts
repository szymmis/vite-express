import express from "express";
import core from "express-serve-static-core";
import fetch from "node-fetch";
import path from "path";
import { build, createServer, resolveConfig } from "vite";
import { info } from "./lib";

const { NODE_ENV } = process.env;

const MODE = NODE_ENV === "production" ? NODE_ENV : "development";
const PORT = 5173;
const VITE_HOST = `http://localhost:${PORT}`;

function serveStatic(app: core.Express) {
  if (MODE === "development") {
    app.use((req, res, next) => {
      if (req.path.match(/(\.\w+$)|(@react-refresh|@vite)/))
        return res.redirect(`${VITE_HOST}${req.path}`);
      next();
    });
  }
}

async function serveProduction(app: core.Express) {
  info("Building Vite app...");
  await build();
  const config = await resolveConfig({}, "build");
  app.use(
    express.static(path.resolve(__dirname, config.root, config.build.outDir)),
  );
  info("Build completed!");
}

async function serveDevelopment(app: core.Express) {
  info("Vite dev server is starting...");
  const server = await createServer({
    clearScreen: false,
    server: { port: PORT },
  });

  serveStatic(app);

  app.get("/*", async (_, res) => {
    fetch(VITE_HOST)
      .then((res) => res.text())
      .then((content) =>
        content.replace(
          /(\/@react-refresh|\/@vite\/client)/g,
          `${VITE_HOST}$1`,
        ),
      )
      .then((content) => res.header("Content-Type", "text/html").send(content));
  });

  await server.listen();
  info(`Vite dev server is listening on port ${PORT}!`);
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

export default { static: serveStatic, serve, listen };
