import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@academy": resolve(__dirname, "../../src/lib/academy"), "@ros": resolve(__dirname, "../../src/lib/research-os") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    target: "es2022",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(__dirname, "src/main.tsx"),
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/app[extname]",
        inlineDynamicImports: true,
      },
    },
  },
});
