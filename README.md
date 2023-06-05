# ⚡ Vite + Express

> [@vitejs](https://github.com/vitejs/vite) integration module for [@expressjs](https://github.com/expressjs/express)

[![npm](https://img.shields.io/npm/v/vite-express)](https://www.npmjs.org/package/vite-express)
[![downloads-per-week](https://img.shields.io/npm/dt/vite-express?color=success)](https://www.npmjs.org/package/vite-express)
[![bundle-size](https://img.shields.io/bundlephobia/minzip/vite-express)](https://www.npmjs.org/package/vite-express)
[![license](https://img.shields.io/npm/l/vite-express?color=purple)](https://www.npmjs.org/package/vite-express)

- [📦 Installation \& usage](#-installation--usage)
- [🚚 Shipping to production](#-shipping-to-production)
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

    ⚠️ For some frameworks like **React**, **Vite** sets the `package.json` `type` field to `module` so you need to use ESModules `import` syntax despite writing a node script. If that's a problem you can freely change the `type` back to `commonjs` as Vite uses `ESModules` for front-end either way!

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

 `vite-express` uses Vite even in production to resolve [`vite.config.js`][vite-config] correctly. If you want to be able to run your production app without Vite and all development dependencies, you need to specify custom inline config using `ViteExpress.config({ inlineViteConfig: ... })`.

Valid configuration values used by `vite-express` are [`root`][root], [`base`][base] and [`outDir`][outDir].

- When `inlineViteConfig` is set to `undefined` (by default) Vite is used in production to resolve config file
- To use viteless mode with the defaults you can set `inlineViteConfig` as `{}`

   ```javascript
   import express from "express";
   import ViteExpress from "vite-express";

   ViteExpress.config({ inlineViteConfig: {} })
   ViteExpress.listen(express(), 3000);
   ```

- You can also specify any combination of valid parameters

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

Be aware that in viteless mode you have two separate sources of truth - `vite.config.js` and your inline configuration, so you need to manually keep them in sync.

Most of the time you are okay with using Vite in production as it's easier, this approach is only recommended if you want to reduce production dependencies.

## 🤖 Transforming HTML

You can specify transformer function that takes two arguments - HTML as a string and [`Request`][express-request] object - and returns HTML as a string with any string related transformation applied. It can be used to inject your custom metadata on the server-side.

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

| `⚡ vite-express` functions                                                                           |
| ---------------------------------------------------------------------------------------------------- |
| [`config(options) => void`](#configoptions--void)                                                    |
| [`listen(app, port, callback?) => http.Server`](#listenapp-port-callback--httpserver)                |
| [`async bind(app, server, callback?) => Promise<void>`](#async-bindapp-server-callback--promisevoid) |
| [`static() => RequestHandler`](#static--requesthandler)                                              |
| [`async build() => Promise<void>`](#async-build--promisevoid)                                        |

---

### `config(options) => void`

Used to pass in configuration object with each key optional.

```js
ViteExpress.config({ /*...*/ });
```

#### 🔧 Available options

<<<<<<< HEAD
| name             | description                                                                                                                                                                                                                                                                             | default         | valid values                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------- |
| mode             | When set to development Vite Dev Server will be utilized, in production app will serve static files built with `vite build` command                                                                                                                                                     | `"development"` | `"development"` \| `"production"`                       |
| transformer      | A function used to transform HTML served to the client, useful when you want to inject some metadata on the server. First argument is the HTML that is about to be sent to the client, second is the [`Request`][express-request] object. Needs to return transformed HTML as a string. | `undefined`     | `undefined` \| `(html: string, req: Request) => string` |
| inlineViteConfig | When set to non-undefined value, `vite-express` will be run in [`viteless mode`](#-viteless-mode)                                                                                                                                                                                       | `undefined`     | `undefined` \| `ViteConfig`                             |

```typescript
type ViteConfig = {
   root?: string;
   base?: string;
   build?: { outDir: string };
}
```

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

### `static() => RequestHandler`

Used as a typical express middleware to indicate to `vite-express` the exact moment when you want to register static serving logic. You can use this method to prevent some of your request blocking middleware, such as authentication/authorization, from blocking files coming from your server, which would make displaying for example login page impossible because of blocked html, styles and scripts files.

Example:

```javascript
import express from "express"
import yourAuthMiddleware from "some/path"

const app = express()

app.use(ViteExpress.static())
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

## ⚖️ License <!-- omit in toc -->

[MIT](LICENSE)

[express-request]: https://expressjs.com/en/api.html#req
[vite-config]: https://vitejs.dev/config/
[root]: https://vitejs.dev/config/shared-options.html#root
[base]: https://vitejs.dev/config/shared-options.html#base
[outDir]: https://vitejs.dev/config/build-options.html#build-outdir
