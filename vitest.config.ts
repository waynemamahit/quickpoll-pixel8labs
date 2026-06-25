import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const exclude = [
  "node_modules/",
  "coverage/",
  "dist/",
  "vitest.setup.ts",
  "e2e/",
  "**/*.workers.test.ts",
  "server/app.ts",
  "server/durable_objects/**",
  "server/routes/**",
  "server/containers/**",
  "server/durable_objects/sse-spike.do.ts",
  "app/i18n/config.ts",
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
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      exclude,
    },
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...exclude, "**/*.workers.test.ts"],
  },
});
