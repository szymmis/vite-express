import * as kolorist from "kolorist";
import prompts from "prompts";

type Template = prompts.Choice & { color: (msg: string) => string };

export const TEMPLATES: Template[] = [
  { title: "Vanilla", value: "vanilla", color: kolorist.yellow },
  { title: "React", value: "react", color: kolorist.cyan },
  { title: "Preact", value: "preact", color: kolorist.magenta },
  { title: "Vue", value: "vue", color: kolorist.green },
];
