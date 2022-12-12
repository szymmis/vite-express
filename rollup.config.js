import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "lib/main.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
  external: ["express", "vite", "node-fetch", "path", "picocolors"],
  plugins: [typescript({ module: "ESNext" }), terser()],
};
