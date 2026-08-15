import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**", "artifacts/**"],
    restoreMocks: true
  }
});
