import { defineConfig } from "vite";

// The published Pages site is served from the repository root (Pages "legacy"
// source = main branch, / ). Vite therefore treats app/ as the source root and
// emits the built site into the repo root, next to the committed assets/ dir.
export default defineConfig({
  root: "app",
  base: "./",
  build: {
    outDir: "..",
    emptyOutDir: false,
    sourcemap: false,
  },
});
