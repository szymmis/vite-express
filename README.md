# ⚡ Vite + Express
> @vitejs integration module for @expressjs

[![bundle-size](https://img.shields.io/bundlephobia/minzip/vite-express)](https://www.npmjs.org/package/vite-express)
[![downloads-per-week](https://img.shields.io/npm/dt/vite-express?color=red)](https://www.npmjs.org/package/vite-express)
[![license](https://img.shields.io/npm/l/vite-express?color=purple)](https://www.npmjs.org/package/vite-express)

- [💬 Introduction](#-introduction)
- [🤔 How does it work?](#-how-does-it-work)
- [📦🔧 Installation \& usage](#-installation--usage)
- [📝 Documentation](#-documentation)
- [🏦 License](#-license)

## 💬 Introduction

The best thing about `Vite` is how easy it is to configure and start writing your app. That is also a main goal of `vite-express` - to have a minimal configuration needed because it is coding and not configuring what developers should spend their time on.

Just look how easy it is to serve `Vite` from your `express` app:

```javascript
const express = require("express");
const ViteExpress = require("vite-express");

const app = express();

app.get("/message", (_, res) => res.send("Hello from express!"));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
```

`⚡ vite-express` takes care of 
- starting up **Vite's dev server**
- registering necessary middlewares to serve **static files** from your API
- manage unhandled routes to make **client-side routing** possible

The only thing that is left to you is **to code**! 🎉 

## 🤔 How does it work?

The way it works is very simple, thanks to [**Vite's** wonderfully simple API](https://vitejs.dev/guide/api-javascript.html).
 - First we need you register middlewares which will make our server act like a proxy that will forward our static files related traffic to **Vite dev server**
 - We also need to register a get route handler that will catch all un-handled routes from your app. We do this to make client-side routing possible. The way it works inside **vite-express** is that there is a `get("/*")` route. That is why `ViteExpress.listen()` needs to be called after your last `get` route. Otherwise it will be handled by **vite-express** and not your API.
 - Lastly we start up **Vite dev server** that listens on port **5173** and for now ⚠️ this can't be changed ⚠️ due to the way internals works.  It will be hopefully resolved soon.
 - All the necesary configuration is taken from **Vite** config file, so you don't need to worry about additional configs. 
The fact that you need to start-up `vite-express` so late in your app might cause trouble when you have some kind of *auth* middleware. Because the *static files* middleware is registered when you invoke `ViteExpress.listen()`, it could be blocked by auth. That's why there is a `ViteExpress.static()` method exposed that let's you manually register a middleware to serve the *static files*.

***Example***
```javascript
const express = require("express");
const ViteExpress = require("vite-express");

const app = express();

ViteExpress.static(app);
app.use(authMiddleware());

app.get("/message", (_, res) => res.send("Hello from express!"));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
```
That way static files requests shouldn't be blocked by your auth middleware.

## 📦🔧 Installation & usage

The easiest way to setup a basic **Vite Express** app is to use [`create-vite` package](https://vitejs.dev/guide/#scaffolding-your-first-vite-project) to setup the front-end and then add an express server to it.

- Start by creating **Vite** project
```bash
$ yarn create vite
```
 - Follow the prompts to configure your project using your favourite framework.
 - Install `express` and `vite-express` packages 
```bash
$ yarn add express vite-express
```
 - Create a server script inside project root directory
```javascript
//e.g server.js
import express from "express";
import ViteExpress from "vite-express";

const app = express();

app.get("/message", (_, res) => res.send("Hello from express!"));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
```
 ⚠️ For some frameworks like **React**, **Vite** sets the `package.json` `type` field to `module` so you need to use ESModules `import` syntax despite writing a node script. If that's a problem you can freely change the `type` back to `commonjs` as Vite uses `ESModules` for front-end either way!
 - Run the express script
```bash
$ node server.js
```
 - Open your browser at `http://localhost:3000`
 - Change the client code and see the beauty of [HMR](https://vitejs.dev/guide/features.html#hot-module-replacement) in action!
 - Congrats, you've just created your first `vite-express` app! 🎉 
 - Happy hacking!
## 📝 Documentation

**🚧 Work in progress 🚧**

## 🏦 License

[MIT](LICENSE)
