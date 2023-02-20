import express from "express";
import request from "supertest";

import ViteExpress from "../src/main";
import { expect, it, test } from "./runner";

const baseDir = process.cwd();

test("Express app", async (done) => {
  process.chdir(__dirname);

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
    expect(response.text).toMatch(/Found. Redirecting to/);

    it("redirects to vite on static file request");

    server.close(() => {
      process.chdir(baseDir);
      done();
    });
  });

  app.get("/api", (_, res) => {
    res.send("Response from API!");
  });
});
