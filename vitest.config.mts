import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // e2e/ holds Playwright specs (run via `npx playwright test`), not vitest.
    exclude: ["**/node_modules/**", "e2e/**", "**/.claude/**"],
  },
});
