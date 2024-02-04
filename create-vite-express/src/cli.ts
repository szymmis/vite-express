import prompts from "prompts";

import { main } from "./main";
import { TEMPLATES } from "./templates";

async function bin() {
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

  main(answers);
}

bin();
