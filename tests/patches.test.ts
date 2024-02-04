import fs from "fs";
import os from "os";
import path from "path";
import { beforeAll, describe, expect, test } from "vitest";

import { main } from "../create-vite-express/src/main";

describe("Templates patches", () => {
  describe("When the platform is win32", () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));

    beforeAll(() => {
      process.chdir(tmpdir);
      Object.defineProperty(process, "platform", { value: "win32" });
    });

    test("install template", async () => {
      main({ projectName: "test", framework: "react", ts: false });
    });

    test("cross-env was added to package.json", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(tmpdir, "test", "package.json"), "utf-8"),
      );

      expect(pkg.scripts.start).toContain("cross-env NODE_ENV=production");
      expect(pkg.dependencies["cross-env"]).toBeDefined();
      expect(pkg.dependencies["cross-env"]).toBe("^7.0.3");
    });
  });

  describe("When the platform is linux", () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));

    beforeAll(() => {
      process.chdir(tmpdir);
      Object.defineProperty(process, "platform", { value: "linux" });
    });

    test("install template", async () => {
      main({ projectName: "test", framework: "react", ts: false });
    });

    test("cross-env was added to package.json", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(tmpdir, "test", "package.json"), "utf-8"),
      );

      expect(pkg.scripts.start).not.toContain("cross-env NODE_ENV=production");
      expect(pkg.dependencies["cross-env"]).toBeUndefined();
    });
  });
});
