import { ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import puppeteer, { Page } from "puppeteer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cmd } from "./libs/utils";

describe.each([{ env: "production" }, { env: "development" }])(
  "$env multiple entry points",
  ({ env }) => {
    // we can't run on 3000 like the other tests because vitest executes this at the same time as the other
    const PORT = 3001;
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));
    let server: {
      process: ChildProcessWithoutNullStreams;
      close: () => Promise<void>;
    };
    let page: Page;

    beforeAll(async () => {
      await cmd(`npm init -y`).cwd(tmpdir).success().assert();
      const packageJson = fs.readFileSync(tmpdir + "/package.json");
      const packageJsonObj = JSON.parse(packageJson.toString());
      (packageJsonObj as { type: string }).type = "module";
      (packageJsonObj as { scripts: Record<string, string> }).scripts = {
        start: `NODE_ENV=${env} node index.js`,
        build: "vite build",
      };
      fs.writeFileSync(
        tmpdir + "/package.json",
        JSON.stringify(packageJsonObj),
      );

      await cmd(`npm install ${path.resolve(__dirname, "..")}`)
        .cwd(tmpdir)
        .success()
        .assert();
      await cmd(`npm install express`).cwd(tmpdir).success().assert();
      await cmd(`npm install vite`).cwd(tmpdir).success().assert();

      const viteConfig = `
          import { defineConfig } from "vite";
          import { resolve } from "path";
  
          export default defineConfig({
            build: {
              rollupOptions: {
                input: {
                  index: resolve(__dirname, "index.html"),
                  file: resolve(__dirname, "file.html"),
                  dir: resolve(__dirname, "dir/index.html"),
                },
              },
            },
          });
          `;
      fs.writeFileSync(tmpdir + "/vite.config.ts", viteConfig);

      fs.writeFileSync(tmpdir + "/index.html", "Index");
      fs.writeFileSync(tmpdir + "/file.html", "File");
      fs.mkdirSync(tmpdir + "/dir");
      fs.writeFileSync(tmpdir + "/dir/index.html", "Dir");

      const indexJs = `
          import express from "express";
          import ViteExpress from "vite-express";
          
          const app = express();
          ViteExpress.listen(app, ${PORT}, () =>
            console.log("Server is listening on port ${PORT}..."),
          );
      `;
      fs.writeFileSync(tmpdir + "/index.js", indexJs);
      if (env === "production") {
        await cmd("npm run build").cwd(tmpdir).success().assert();
      }
      server = await cmd("npm run start")
        .cwd(tmpdir)
        .awaitOutput(["Running in", env])
        .awaitOutput(`Server is listening on port ${PORT}...`)
        .run();

      const output = await puppeteer
        .launch({ headless: true })
        .then(async (browser) => {
          const page = await browser.newPage();
          await page.goto(`http://localhost:${PORT}`);
          return { browser, page };
        });

      page = output.page;
    });
    afterAll(() => {
      server.close();
    });

    async function getRouteContent(path: string) {
      await page.goto(`http://localhost:${PORT}${path}`);
      return await page.$eval("body", (el) => el.textContent);
    }

    it("routes /dir/index.html to dir/index.html", async () => {
      const content = await getRouteContent("/dir/index.html");
      expect(content).toBe("Dir");
    });
    it("routes /dir to index.html (route not found, fallback to index.html)", async () => {
      const content = await getRouteContent("/dir");
      expect(content).toBe("Index");
    });
    it("routes /dir/ to dir/index.html", async () => {
      const content = await getRouteContent("/dir/");
      expect(content).toBe("Dir");
    });

    it("routes /file.html to file.html", async () => {
      const content = await getRouteContent("/file.html");
      expect(content).toBe("File");
    });
    it("routes /file to file.html", async () => {
      const content = await getRouteContent("/file");
      expect(content).toBe("File");
    });
    it("routes /file/ to index.html (route not found, fallback to index.html)", async () => {
      const content = await getRouteContent("/file/");
      expect(content).toBe("Index");
    });

    it("routes / to index.html", async () => {
      const content = await getRouteContent("/");
      expect(content).toBe("Index");
    });
    it("routes /index.html to index.html", async () => {
      const content = await getRouteContent("/index.html");
      expect(content).toBe("Index");
    });
  },
);
