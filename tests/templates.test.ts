import express from "express";
import fs from "fs";
import puppeteer from "puppeteer";

import ViteExpress from "../src/main";
import { expect, it, run, test } from "./lib/runner";
import {
  getButton,
  getButtonText,
  installYarn,
  replaceStringInFile,
  wait,
} from "./lib/utils";

const baseDir = process.cwd();
const templates = fs.readdirSync("create-vite-express/templates");

const templatesHotReloadTestFileMap: Record<string, string> = {
  react: "./src/client/App.jsx",
  "react-ts": "./src/client/App.tsx",
  vue: "./src/client/components/HelloWorld.vue",
  "vue-ts": "./src/client/components/HelloWorld.vue",
};

for (const template of templates) {
  test(`Template "${template}"`, async (done) => {
    process.chdir(`create-vite-express/templates/${template}`);
    await installYarn();

    ViteExpress.config({ inlineViteConfig: undefined });
    await ViteExpress.build();

    await testCase(template, done);
  });

  test(`Template "${template}" with default inline config`, async (done) => {
    process.chdir(`create-vite-express/templates/${template}`);

    ViteExpress.config({ inlineViteConfig: {} });
    await ViteExpress.build();

    await testCase(template, done);
  });

  test(`Template "${template}" with custom inline config`, async (done) => {
    process.chdir(`create-vite-express/templates/${template}`);

    ViteExpress.config({
      inlineViteConfig: {
        base: "/admin",
        build: { outDir: "out" },
      },
    });
    await ViteExpress.build();

    await testCase(template, done);
  });
}

const testCase = async (template: string, done: () => void) => {
  const server = ViteExpress.listen(express(), 3000, () => {
    const browser = puppeteer.launch();

    browser.then(async (browser) => {
      const page = await browser.newPage();
      await page.goto("http://localhost:3000");

      it("test set up");

      replaceStringInFile(
        "./index.html",
        /<title>(.+)<\/title>/,
        "<title>Test - $1</title>"
      );

      await wait(200);

      let button = await getButton(page);
      await button?.click();
      expect(await getButtonText(button)).toBe("count is 1");

      replaceStringInFile(
        "./index.html",
        /<title>Test - (.+)<\/title>/,
        "<title>$1</title>"
      );

      await wait(200);

      button = await getButton(page);
      expect(await getButtonText(button)).toBe("count is 0");

      it("automatic page reload works");

      if (templatesHotReloadTestFileMap[template]) {
        const filePath = templatesHotReloadTestFileMap[template];

        await button?.click();
        await button?.click();

        replaceStringInFile(filePath, "count is", "button count is");
        await wait(200);
        expect(await getButtonText(button)).toBe("button count is 2");

        replaceStringInFile(filePath, "button count is", "count is");
        await wait(200);
        expect(await getButtonText(button)).toBe("count is 2");

        it("hot reload works");
      }

      await browser.close();

      server.close(() => {
        process.chdir(baseDir);
        done();
      });
    });
  });
};

run();
