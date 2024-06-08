# ⚡ Vite + Express

> [@vitejs](https://github.com/vitejs/vite) integration module for [@expressjs](https://github.com/expressjs/express)

[![npm](https://img.shields.io/npm/v/vite-express)](https://www.npmjs.org/package/vite-express)
[![downloads-per-week](https://img.shields.io/npm/dt/vite-express?color=success)](https://www.npmjs.org/package/vite-express)
[![bundle-size](https://img.shields.io/bundlephobia/minzip/vite-express)](https://www.npmjs.org/package/vite-express)
[![license](https://img.shields.io/npm/l/vite-express?color=purple)](https://www.npmjs.org/package/vite-express)

> If you like `vite-express` make sure to leave **a ⭐ star**!\
> You can also\
> [!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/szymmis)

- [📦 Installation \& usage](#-installation--usage)
- [🚚 Shipping to production](#-shipping-to-production)
- [📖 Multipage Apps](#-multipage-apps)
- [🤖 Transforming HTML](#-transforming-html)
- [🤔 How does it work?](#-how-does-it-work)
- [📝 Documentation](#-documentation)

> 🕑 Click [here](https://github.com/szymmis/vite-express/blob/master/CHANGELOG.md) to see the changelog

## 💬 Introduction <!-- omit in toc -->

With [Vite](https://vitejs.dev/) you can easily bootstrap your project and just start working without figuring everything out. That's great for front-end apps, but when you want to include server-side into the mix, things get quite complicated. Thanks to **vite-express** you can just as easily start writing full-stack app in seconds.

```javascript
import express from "express";
import ViteExpress from "vite-express";

const app = express();

app.get("/message", (_, res) => res.send("Hello from express!"));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
```

You can also bind into the express app, to be able to do things such as specifying custom host address or creating your own server instance (e.g., when you want to use the `https:` protocol).

```js
import express from "express";
import ViteExpress from "vite-express";

const app = express();

const server = app.listen(3000, "0.0.0.0", () =>
  console.log("Server is listening...")
);

ViteExpress.bind(app, server);
```

`⚡ vite-express` takes care of

- injecting necessary middleware to serve **static files** from your express server
- managing unhandled routes to make **client-side routing** possible

The only thing that is left to you is **to code**! 🎉

## 📦 Installation & usage

### Fresh setup with `🏗️ create-vite-express`

The easiest way to setup a **Vite Express** app is to use [`🏗️ create-vite-express`](https://www.npmjs.com/package/create-vite-express) package

 1. Run the CLI from your terminal

    ```bash
    yarn create vite-express
    ```

 2. Follow the prompts to configure your project using your favourite framework.
 3. Open app folder, install dependencies and run the app in development mode

    ```bash
    cd YOUR_APP_NAME
    yarn
    yarn dev
    ```

 4. Open your browser at `http://localhost:3000`
 5. Change the client code and see the beauty of [HMR](https://vitejs.dev/guide/features.html#hot-module-replacement) in action!

Congrats, you've just created your first `vite-express` app! 🎉 Happy hacking!

### Fresh setup with `create-vite`

Alternatively you can use [`create-vite` package](https://vitejs.dev/guide/#scaffolding-your-first-vite-project) to setup the client and then add an express server to it if your favourite framework isn't supported by `create-vite-express`.

 1. Start by creating **Vite** project

    ```bash
    yarn create vite
    ```

 2. Follow the prompts to configure your project using your favourite framework.
 3. Install `express` and `vite-express` packages

    ```bash
    yarn add express vite-express
    ```

 4. Create a server script inside project root directory

    ```javascript
    //e.g server.js
    import express from "express";
    import ViteExpress from "vite-express";

    const app = express();

    app.get("/message", (_, res) => res.send("Hello from express!"));

    ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
    ```

 5. Run the express script

    ```bash
    node server.js
    ```

 6. Open your browser at `http://localhost:3000`
 7. Change the client code and see the beauty of [HMR](https://vitejs.dev/guide/features.html#hot-module-replacement) in action!

Congrats, you've just created your first `vite-express` app! 🎉 Happy hacking!

## 🚚 Shipping to production

By default vite-express runs in **development** mode, when server uses Vite's Dev Server in middleware mode (which means that no separate Vite process is running) utilizing the power of HMR and native browser modules. This is not suitable for production as described [here](https://vitejs.dev/guide/why.html#why-bundle-for-production), so in production we want to serve static files that Vite spits out during it's build process. That's why you need to invoke [`vite build`](https://vitejs.dev/guide/cli.html#build) command first. Then you need to run your app in production mode.

You have these options to achieve that

- Run the code with `NODE_ENV=production` variable, either by inlining it with the command

   ```bash
   NODE_ENV=production node server.ts
   ```

   Or by using [`dotenv`](https://www.npmjs.com/package/dotenv) or other envs tool.

- Use `ViteExpress.config()` and set `mode` to `production`

    ```javascript
   import express from "express";
   import ViteExpress from "vite-express";

   const app = express();
   ViteExpress.config({ mode: "production" })

   app.get("/message", (_, res) => res.send("Hello from express!"));

   ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
    ```

### ⚡ Viteless mode

 `vite-express` will always try to use `Vite` to resolve [`vite.config.*s`][vite-config] file. But in production environment it is very possible that it will not be installed. When `Vite` package cannot be used, `vite-express` falls back to reading the config file as a plain text file, trying to extract [`root`][root], [`base`][base] and [`outDir`][outDir] values. If you don't want to ship `vite.config` to production you can specify custom inline config using [`ViteExpress.config({ inlineViteConfig: ... })`](https://github.com/szymmis/vite-express/tree/feature/running-viteless#configoptions--void). Remember that when using inline config there are two sources of truth, so you need to make sure `vite.config` used by Vite, and inline config used by `vite-express` are synchronized.

 Order of config file resolve process:

1. When `inlineViteConfig` is set to some value it will be used as a configuration object, completely ignoring `vite.config` file.

   ```javascript
   import express from "express";
   import ViteExpress from "vite-express";

   ViteExpress.config({ 
      inlineViteConfig: { 
         base: "/admin", 
         build: { outDir: "out" }
      } 
   });

   ViteExpress.listen(express(), 3000);
   ```

   You can specify any combination of those values, it will be merged with the default values to get resulting configuration object.

   Default config values are:

   - `root = process.cwd()`
   - `base = /`
   - `outDir = dist`

2. When `inlineViteConfig` is not defined, `vite-express` will try to use `Vite` to resolve the config.
3. If the package is not present, `vite.config.*s` file will be loaded as a plain file and config values will be extracted using plain text manipulation methods. That's why `root`, `base` and `outDir` need to be defined as json valid values: strings.
4. If config file cannot be used to extract the values, defaults defined above will be used.

## 📖 Multipage Apps

With Vite you can have multiple HTML entry points as described [here][vite-multipage].
From v0.11.0 this feature is also supported by `vite-express`. Your app will automatically load correct `index.html` file when you navigate to path, just like in Vite.

Suppose you have the following source code structure:

```md
├── package.json
├── vite.config.js
├── index.html
├── main.js
└── nested
    ├── index.html
    ├── nested.js
    └── subroute
        └─ index.html
```

When you navigate to any client-side route `vite-express` tries to find an `index.html` file matching request path as much as it is possible. What is means is that if you go to `/nested/subroute/my/secret/path`, files that `vite-express` will try to render are:

1. `nested/subroute/my/secret/index.html`
2. `nested/subroute/my/index.html`
3. `nested/subroute/index.html`
4. `nested/index.html`
5. `index.html`

In this case `nested/subroute/index.html` would be picked because that file exist, but in another case it would fall back to `nested/index.html`, and in case of another failure to root `index.html`. As soon as `nested/subroute/my/secret/index.html` will exist in the file structure, it can be used for this request.

Why `nested/subroute/my/secret/path/index.html` isn't considered? Because it needs to have a trailing `/`. That's how Vite is doing it.
If you want, you can always use express [redirect][express-redirect] to add this trailing slash at the end.

```js
app.get('^nested/subroute/my/secret/path$', (_, res) => {
   res.redirect("nested/subroute/my/secret/path/")
});
```

⚠️ Please remember that you still have to [configure `Vite`][vite-multipage] so that it will resolve all these files correctly in its build step.

## 🤖 Transforming HTML

You can specify transformer function that takes two arguments - HTML as a string and [`Request`][express-request] object - and returns HTML as a string with any string related transformation applied. It can be used to inject your custom metadata on the server-side. It can also be an async function if you need to retrieve the data to inject from a database or some other remote source. 

This transformer function is invoked right before sending the HTML to the client in the index-serving middleware that `vite-express` injects at the end of the middleware stack.

Imagine a situation in which your index.html file looks like this

```html
<html>
   <head>
      <!-- placeholder -->
   </head>
   <body>
      <div id="root"></div>
   </body>
</html>
```

You can then use custom transformer function to replace the HTML comment with any string you like. It can be a custom meta tag. You can use request object to extract additional information about request such as requested page.

```javascript
import express from "express";
import ViteExpress from "vite-express";
import someMiddleware from "./some/middleware";

const app = express()

function transformer(html: string, req: express.Request) {
   return html.replace(
      "<!-- placeholder -->", 
      `<meta name="custom" content="${req.baseUrl}"/>`
   )
}

app.use(someMiddleware())

ViteExpress.config({ transformer })
ViteExpress.listen(app, 3000);
```

The HTML served to the client will then look something like this

```html
<html>
   <head>
     <meta name="custom" content="/"/>
   </head>
   <body>
      <div id="root"></div>
   </body>
</html>
```

## 🤔 How does it work?

The way `vite-express` works is quite simple. As soon as you invoke `ViteExpress.listen`:

- Static files serving middleware is injected at the end of express middlewares stack, but you can change that by using `ViteExpress.static` middleware to precisely describe at what point do you want to serve static files. This middleware takes care of serving static files from the Vite Dev Server in `development` mode and in `production` mode [`express.static`](https://expressjs.com/en/starter/static-files.html) is used instead.

- A GET routes handler `get("*")` is registered at the end of middleware stack to handle all the routes that were unhandled by you. We do this to ensure that client-side routing is possible.

Because `ViteExpress.listen` is an async function, in most cases it doesn't matter when you invoke it, but it is generally the best to do it at the end of file to avoid `get("*")` handler overriding your routes.

## 📝 Documentation

| `⚡ vite-express` functions                                                                                    |
| ------------------------------------------------------------------------------------------------------------- |
| [`config(options) => void`](#configoptions--void)                                                             |
| [`listen(app, port, callback?) => http.Server`](#listenapp-port-callback--httpserver)                         |
| [`async bind(app, server, callback?) => Promise<void>`](#async-bindapp-server-callback--promisevoid)          |
| [`static(options?: ServeStaticOptions) => RequestHandler`](#staticoptions-servestaticoptions--requesthandler) |
| [`async build() => Promise<void>`](#async-build--promisevoid)                                                 |
| [`async getViteConfig() => Promise<ViteConfig>`](#async-getviteconfig--promiseviteconfig)                     |

---

### `config(options) => void`

Used to pass in configuration object with each key optional.

```js
ViteExpress.config({ /*...*/ });
```

#### 🔧 Available options

| name             | description                                                                                                                                                                                                                                                                                                                                        | default            | valid values                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| mode             | When set to development Vite Dev Server will be utilized, in production app will serve static files built with `vite build` command                                                                                                                                                                                                                | `"development"`    | `"development"` \| `"production"`                                                 |
| transformer      | A function used to transform HTML served to the client, useful when you want to inject some metadata on the server. First argument is the HTML that is about to be sent to the client, second is the [`Request`][express-request] object. Needs to return transformed HTML as a string, or a Promise that resolves to the transformed HTML string. | `undefined`        | `undefined` \| `(html: string, req: Request) => string \| Promise<string>`        |
| ignorePaths      | A regex or function used to determine if matched path/request should be ignored by Vite index.html serving logic. When defined as a function, the request will be ignored when function returns true. Example of usage: Can be used to disable Vite on `/api` paths.                                                                               | `undefined`        | `undefined` \| `RegExp` \| `(path: string, req: Request) => boolean`              |
| viteConfigFile   | The path of the Vite config file. When not specified, it is assumed that the config file is in the current working directory.                                                                                                                                                                                                                      | `undefined`        | `undefined` \| `string`                                                           |
| verbosity        | An enum specifying what serverity of logs `vite-express` produces. Useful when you want to restrict that or silence it completely.                                                                                                                                                                                                                 | `Verbosity.Normal` | `undefined` \| `Verbosity.Silent` \| `Verbosity.ErrorsOnly` \| `Verbosity.Normal` |
| inlineViteConfig | When set to non-undefined value, `vite-express` will be run in [`viteless mode`](#-viteless-mode)                                                                                                                                                                                                                                                  | `undefined`        | `undefined` \| `ViteConfig`                                                       |

```typescript
type ViteConfig = {
   root?: string;
   base?: string;
   build?: { outDir: string };
   server?: { hmr?: boolean | HmrOptions };
}
```

You can read more about `HmrOptions` in Vite [docs](https://vitejs.dev/config/server-options.html#server-hmr).

### `listen(app, port, callback?) => http.Server`

Used to inject necessary middlewares into the app and start listening on defined port. Should replace `app.listen()` in your base express application. Due to its async nature can be invoked at any time but should generally be invoked at the end to avoid interfering with other middlewares and route handlers.

- **`app`** - [express application](https://expressjs.com/en/4x/api.html#express) returned from invoking `express()`
- **`port: number`** - port that server will be listening on
- **`callback?: () => void`** - function that will be invoked after server starts listening

Returns the same [`http.Server`](https://nodejs.org/api/http.html#class-httpserver) that is returned by express when running [`app.listen()`](https://expressjs.com/en/api.html#app.listen)

```js
const app = express();
const httpServer = ViteExpress.listen(app, 3000, () => console.log("Server is listening!"));
```

When HTTP server has been closed using the `close()` method, vite-express also closes the Vite dev server asynchronously. After that, a `vite:close` event is emitted so you can listen to that event to have a guarantee that all server resources were freed.

```js
httpServer.on("vite:close", handleViteClose);
httpServer.close();
```

### `async bind(app, server, callback?) => Promise<void>`

Used to inject necessary middleware into the app, but does not start the listening process. Should be used when you want to create your own `http`/`https` server instance manually e.g. when you use `socket.io` library. Same as `listen`, can be invoked at any time because it is async, but it is advised to invoke it when you already registered all routes and middlewares, so that it can correctly hook into the express app.

- **`app`** - [express application](https://expressjs.com/en/4x/api.html#express) returned from invoking `express()`
- **`server: http.Server | https.Server`** - server instance that is returned when invoking [`http.createServer`](https://nodejs.org/api/http.html#class-httpserver)
- **`callback?: () => void`** - function that will be invoked after Vite dev server is started and vite-express injects all middleware

```js
const app = express();
const server = http.createServer(app).listen(3000, () => {
   console.log("Server is listening!")
});
ViteExpress.bind(app, server);
```

### `static(options?: ServeStaticOptions) => RequestHandler`

Used as a typical express middleware to indicate to `vite-express` the exact moment when you want to register static serving logic. You can use this method to prevent some of your request blocking middleware, such as authentication/authorization, from blocking files coming from your server, which would make displaying for example login page impossible because of blocked html, styles and scripts files.

Another use-case is when you want to override [options][serve-static-options] that `vite-express` passes to [`express.static`](https://expressjs.com/en/starter/static-files.html) middleware in production mode. In development mode it doesn't have any effect.

Example:

```javascript
import express from "express"
import yourAuthMiddleware from "some/path"

const app = express()

app.use(ViteExpress.static({ maxAge: "1d" }))
app.use(yourAuthMiddleware())

app.get("/", ()=> /*...*/ )

ViteExpress.listen(app, 3000,  () => console.log("Server is listening!"))
```

You should use it when the default behaviour of serving static files at the end of middleware chain doesn't work for you because you block requests in some way.

### `async build() => Promise<void>`

Used when you want to build the app to production programically. It is adviced to use `vite build` command, but can be freely used in some edge scenarios (e.g. in some automation scripts) as it does the same thing.

```js
ViteExpress.build();
```

### `async getViteConfig() => Promise<ViteConfig>`

Useful in case you want to know the Vite configuration parameters currently in use. For example, for writing a `console.log` message with some of that information in the listen callback.

Example:

```js
import express from "express";
import ViteExpress from "vite-express";

const app = express();

const port = 3000;
const host = "localhost";

const server = app.listen(port, host);

ViteExpress.bind(app, server, async () => {
  const { root, base } = await ViteExpress.getViteConfig();
  console.log(`Serving app from root ${root}`);
  console.log(`Server is listening at http://${host}:${port}${base}`);
});
```

## ⚖️ License <!-- omit in toc -->

[MIT](LICENSE)

[express-request]: https://expressjs.com/en/api.html#req
[express-redirect]: https://expressjs.com/en/api.html#res.redirect
[vite-config]: https://vitejs.dev/config/
[root]: https://vitejs.dev/config/shared-options.html#root
[base]: https://vitejs.dev/config/shared-options.html#base
[outDir]: https://vitejs.dev/config/build-options.html#build-outdir
[vite-multipage]: https://vitejs.dev/guide/build.html#multi-page-app
[serve-static-options]: https://expressjs.com/en/resources/middleware/serve-static.html#options
