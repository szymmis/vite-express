import express from "express";
import core from "express-serve-static-core";
import path from "path";
import { createServer, build, resolveConfig } from "vite";
import fetch from "node-fetch";

async function serveProduction(app: core.Express) {
  await build();
  const config = await resolveConfig({}, "build");
  app.use(express.static(path.resolve(__dirname, config.build.outDir)));
}

async function serveDevelopment(app: core.Express) {
  const server = await createServer({ clearScreen: false });
  const { config } = server;

  const PORT = config.server.port ?? 5173;
  const VITE_HOST = `http://127.0.0.1:${PORT}`;

  app.use((req, res, next) => {
    if (req.path.match(/(\.\w+$)|(@react-refresh|@vite)/))
      return res.redirect(`${VITE_HOST}${req.path}`);
    next();
  });

  app.get("/*", async (_, res) => {
    const content = await fetch(VITE_HOST).then((res) => res.text());
    res.header("Content-Type", "text/html").send(content);
  });

  await server.listen();
}

async function serve(app: core.Express) {
  const mode = process.env.NODE_ENV ?? "development";

  mode === "production"
    ? await serveProduction(app)
    : await serveDevelopment(app);
}

async function listen(
  app: core.Express,
  port: number = 3000,
  callback = () => console.log(`Server is listening on port ${port}...`)
) {
  await serve(app);
  app.listen(port, callback);
}

export = { serve, listen };
