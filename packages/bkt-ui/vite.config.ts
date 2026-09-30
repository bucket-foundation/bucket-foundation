import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const SRC = resolve(__dirname, "../../src");
const LANDMASK = ["landmask-2k.bin", "landmask-2k.json"];

function landmask(): Plugin {
  return {
    name: "bkt-landmask",
    closeBundle() {
      const out = resolve(__dirname, "dist/textures/earth");
      mkdirSync(out, { recursive: true });
      for (const f of LANDMASK) copyFileSync(resolve(__dirname, "../../public/textures/earth", f), resolve(out, f));
    },
  };
}

export default defineConfig({
  plugins: [react(), landmask()],
  publicDir: false,
  resolve: {
    dedupe: ["react", "react-dom", "three", "@react-three/fiber", "@react-three/drei"],
    alias: [
      ...["react-dom", "react", "three-stdlib", "three", "@react-three/fiber", "@react-three/drei"].map((pkg) => ({
        find: new RegExp(`^${pkg.replace("/", "\\/")}(/.*)?$`),
        replacement: `${resolve(__dirname, "node_modules", pkg)}$1`,
      })),
      { find: "@academy", replacement: resolve(SRC, "lib/academy") },
      { find: "@ros", replacement: resolve(SRC, "lib/research-os") },
      { find: /^@\//, replacement: `${SRC}/` },
      { find: /^next\/navigation$/, replacement: resolve(__dirname, "src/shims/next-navigation.ts") },
      { find: /^next\/link$/, replacement: resolve(__dirname, "src/shims/next-link.tsx") },
      { find: /^next\/dynamic$/, replacement: resolve(__dirname, "src/shims/next-dynamic.tsx") },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: resolve(__dirname, "src/main.tsx"),
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/app[extname]",
      },
    },
  },
});
