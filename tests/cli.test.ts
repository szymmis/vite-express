import fs from "fs";

import { expectCommandOutput, it, run, test } from "./lib/runner";
import { installYarn } from "./lib/utils";

const baseDir = process.cwd();
const templates = fs.readdirSync("create-vite-express/templates");

for (const template of templates) {
  test(`[CLI] Template "${template}"`, async (done) => {
    process.chdir(`create-vite-express/templates/${template}`);

    await installYarn();
    it("yarn installed");

    await expectCommandOutput("yarn dev", [/Running in/, /development/]);
    it("dev command works");

    await expectCommandOutput("yarn build");
    it("app can be built");

    await expectCommandOutput("yarn start", [/Running in/, /production/]);
    it("production build works");

    process.chdir(baseDir);
    done();
  });
}

run();
