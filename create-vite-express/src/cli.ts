import fs from "fs-extra";
import * as kolorist from "kolorist";
import path from "path";
import prompts from "prompts";

type Template = prompts.Choice & { color: (msg: string) => string };

const TEMPLATES: Template[] = [
  { title: "Vanilla", value: "vanilla", color: kolorist.yellow },
  { title: "React", value: "react", color: kolorist.cyan },
  { title: "Vue", value: "vue", color: kolorist.green },
];

async function main() {
  const answers = await prompts([
    {
      name: "projectName",
      type: "text",
      message: "Project name",
      initial: "vite-express-project",
    },
    {
      name: "framework",
      type: "select",
      message: "Select a framework",
      choices: TEMPLATES.map((option) => ({
        ...option,
        title: option.color(option.title),
      })),
    },
    {
      name: "ts",
      type: "confirm",
      message: "Do you use TypeScript?",
    },
  ]);

  const { projectName, framework, ts } = answers;

  const templateName = `${framework}${ts ? "-ts" : ""}`;
  const templatePath = path.join(__dirname, "..", "templates", templateName);
  if (!fs.existsSync(templatePath)) {
    console.error(
      kolorist.red(`Template ${templateName} at ${templatePath} not found!`)
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
    path.join(projectPath, ".gitignore")
  );

  console.log(`${kolorist.green("✔")} Done! You can start with:`);
  console.log(` ${kolorist.gray("1.")} cd ${projectName}`);
  console.log(` ${kolorist.gray("2.")} npm install`);
  console.log(` ${kolorist.gray("3.")} npm run dev`);
  console.log(kolorist.green("\nHappy hacking! 🎉\n"));
}

main();
