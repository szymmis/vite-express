import express from "express";
import http from "http";
import path from "path";
import SocketIO from "socket.io";
import { io as SocketIOClient } from "socket.io-client";
import request from "supertest";

import ViteExpress from "../src/main";
import { expect, it, run, test } from "./lib/runner";

const baseDir = process.cwd();

test("Express app", async (done) => {
  process.chdir(path.join(__dirname, "env"));

  const app = express();

  app.get("/hello", (_, res) => {
    res.send("Hello Vite Express!");
  });

  const server = ViteExpress.listen(app, 3000, async () => {
    let response = await request(app).get("/hello");
    expect(response.text).toBe("Hello Vite Express!");

    response = await request(app).get("/api");
    expect(response.text).toBe("Response from API!");

    it("get api routes work");

    response = await request(app).get("/");
    expect(response.text).toMatch(/<body>/);
    response = await request(app).get("/route");
    expect(response.text).toMatch(/<body>/);

    it("html is served correctly");

    response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");

    it("static files are served correctly");

    server.close(() => {
      process.chdir(baseDir);
      done();
    });
  });

  app.get("/api", (_, res) => {
    res.send("Response from API!");
  });
});

test("Express app with explicit static middleware", async (done) => {
  process.chdir(path.join(__dirname, "env"));

  const app = express();

  app.use((_, res, next) => {
    res.header("before", "1");
    next();
  });
  app.use(ViteExpress.static());
  app.use((_, res, next) => {
    res.header("after", "1");
    next();
  });

  app.get("/hello", (_, res) => {
    res.send("Hello Vite Express!");
  });

  const server = ViteExpress.listen(app, 3000, async () => {
    let response = await request(app).get("/hello");
    expect(response.text).toBe("Hello Vite Express!");

    response = await request(app).get("/api");
    expect(response.text).toBe("Response from API!");

    it("get api routes work");

    response = await request(app).get("/");
    expect(response.text).toMatch(/<body>/);
    response = await request(app).get("/route");
    expect(response.text).toMatch(/<body>/);

    it("html is served correctly");

    expect(response.headers.before).toBe("1");
    expect(response.headers.after).toBe("1");

    response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");

    it("static files are served correctly");

    expect(response.headers.before).toBe("1");
    expect(response.headers.after).toBe(undefined);

    it("static files middleware respects invocation order");

    server.close(() => {
      process.chdir(baseDir);
      done();
    });
  });

  app.get("/api", (_, res) => {
    res.send("Response from API!");
  });
});

test("Express app with custom http server", async (done) => {
  process.chdir(path.join(__dirname, "env"));

  const app = express();
  const server = http.createServer(app).listen(3000);

  app.get("/hello", (_, res) => {
    res.send("Hello Vite Express!");
  });

  ViteExpress.bind(app, server, async () => {
    let response = await request(app).get("/hello");
    expect(response.text).toBe("Hello Vite Express!");

    response = await request(app).get("/api");
    expect(response.text).toBe("Response from API!");

    it("get api routes work");

    response = await request(app).get("/");
    expect(response.text).toMatch(/<body>/);
    response = await request(app).get("/route");
    expect(response.text).toMatch(/<body>/);

    it("html is served correctly");

    response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");

    it("static files are served correctly");

    server.close(() => {
      process.chdir(baseDir);
      done();
    });
  });

  app.get("/api", (_, res) => {
    res.send("Response from API!");
  });
});

test("Express app with socket.io", async (done) => {
  process.chdir(path.join(__dirname, "env"));

  const app = express();
  const server = http.createServer(app).listen(3000);

  const serverSocket = new SocketIO.Server(server);

  serverSocket.on("connection", (socket) => {
    socket.on("message", () => {
      socket.emit("response", "Hello from socket.io");
    });
  });

  it("Creates socket.io server");

  ViteExpress.bind(app, server, async () => {
    const client = SocketIOClient("http://localhost:3000");

    client.on("connect", () => {
      client.emit("message");
      client.on("response", (response: unknown) => {
        expect(response).toBe("Hello from socket.io");

        it("Emits and receives events");

        serverSocket.close();
        server.close(() => {
          process.chdir(baseDir);
          done();
        });
      });
    });
  });
});

test("Express app with transformer function", async (done) => {
  process.chdir(path.join(__dirname, "env"));

  const app = express();

  ViteExpress.config({
    transformer: (html) => html.replace("<head>", '<head><meta name="test"/>'),
  });

  const server = ViteExpress.listen(app, 3000, async () => {
    let response = await request(app).get("/");
    expect(response.text).toMatch(/<body>/);
    response = await request(app).get("/route");
    expect(response.text).toMatch(/<body>/);

    it("html is served correctly");

    expect(response.text).toMatch(/<meta name="test"\/>/);

    it("html is transformed correctly");

    response = await request(app).get("/test.txt");
    expect(response.text).toBe("Hello from test.txt");

    it("static files are served correctly");

    server.close(() => {
      process.chdir(baseDir);
      done();
    });
  });
});

run();
