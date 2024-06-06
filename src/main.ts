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

type ServeStaticOptions = {
  /**
   * Enable or disable setting Cache-Control response header, defaults to true.
   * Disabling this will ignore the immutable and maxAge options.
   */
  cacheControl?: boolean | undefined;

  /**
   * Set how "dotfiles" are treated when encountered. A dotfile is a file or directory that begins with a dot (".").
   * Note this check is done on the path itself without checking if the path actually exists on the disk.
   * If root is specified, only the dotfiles above the root are checked (i.e. the root itself can be within a dotfile when when set to "deny").
   * The default value is 'ignore'.
   * 'allow' No special treatment for dotfiles
   * 'deny' Send a 403 for any request for a dotfile
   * 'ignore' Pretend like the dotfile does not exist and call next()
   */
  dotfiles?: string | undefined;

  /**
   * Enable or disable etag generation, defaults to true.
   */
  etag?: boolean | undefined;

  /**
   * Set file extension fallbacks. When set, if a file is not found, the given extensions will be added to the file name and search for.
   * The first that exists will be served. Example: ['html', 'htm'].
   * The default value is false.
   */
  extensions?: string[] | false | undefined;

  /**
   * Let client errors fall-through as unhandled requests, otherwise forward a client error.
   * The default value is true.
   */
  fallthrough?: boolean | undefined;

  /**
   * Enable or disable the immutable directive in the Cache-Control response header.
   * If enabled, the maxAge option should also be specified to enable caching. The immutable directive will prevent supported clients from making conditional requests during the life of the maxAge option to check if the file has changed.
   */
  immutable?: boolean | undefined;

  /**
   * Enable or disable Last-Modified header, defaults to true. Uses the file system's last modified value.
   */
  lastModified?: boolean | undefined;

  /**
   * Provide a max-age in milliseconds for http caching, defaults to 0. This can also be a string accepted by the ms module.
   */
  maxAge?: number | string | undefined;

  /**
   * Redirect to trailing "/" when the pathname is a dir. Defaults to true.
   */
  redirect?: boolean | undefined;

  /**
   * Function to set custom headers on response. Alterations to the headers need to occur synchronously.
   * The function is called as fn(res, path, stat), where the arguments are:
   * res the response object
   * path the file path that is being sent
   * stat the stat object of the file that is being sent
   */
  setHeaders?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((res: http.ServerResponse, path: string, stat: any) => any) | undefined;
};

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
  serveStaticOptions: {} as ServeStaticOptions,
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
      info(
        pc.red(
          `Unable to use ${pc.yellow("Vite")}, running in ${pc.yellow(
            "viteless",
          )} mode`,
        ),
      );
    }
  } catch (e) {
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

async function serveStatic(
  options: Partial<ServeStaticOptions>,
): Promise<RequestHandler> {
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

  return express.static(distPath, {
    index: false,
    ...options,
  });
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
    } catch (e) {
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
  const isUsingViteResolvedConfig = Object.entries(config).length > 3;

  const vite = await createServer(
    mergeConfig(isUsingViteResolvedConfig ? {} : config, {
      configFile: Config.viteConfigFile,
      clearScreen: false,
      appType: "custom",
      server: {
        middlewareMode: true,
        hmr: { server },
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
  Config.serveStaticOptions = config.serveStaticOptions ?? {};
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
    await injectStaticMiddleware(
      app,
      await serveStatic(Config.serveStaticOptions),
    );
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

export default { config, bind, listen, build, static: () => stubMiddleware, getViteConfig };
