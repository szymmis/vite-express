import fs from "fs";
import os from "os";
import path from "path";
import { describe, test } from "vitest";

import { TEMPLATES } from "../create-vite-express/src/templates";
import { cmd } from "./libs/utils";

// const TEMPLATES_HMR_FILE_MAP = {
//   react: "./src/client/App.jsx",
//   "react-ts": "./src/client/App.tsx",
//   vue: "./src/client/components/HelloWorld.vue",
//   "vue-ts": "./src/client/components/HelloWorld.vue",
// };

const cliPath = path.resolve(__dirname, "../create-vite-express/src/cli.ts");

TEMPLATES.forEach((template, i) => {
  describe(`Template "${template.value}"`, () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));
    testCase({ ts: false, templateIndex: i, tmpdir });
  });

  describe(`Template "${template.value}-ts"`, () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "/"));
    testCase({ ts: true, templateIndex: i, tmpdir });
  });
});

const testCase = async ({
  ts,
  templateIndex,
  tmpdir,
}: {
  ts: boolean;
  templateIndex: number;
  tmpdir: string;
}) => {
  console.log(tmpdir);

  test("install template", async () => {
    return cmd(`tsx ${cliPath}`)
      .cwd(tmpdir)
      .write("test")
      .awaitOutput("Select a framework")
      .write("\u001b[B".repeat(templateIndex))
      .awaitOutput("Do you use TypeScript?")
      .write(ts ? "y" : "n")
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

  test("install dependencies", async () => {
    return cmd("npm install").cwd(path.join(tmpdir, "test")).success().assert();
  });

  test("run app in development mode", async () => {
    return cmd("npm run dev")
      .cwd(path.join(tmpdir, "test"))
      .awaitOutput(["Running in", "development"])
      .awaitOutput("Server is listening on port 3000...")
      .close()
      .assert();
  });

  test("build app", async () => {
    return cmd("npm run build")
      .cwd(path.join(tmpdir, "test"))
      .success()
      .stdoutMatches("built in")
      .assert();
  });

  test("run app in production mode", async () => {
    return cmd("npm run start")
      .cwd(path.join(tmpdir, "test"))
      .awaitOutput(["Running in", "production"])
      .awaitOutput("Server is listening on port 3000...")
      .close()
      .assert();
  });
};
