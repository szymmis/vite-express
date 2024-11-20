import express, { RequestHandler } from "express";
import core from "express-serve-static-core";
import expressStaticGzip, {
  ExpressStaticGzipOptions,
} from "express-static-gzip";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import pc from "picocolors";
import type { HmrOptions, ViteDevServer } from "vite";

type ViteConfig = {
  root: string;
  base: string;
  build: { outDir: string };
  server?: { hmr?: boolean | HmrOptions };
};

enum Verbosity {
  Silent = 0,
  ErrorsOnly = 1,
  Normal = 2,
}

const _State = {
  viteConfig: undefined as ViteConfig | undefined,
  staticOptions: undefined as ExpressStaticGzipOptions | undefined,
};

function clearState() {
  _State.viteConfig = undefined;
}

const Config = {
  mode: (process.env.NODE_ENV === "production"
    ? "production"
    : "development") as "production" | "development",
  inlineViteConfig: undefined as Partial<ViteConfig> | undefined,
  viteConfigFile: undefined as string | undefined,
  ignorePaths: undefined as
    | undefined
    | RegExp
    | ((path: string, req: express.Request) => boolean),
  transformer: undefined as
    | undefined
    | ((html: string, req: express.Request) => string | Promise<string>),
  verbosity: Verbosity.Normal,
};

type ConfigurationOptions = Partial<typeof Config>;

function info(msg: string, minimalVerbosity = Verbosity.Normal) {
  if (Config.verbosity < minimalVerbosity) return;

  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${pc.dim(timestamp)} ${pc.bold(pc.cyan("[vite-express]"))} ${pc.green(
      msg,
    )}`,
  );
}

function error(msg: string) {
  info(pc.red(msg), Verbosity.ErrorsOnly);
}

async function getTransformedHTML(html: string, req: express.Request) {
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
  if (Config.viteConfigFile && fs.existsSync(Config.viteConfigFile))
    return Config.viteConfigFile;
  else if (fs.existsSync("vite.config.js")) return "vite.config.js";
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
      const config = await resolveConfig(
        {
          configFile: Config.viteConfigFile,
        },
        "build",
      );
      info(
        `Using ${pc.yellow("Vite")} to resolve the ${pc.yellow("config file")}`,
      );
      return config;
    } catch (e) {
      console.error(e);
      error(
        `Unable to use ${pc.yellow("Vite")}, running in ${pc.yellow(
          "viteless",
        )} mode`,
      );
    }
  } catch {
    /* empty */
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
  } catch {
    error(
      `Unable to locate ${pc.yellow(
        "vite.config.*s file",
      )}, using default options`,
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
    error(`${`Static files at ${pc.gray(distPath)} not found!`}`);
    info(
      `${pc.yellow(
        `Did you forget to run ${pc.bold(pc.green("vite build"))} command?`,
      )}`,
    );
  } else {
    info(`${pc.green(`Serving static files from ${pc.gray(distPath)}`)}`);
  }

  return expressStaticGzip(distPath, { index: false, ..._State.staticOptions });
}

const stubMiddleware: RequestHandler = (req, res, next) => next();

async function injectStaticMiddleware(
  app: core.Express,
  middleware: RequestHandler,
) {
  const config = await getViteConfig();

  app.use(config.base, (req, res, next) =>
    req.path.endsWith(".html") ? next() : middleware(req, res, next),
  );

  const router = (() => {
    try {
      return app.router;
    } catch {
      return app._router;
    }
  })();

  const stubMiddlewareLayer = router.stack.find(
    (layer: { handle?: RequestHandler }) => layer.handle === stubMiddleware,
  );

  if (stubMiddlewareLayer !== undefined) {
    const serveStaticLayer = router.stack.pop();
    router.stack = router.stack.map((layer: unknown) => {
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

function findTemplateFilePath(
  reqPath: string,
  root: string,
): string | undefined {
  if (reqPath.endsWith(".html")) {
    const pathToTest = path.join(root, reqPath);
    if (fs.existsSync(pathToTest)) return pathToTest;
  }

  // if the path doesn't end with a /, look for root/req/path.html
  if (!reqPath.endsWith("/")) {
    const pathToTest = path.join(root, reqPath + ".html");
    if (fs.existsSync(pathToTest)) return pathToTest;
  }

  // find closest index.html to provided path
  const basePath = reqPath.slice(0, reqPath.lastIndexOf("/"));
  const dirs = basePath.split("/");

  while (dirs.length > 0) {
    const pathToTest = path.join(root, ...dirs, "index.html");
    if (fs.existsSync(pathToTest)) return pathToTest;
    dirs.pop();
  }

  return undefined;
}

async function injectViteHTMLMiddleware(
  app: core.Express,
  server: ViteDevServer,
) {
  const config = await getViteConfig();

  app.use(config.base, async (req, res, next) => {
    if (req.method !== "GET") return next();

    if (isIgnoredPath(req.path, req)) return next();

    const templateFilePath = findTemplateFilePath(req.path, config.root);
    if (templateFilePath === undefined) return next();

    const template = fs.readFileSync(templateFilePath, "utf8");
    let html = await server.transformIndexHtml(
      templateFilePath,
      template,
      req.originalUrl,
    );

    try {
      html = await getTransformedHTML(html, req);
      res.send(html);
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
    }
  });
}

async function injectHTMLMiddleware(app: core.Express) {
  const distPath = await getDistPath();
  const config = await getViteConfig();

  app.use(config.base, async (req, res, next) => {
    if (isIgnoredPath(req.path, req)) return next();

    const templateFilePath = findTemplateFilePath(req.path, distPath);
    if (templateFilePath === undefined) return next();

    let html = fs.readFileSync(templateFilePath, "utf8");

    try {
      html = await getTransformedHTML(html, req);
      res.send(html);
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
    }
  });
}

async function startServer(server: http.Server | https.Server) {
  const { createServer, mergeConfig } = await import("vite");

  const config = await getViteConfig();
  const isUsingViteResolvedConfig = "assetsInclude" in config;

  const vite = await createServer(
    mergeConfig(isUsingViteResolvedConfig ? {} : config, {
      configFile: Config.viteConfigFile,
      clearScreen: false,
      appType: "custom",
      server: {
        middlewareMode: true,
        hmr: config.server?.hmr ?? { server },
      },
    }),
  );

  server.on("close", async () => {
    await vite.close();
    server.emit("vite:close");
  });

  return vite;
}

function config(config: ConfigurationOptions) {
  if (config.mode !== undefined) Config.mode = config.mode;
  Config.ignorePaths = config.ignorePaths;
  Config.inlineViteConfig = config.inlineViteConfig;
  Config.transformer = config.transformer;
  Config.viteConfigFile = config.viteConfigFile;
  if (config.verbosity !== undefined) Config.verbosity = config.verbosity;
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
    await injectViteHTMLMiddleware(app, vite);
  } else {
    await injectStaticMiddleware(app, await serveStatic());
    await injectHTMLMiddleware(app);
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

export default {
  config,
  bind,
  listen,
  build,
  static: (options?: ExpressStaticGzipOptions) => {
    // vite does not redirect `/<path>` to `/<path>/`, so neither do we by default
    _State.staticOptions = { serveStatic: { redirect: false }, ...options };
    return stubMiddleware;
  },
  getViteConfig,
  Verbosity,
};
