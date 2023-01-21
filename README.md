# ⚡ Vite + Express

> [@vitejs](https://github.com/vitejs/vite) integration module for [@expressjs](https://github.com/expressjs/express)

[![bundle-size](https://img.shields.io/bundlephobia/minzip/vite-express)](https://www.npmjs.org/package/vite-express)
[![downloads-per-week](https://img.shields.io/npm/dt/vite-express?color=red)](https://www.npmjs.org/package/vite-express)
[![license](https://img.shields.io/npm/l/vite-express?color=purple)](https://www.npmjs.org/package/vite-express)

- [📦 Installation \& usage](#-installation--usage)
- [🚚 Shipping to production](#-shipping-to-production)
- [🤔 How does it work?](#-how-does-it-work)
- [📝 Documentation](#-documentation)

## 💬 Introduction <!-- omit in toc -->

With [Vite](https://vitejs.dev/) you can easily bootstrap your project and just start working without figuring everything out. That's great for front-end apps, but when you want to include server-side into the mix, things get quite complicated. Thanks to **vite-express** you can just as easily start writing full-stack app in seconds.

```javascript
const express = require("express");
const ViteExpress = require("vite-express");

const app = express();

app.get("/message", (_, res) => res.send("Hello from express!"));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
```

`⚡ vite-express` takes care of

- spinning up **Vite's Dev Server**
- injecting necessary middlewares to **static files** from your API
- managing unhandled routes to make **client-side routing** possible

The only thing that is left to you is **to code**! 🎉

## 📦 Installation & usage

> You can see more examples [here](examples)

The easiest way to setup a basic **Vite Express** app is to use [`create-vite` package](https://vitejs.dev/guide/#scaffolding-your-first-vite-project) to setup the client and then add an express server to it.

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

By default vite-express is in **development** mode, when server acts as a simple proxy between client and Vite's Dev Server utilizing the power of HMR and native browser modules. This is not suitable for production as described [here](https://vitejs.dev/guide/why.html#why-bundle-for-production), so in production we want to serve static files that Vite spits out during it's build process. That's why you need to invoke [`vite build`](https://vitejs.dev/guide/cli.html#build) command first. Then you need to run your app in production mode.

You have these options to do this

- Run the code with `NODE_ENV=production` variable, either by inlining it with the command

   ```bash
   NODE_ENV=production node server.ts
   ```

   Or by using [`dotenv`](https://www.npmjs.com/package/dotenv) or other envs tool.

- Use `ViteExpress.config()` having `mode` set as `production`

    ```javascript
   import express from "express";
   import ViteExpress from "vite-express";

   const app = express();
   ViteExpress.config({ mode: "production" })

   app.get("/message", (_, res) => res.send("Hello from express!"));

   ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
    ```

## 🤔 How does it work?

The way `vite-express` works is quite simple. As soon as you invoke `ViteExpress.listen`:

- Static files serving middleware is injected at the beginning of express middlewares stack. We do this to ensure that nothing will block your server from sending files like `.js`, `.css` etc. You can thing about this middleware as the same as [`express.static`](https://expressjs.com/en/starter/static-files.html) but for files served by Vite. In production files are not served from Vite but instead from dist folder using said `express.static` middleware

- A GET routes handler `get("*")` is registered at the end of middleware stack to handle all the routes that were unhandled by you. We do this to ensure that client-side routing is possible.

- Lastly **Vite Dev Server** is started up, listening on port **5173** or the one that you pass into configuration.

Because `ViteExpress.listen` is an async function, in most cases it doesn't matter when you invoke it, but it is generally the best to do it at the end of file to avoid `get("*")` handler overriting your routes.

## 📝 Documentation

| `⚡ vite-express` functions                                                           |
| ------------------------------------------------------------------------------------ |
| [`config(options) => void`](#configoptions--void)                                    |
| [`async listen(app, port, callback?) => void`](#async-listenapp-port-callback--void) |
| [`async build() => void`](#async-build--void)                                        |

---

### `config(options) => void`

Used to pass in configuration object with each key optional.

```js
ViteExpress.config({ /*...*/ });
```

#### 🔧 Available options

| name     | description                                                                                                                         | default       | valid values                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------- |
| mode     | When set to development Vite Dev Server will be utilized, in production app will serve static files built with `vite build` command | `development` | `development`, `production` |
| vitePort | Port that Vite Dev Server will be listening on                                                                                      | `5173`        | any number                  |

---

### `async listen(app, port, callback?) => void`

Used to inject necessary middlewares into the app and start listening on defined port. Should replace `app.listen()` in your base express application. Due to its async nature can be invoked at any time but should generally be invoked at the end to avoid interfering with other middlewares and route handlers.

- **`app`** - [express application](https://expressjs.com/en/4x/api.html#express) returned from invoking `express()`
- **`port: number`** - port that server will be listening on
- **`callback?: () => void`** - function that will be invoked after server starts listening

```js
const app = express();
ViteExpress.listen(app, 3000, () => console.log("Server is listening!"));
```

---

### `async build() => void`

Used when you want to build the app to production programically. It is adviced to use `vite build` command, but can be freely used in some edge scenarios (e.g. in some automation scripts) as it does the same thing.

```js
ViteExpress.build();
```

## ⚖️ License <!-- omit in toc -->

[MIT](LICENSE)
