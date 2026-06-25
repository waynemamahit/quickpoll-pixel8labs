import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const exclude = [
  "node_modules/",
  "coverage/",
  "dist/",
  "vitest.setup.ts",
  "e2e/",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude,
    },
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude,
  },
});
