import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import shebang from "rollup-plugin-add-shebang";

export default {
  input: "src/cli.ts",
  output: {
    dir: "bin",
    format: "cjs",
  },
  external: ["prompts", "kolorist", "path", "fs-extra"],
  plugins: [typescript({ module: "esnext" }), shebang(), terser()],
};
