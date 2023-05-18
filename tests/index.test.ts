import { execSync } from "child_process";

import { runTestFile } from "./lib/runner";
import { isLocalBuild } from "./lib/utils";

if (isLocalBuild()) {
  execSync("rm -f vite-express-*.tgz && yarn build && yarn pack", {
    stdio: "inherit",
  });
}

runTestFile("server.test.ts");
runTestFile("server.test.ts", { mode: "production" });
runTestFile("templates.test.ts");
runTestFile("cli.test.ts");
