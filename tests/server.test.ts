import express from "express";
import http from "http";
import { AddressInfo } from "net";
import path from "path";
import * as SocketIO from "socket.io";
import { io as SocketIOClient } from "socket.io-client";
import request from "supertest";
import { beforeAll, describe, expect, test } from "vitest";

import ViteExpress from "../src/main";

describe("Basic app", () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    app.get("/hello", (req, res) => {
      res.send("Hello Vite Express!");
    });

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("get api routes work", async () => {
    await request(app).get("/hello").expect(200, "Hello Vite Express!");
  });

  test("html is served correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/index.html");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/main.html");
    expect(response.text).toMatch(/<h1>main<\/h1>/);
  });

  test("subpath html is served correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });
});

describe("Basic app with explicit static middleware", () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    app.use((_, res, next) => {
      res.header("before", "1");
      next();
    });
    app.use(ViteExpress.static());
    app.use((_, res, next) => {
      res.header("after", "1");
      next();
    });
    app.get("/hello", (req, res) => {
      res.send("Hello Vite Express!");
    });

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("get api routes work", async () => {
    await request(app).get("/hello").expect(200, "Hello Vite Express!");
  });

  test("html is served correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
  });

  test("subpath html is served correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);

    expect(response.headers.before).toBe("1");
    expect(response.headers.after).toBe("1");
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });

  test("static files middleware respects invocation order", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.headers.before).toBe("1");
    expect(response.headers.after).toBe(undefined);
  });
});

describe("App with custom http server", () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    const server = http.createServer(app).listen(0);

    app.get("/hello", (_, res) => {
      res.send("Hello Vite Express!");
    });

    await new Promise<void>((done) => {
      ViteExpress.bind(app, server, async () => done());
    });
  });

  test("get api routes work", async () => {
    await request(app).get("/hello").expect(200, "Hello Vite Express!");
  });

  test("html is served correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
  });

  test("subpath html is served correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });
});

describe("App with socket.io", () => {
  const app = express();
  const server = http.createServer(app).listen(0);

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    const serverSocket = new SocketIO.Server(server);

    serverSocket.on("connection", (socket) => {
      socket.on("message", () => {
        socket.emit("response", "Hello from socket.io");
      });
    });

    await new Promise<void>((done) => {
      ViteExpress.bind(app, server, async () => done());
    });
  });

  test("emits and receives events", async () => {
    const client = SocketIOClient(
      `http://localhost:${(server.address() as AddressInfo).port}`,
    );

    const response = await new Promise<string>((done) => {
      client.on("connect", () => {
        client.emit("message");
        client.on("response", (response) => {
          done(response);
        });
      });
    });

    expect(response).toBe("Hello from socket.io");
  });
});

describe("App with transformer function", () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    ViteExpress.config({
      transformer: (html) =>
        html.replace("<head>", '<head><meta name="test"/>'),
    });

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("html is transformed correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);

    expect(response.text).toMatch(/<meta name="test"\/>/);
  });

  test("subpath html is transformed correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);

    expect(response.text).toMatch(/<meta name="test"\/>/);
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });
});

describe("App with async transformer function", () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    ViteExpress.config({
      transformer: async (html) =>
        html.replace("<head>", '<head><meta name="test"/>'),
    });

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("html is transformed correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    expect(response.text).toMatch(/<meta name="test"\/>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    expect(response.text).toMatch(/<meta name="test"\/>/);
    response = await request(app).get("/index.html");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    expect(response.text).toMatch(/<meta name="test"\/>/);
    response = await request(app).get("/main.html");
    expect(response.text).toMatch(/<h1>main<\/h1>/);
    expect(response.text).toMatch(/<meta name="test"\/>/);
  });

  test("subpath html is transformed correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);

    expect(response.text).toMatch(/<meta name="test"\/>/);
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });
});

describe("App with ignored paths", async () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/basic"));

    ViteExpress.config({
      ignorePaths: /ignored/,
    });

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("html is served correctly", async () => {
    let response = await request(app).get("/").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/route").expect(200);
    expect(response.text).toMatch(/<h1>index<\/h1>/);
  });

  test("subpath html is served correctly", async () => {
    let response = await request(app).get("/subpath/");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
    response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("fallback to closest index towards root", async () => {
    let response = await request(app).get("/some/path/route");
    expect(response.text).toMatch(/<h1>index<\/h1>/);
    response = await request(app).get("/subpath/to/some/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });

  test("regex ignore is respected", async () => {
    const response = await request(app).get("/ignored");
    expect(response.text).toMatch(/Cannot GET \/ignored/);
  });

  test("function ignore is respected", async () => {
    ViteExpress.config({ ignorePaths: (path) => path === "/fnignored" });

    let response = await request(app).get("/fnignored");
    expect(response.text).toMatch(/Cannot GET \/fnignored/);
    response = await request(app).get("/ignored");
    expect(response.text).toMatch(/index/);
  });

  test("static files are served correctly", async () => {
    const response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");
  });
});

describe("App with no index at root", async () => {
  const app = express();

  beforeAll(async () => {
    process.chdir(path.join(__dirname, "envs/indexless"));

    await new Promise<void>((done) => {
      ViteExpress.listen(app, 0, async () => done());
    });
  });

  test("fallback with next middleware if no index found", async () => {
    let response = await request(app).get("/");
    expect(response.status).toBe(404);
    response = await request(app).get("/route");
    expect(response.status).toBe(404);
    response = await request(app).get("/some/path/route");
    expect(response.status).toBe(404);
  });

  test("html is served correctly", async () => {
    const response = await request(app).get("/subpath/route");
    expect(response.text).toMatch(/<h1>subpath<\/h1>/);
  });
});
