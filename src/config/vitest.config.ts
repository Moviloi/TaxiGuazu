import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: [path.resolve(rootDir, "tests/setup.ts")],
    root: rootDir,
  },
});
