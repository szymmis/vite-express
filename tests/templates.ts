export type Template = {
  index: number;
  name: string;
  ts?: boolean;
  typecheck?: boolean;
  hmrTestFilePath?: string;
};

export const TEMPLATES: Template[] = [
  {
    index: 0,
    name: "vanilla",
  },
  {
    index: 0,
    name: "vanilla-ts",
    ts: true,
  },
  {
    index: 1,
    name: "react",
    hmrTestFilePath: "./src/client/App.jsx",
  },
  {
    index: 1,
    name: "react-ts",
    ts: true,
    hmrTestFilePath: "./src/client/App.tsx",
  },
  {
    index: 2,
    name: "preact",
    hmrTestFilePath: "./src/client/app.jsx",
  },
  {
    index: 2,
    name: "preact-ts",
    ts: true,
    typecheck: false,
    hmrTestFilePath: "./src/client/app.tsx",
  },
  {
    index: 3,
    name: "vue",
    hmrTestFilePath: "./src/client/components/HelloWorld.vue",
  },
  {
    index: 3,
    name: "vue-ts",
    ts: true,
    typecheck: false,
    hmrTestFilePath: "./src/client/components/HelloWorld.vue",
  },
];
