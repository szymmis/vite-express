import { ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import puppeteer, { Browser, Page } from "puppeteer";
import { describe, expect, test } from "vitest";

import { cmd, replaceStringInFile, sleep } from "./libs/utils";
import { TEMPLATES } from "./templates";

const CLI_PATH = path.resolve(__dirname, "../create-vite-express/src/cli.ts");

describe.each(TEMPLATES)(`Template $name`, (template) => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));

  test("install template", async () => {
    return cmd(`tsx ${CLI_PATH}`)
      .cwd(tmpdir)
      .write("test")
      .awaitOutput("Select a framework")
      .write("\u001b[B".repeat(template.index))
      .awaitOutput("Do you use TypeScript?")
      .write(template.ts ? "y" : "n")
      .awaitOutput("Happy hacking!")
      .success()
      .assert();
  });

  test("rewrite vite-express to local dependency", async () => {
    return cmd(`npm install ${path.resolve(__dirname, "..")}`)
      .cwd(path.join(tmpdir, "test"))
      .success()
      .assert();
  });

  test(
    "install dependencies",
    async () => {
      return cmd("npm install")
        .cwd(path.join(tmpdir, "test"))
        .success()
        .assert();
    },
    { timeout: 60000 },
  );

  test.runIf(template.ts && template.typecheck !== false)(
    "check client types",
    async () => {
      return cmd("yarn tsc -p src/client/tsconfig.json --noEmit")
        .cwd(path.join(tmpdir, "test"))
        .success()
        .assert();
    },
  );

  describe("default vite config", () => {
    describe("run app in development mode", () => {
      let server: {
        process: ChildProcessWithoutNullStreams;
        close: () => Promise<void>;
      };
      let browser: Browser;
      let page: Page;

      test("set up", async () => {
        server = await cmd("npm run dev")
          .cwd(path.join(tmpdir, "test"))
          .awaitOutput(["Running in", "development"])
          .awaitOutput("Server is listening on port 3000...")
          .run();

        const output = await puppeteer
          .launch({ headless: "new" })
          .then(async (browser) => {
            const page = await browser.newPage();
            await page.goto(`http://localhost:3000`);
            return { browser, page };
          });

        browser = output.browser;
        page = output.page;
      });

      test("automatic page reload works", async () => {
        await page.waitForSelector("button");

        let button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");

        await button?.click();
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 1");

        replaceStringInFile(
          path.join(tmpdir, "test", "index.html"),
          /<title>(.+)<\/title>/,
          "<title>Test - $1</title>",
        );

        await sleep(200);

        button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");
      });

      test.runIf(template.hmrTestFilePath)("hot reload works", async () => {
        const filePath = path.join(tmpdir, "test", template.hmrTestFilePath!);

        const button = await page.$("button");
        await button?.click();
        await button?.click();

        replaceStringInFile(filePath, "count is", "button count is");
        await sleep(200);
        expect(await button?.evaluate((b) => b.innerHTML)).toBe(
          "button count is 2",
        );

        replaceStringInFile(filePath, "button count is", "count is");
        await sleep(200);
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 2");
      });

      test("clean up", async () => {
        await browser.close();
        await server.close();
      });
    });

    test("build app", async () => {
      return cmd("npm run build")
        .cwd(path.join(tmpdir, "test"))
        .success()
        .stdoutMatches("built in")
        .assert();
    });

    describe("run app in production mode", () => {
      let server: {
        process: ChildProcessWithoutNullStreams;
        close: () => Promise<void>;
      };
      let browser: Browser;
      let page: Page;

      test("set up", async () => {
        server = await cmd("npm run start")
          .cwd(path.join(tmpdir, "test"))
          .awaitOutput(["Running in", "production"])
          .awaitOutput([
            `Serving static files from`,
            path.join(tmpdir, "test", "dist"),
          ])
          .awaitOutput("Server is listening on port 3000...")
          .run();

        const output = await puppeteer
          .launch({ headless: "new" })
          .then(async (browser) => {
            const page = await browser.newPage();
            await page.goto(`http://localhost:3000`);
            return { browser, page };
          });

        browser = output.browser;
        page = output.page;
      });

      test("can visit page", async () => {
        await page.waitForSelector("button");

        const button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");

        await button?.click();
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 1");
      });

      test("clean up", async () => {
        await browser.close();
        await server.close();
      });
    });
  });

  describe("custom vite config path", () => {
    describe("run app in development mode", () => {
      let server: {
        process: ChildProcessWithoutNullStreams;
        close: () => Promise<void>;
      };
      let browser: Browser;
      let page: Page;

      test("modify config files", async () => {
        const viteConfigPath = path.join(
          tmpdir,
          "test",
          template.ts ? "vite.config.ts" : "vite.config.js",
        );

        if (fs.existsSync(viteConfigPath)) {
          fs.copyFileSync(
            viteConfigPath,
            path.join(tmpdir, "test", "custom.config.js"),
          );

          replaceStringInFile(
            path.join(tmpdir, "test", "custom.config.js"),
            "plugins:",
            "base: '/test', plugins:",
          );
        } else {
          fs.writeFileSync(
            path.join(tmpdir, "test", "custom.config.js"),
            `
            import { defineConfig } from "vite";

            export default defineConfig({
              base: '/test',
            });

            `,
            "utf8",
          );
        }

        replaceStringInFile(
          path.join(
            tmpdir,
            "test",
            "src/server",
            template.ts ? "main.ts" : "main.js",
          ),
          null,
          `
          import express from "express";
          import ViteExpress from "vite-express";

          const app = express();

          ViteExpress.config({ viteConfigFile: "custom.config.js" })

          ViteExpress.listen(app, 3000, () =>
            console.log("Server is listening on port 3000..."),
          );
          `,
        );
      });

      test("set up", async () => {
        server = await cmd("npm run dev")
          .cwd(path.join(tmpdir, "test"))
          .awaitOutput(["Running in", "development"])
          .awaitOutput("Server is listening on port 3000...")
          .run();

        const output = await puppeteer
          .launch({ headless: "new" })
          .then(async (browser) => {
            const page = await browser.newPage();
            await page.goto(`http://localhost:3000`);
            return { browser, page };
          });

        browser = output.browser;
        page = output.page;
      });

      test("cannot visit '/'", async () => {
        expect(await page.content()).toMatch("Cannot GET /");
      });

      test("can visit '/test'", async () => {
        page = await browser.newPage();
        await page.goto("http://localhost:3000/test");
        expect(await page.content()).not.toMatch("Cannot GET /test");
      });

      test("automatic page reload works", async () => {
        await page.waitForSelector("button");

        let button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");

        await button?.click();
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 1");

        replaceStringInFile(
          path.join(tmpdir, "test", "index.html"),
          /<title>(.+)<\/title>/,
          "<title>Test - $1</title>",
        );

        await sleep(200);

        button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");
      });

      test.runIf(template.hmrTestFilePath)("hot reload works", async () => {
        const filePath = path.join(tmpdir, "test", template.hmrTestFilePath!);

        const button = await page.$("button");
        await button?.click();
        await button?.click();

        replaceStringInFile(filePath, "count is", "button count is");
        await sleep(200);
        expect(await button?.evaluate((b) => b.innerHTML)).toBe(
          "button count is 2",
        );

        replaceStringInFile(filePath, "button count is", "count is");
        await sleep(200);
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 2");
      });

      test("clean up", async () => {
        await browser.close();
        await server.close();
      });
    });

    test("build app", async () => {
      return cmd(`npm run build -- -c custom.config.js`)
        .cwd(path.join(tmpdir, "test"))
        .success()
        .stdoutMatches("built in")
        .assert();
    });

    describe("run app in production mode", () => {
      let server: {
        process: ChildProcessWithoutNullStreams;
        close: () => Promise<void>;
      };
      let browser: Browser;
      let page: Page;

      test("set up", async () => {
        server = await cmd("npm run start")
          .cwd(path.join(tmpdir, "test"))
          .awaitOutput(["Running in", "production"])
          .awaitOutput([
            `Serving static files from`,
            path.join(tmpdir, "test", "dist"),
          ])
          .awaitOutput("Server is listening on port 3000...")
          .run();

        const output = await puppeteer
          .launch({ headless: "new" })
          .then(async (browser) => {
            const page = await browser.newPage();
            await page.goto(`http://localhost:3000`);
            return { browser, page };
          });

        browser = output.browser;
        page = output.page;
      });

      test("cannot visit '/'", async () => {
        expect(await page.content()).toMatch("Cannot GET /");
      });

      test("can visit page '/test'", async () => {
        page = await browser.newPage();
        await page.goto("http://localhost:3000/test/");

        await page.waitForSelector("button");

        const button = await page.$("button");
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 0");

        await button?.click();
        expect(await button?.evaluate((b) => b.innerHTML)).toBe("count is 1");
      });

      test("clean up", async () => {
        await browser.close();
        await server.close();
      });
    });
  });
});
