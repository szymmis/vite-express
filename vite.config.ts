import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    bail: 1,
    testTimeout: 60000,
  },
});
