import express, { RequestHandler } from "express";
import core from "express-serve-static-core";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import pc from "picocolors";
import type { ViteDevServer } from "vite";

type ViteConfig = {
  root: string;
  base: string;
  build: { outDir: string };
};

const _State = {
  viteConfig: undefined as ViteConfig | undefined,
};

function clearState() {
  _State.viteConfig = undefined;
}

const Config = {
  mode: (process.env.NODE_ENV === "production"
    ? "production"
    : "development") as "production" | "development",
  inlineViteConfig: undefined as Partial<ViteConfig> | undefined,
  ignorePaths: undefined as
    | undefined
    | RegExp
    | ((path: string, req: express.Request) => boolean),
  transformer: undefined as
    | undefined
    | ((html: string, req: express.Request) => string),
};

type ConfigurationOptions = Partial<typeof Config>;

function info(msg: string) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${pc.dim(timestamp)} ${pc.bold(pc.cyan("[vite-express]"))} ${pc.green(
      msg,
    )}`,
  );
}

function isStaticFilePath(path: string) {
  return path.match(/(\.\w+$)|@vite|@id|@react-refresh/);
}

function getTransformedHTML(html: string, req: express.Request) {
  return Config.transformer ? Config.transformer(html, req) : html;
}

function getDefaultViteConfig(): ViteConfig {
  return {
    root: process.cwd(),
    base: "/",
    build: { outDir: "dist" },
  };
}

function getViteConfigPath() {
  if (fs.existsSync("vite.config.js")) return "vite.config.js";
  else if (fs.existsSync("vite.config.ts")) return "vite.config.ts";
  throw new Error("Unable to locate Vite config");
}

async function resolveConfig(): Promise<ViteConfig> {
  if (Config.inlineViteConfig) {
    info(
      `${pc.yellow("Inline config")} detected, ignoring ${pc.yellow(
        "Vite config file",
      )}`,
    );

    return {
      ...getDefaultViteConfig(),
      ...Config.inlineViteConfig,
    };
  }

  try {
    const { resolveConfig } = await import("vite");
    try {
      const config = await resolveConfig({}, "build");
      info(
        `Using ${pc.yellow("Vite")} to resolve the ${pc.yellow("config file")}`,
      );
      return config;
    } catch (e) {
      console.error(e);
      info(
        pc.red(
          `Unable to use ${pc.yellow("Vite")}, running in ${pc.yellow(
            "viteless",
          )} mode`,
        ),
      );
    }
  } catch (e) {
    1;
  }

  try {
    const config = fs.readFileSync(getViteConfigPath(), "utf8");

    const root = config.match(/"?root"?\s*:\s*"([^"]+)"/)?.[1];
    const base = config.match(/"?base"?\s*:\s*"([^"]+)"/)?.[1];
    const outDir = config.match(/"?outDir"?\s*:\s*"([^"]+)"/)?.[1];

    const defaultConfig = getDefaultViteConfig();

    return {
      root: root ?? defaultConfig.root,
      base: base ?? defaultConfig.base,
      build: { outDir: outDir ?? defaultConfig.build.outDir },
    };
  } catch (e) {
    info(
      pc.red(
        `Unable to locate ${pc.yellow(
          "vite.config.*s file",
        )}, using default options`,
      ),
    );

    return getDefaultViteConfig();
  }
}

async function getViteConfig(): Promise<ViteConfig> {
  if (!_State.viteConfig) {
    _State.viteConfig = await resolveConfig();
  }

  return _State.viteConfig;
}

async function getDistPath() {
  const config = await getViteConfig();
  return path.resolve(config.root, config.build.outDir);
}

async function serveStatic(): Promise<RequestHandler> {
  const distPath = await getDistPath();

  if (!fs.existsSync(distPath)) {
    info(`${pc.red(`Static files at ${pc.gray(distPath)} not found!`)}`);
    info(
      `${pc.yellow(
        `Did you forget to run ${pc.bold(pc.green("vite build"))} command?`,
      )}`,
    );
  } else {
    info(`${pc.green(`Serving static files from ${pc.gray(distPath)}`)}`);
  }

  return express.static(distPath, { index: false });
}

const stubMiddleware: RequestHandler = (req, res, next) => next();

async function injectStaticMiddleware(
  app: core.Express,
  middleware: RequestHandler,
) {
  const config = await getViteConfig();
  app.use(config.base, middleware);

  const stubMiddlewareLayer = app._router.stack.find(
    (layer: { handle?: RequestHandler }) => layer.handle === stubMiddleware,
  );

  if (stubMiddlewareLayer !== undefined) {
    const serveStaticLayer = app._router.stack.pop();
    app._router.stack = app._router.stack.map((layer: unknown) => {
      return layer === stubMiddlewareLayer ? serveStaticLayer : layer;
    });
  }
}

function isIgnoredPath(path: string, req: express.Request) {
  if (Config.ignorePaths === undefined) return false;

  return Config.ignorePaths instanceof RegExp
    ? path.match(Config.ignorePaths)
    : Config.ignorePaths(path, req);
}

function findClosestIndexToRoot(
  reqPath: string,
  root: string,
): string | undefined {
  const basePath = reqPath.slice(0, reqPath.lastIndexOf("/"));
  const dirs = basePath.split("/");

  while (dirs.length > 0) {
    const pathToTest = path.join(root, ...dirs, "index.html");
    if (fs.existsSync(pathToTest)) {
      return pathToTest;
    }
    dirs.pop();
  }
  return undefined;
}

async function injectViteIndexMiddleware(
  app: core.Express,
  server: ViteDevServer,
) {
  const config = await getViteConfig();

  app.use(config.base, async (req, res, next) => {
    if (req.method !== "GET") return next();

    if (isIgnoredPath(req.path, req)) return next();

    if (isStaticFilePath(req.path)) next();
    else {
      const indexPath = findClosestIndexToRoot(req.path, config.root);
      if (indexPath === undefined) return next();

      const template = fs.readFileSync(indexPath, "utf8");
      const html = await server.transformIndexHtml(req.originalUrl, template);
      res.send(getTransformedHTML(html, req));
    }
  });
}

async function injectIndexMiddleware(app: core.Express) {
  const distPath = await getDistPath();
  const config = await getViteConfig();

  app.use(config.base, (req, res, next) => {
    if (isIgnoredPath(req.path, req)) return next();

    const indexPath = findClosestIndexToRoot(req.path, distPath);
    if (indexPath === undefined) return next();

    const html = fs.readFileSync(indexPath, "utf8");
    res.send(getTransformedHTML(html, req));
  });
}

async function startServer(server: http.Server | https.Server) {
  const { createServer, mergeConfig } = await import("vite");

  const config = await getViteConfig();
  const isUsingViteResolvedConfig = Object.entries(config).length > 3;

  const vite = await createServer(
    mergeConfig(isUsingViteResolvedConfig ? {} : config, {
      clearScreen: false,
      appType: "custom",
      server: { middlewareMode: true },
    }),
  );

  server.on("close", async () => {
    await vite.close()
    server.emit("vite-dev-server:closed");
  });

  return vite;
}

function config(config: ConfigurationOptions) {
  if (config.mode !== undefined) Config.mode = config.mode;
  Config.ignorePaths = config.ignorePaths;
  Config.inlineViteConfig = config.inlineViteConfig;
  Config.transformer = config.transformer;
}

async function bind(
  app: core.Express,
  server: http.Server | https.Server,
  callback?: () => void,
) {
  info(`Running in ${pc.yellow(Config.mode)} mode`);

  clearState();

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
  const { build } = await import("vite");

  info("Build starting...");
  await build();
  info("Build completed!");
}

export default { config, bind, listen, build, static: () => stubMiddleware };
