import { defineConfig } from "astro/config";

const site = process.env.SITE_URL ?? "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  build: {
    format: "directory",
    inlineStylesheets: "auto"
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport"
  },
  vite: {
    build: {
      target: "es2022"
    }
  }
});
