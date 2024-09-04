import fs from "fs-extra";
import * as kolorist from "kolorist";
import path from "path";

import { PATCHES } from "./patches";

export async function main({
  projectName,
  framework,
  ts,
}: {
  projectName: string;
  framework: string;
  ts: boolean;
}) {
  const templateName = `${framework}${ts ? "-ts" : ""}`;
  const templatePath = path.join(__dirname, "..", "templates", templateName);
  if (!fs.existsSync(templatePath)) {
    console.error(
      kolorist.red(`Template ${templateName} at ${templatePath} not found!`),
    );
    process.exit(1);
  }

  const projectPath = path.resolve(process.cwd(), projectName);

  console.log();
  console.log(`Scaffolding app at ${kolorist.gray(projectPath)}`);
  console.log();

  fs.copySync(templatePath, projectPath);
  fs.moveSync(
    path.join(projectPath, "_gitignore"),
    path.join(projectPath, ".gitignore"),
  );
  for (const patch in PATCHES) {
    const filePath = path.join(projectPath, patch);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      fs.writeFileSync(filePath, PATCHES[patch](content, [projectName]));
    }
  }

  console.log(`${kolorist.green("✔")} Done! You can start with:`);
  console.log(` ${kolorist.gray("1.")} cd ${projectName}`);
  console.log(` ${kolorist.gray("2.")} npm install`);
  console.log(` ${kolorist.gray("3.")} npm run dev`);
  console.log(kolorist.green("\nHappy hacking! 🎉\n"));
}
