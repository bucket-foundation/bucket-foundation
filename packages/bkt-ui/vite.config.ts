import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { DENIED_NAME } from "../bkt/src/pack/rights";
import { exploreAliases } from "./explore-aliases";

const SRC = resolve(__dirname, "../../src");
const LANDMASK = ["landmask-2k.bin", "landmask-2k.json"];
const EXPLORE_FILES = ["explore/sample-genome.txt", "explore/fixtures/apoe3-nterm.pdb"];

function landmask(): Plugin {
  return {
    name: "bkt-landmask",
    closeBundle() {
      const out = resolve(__dirname, "dist/textures/earth");
      mkdirSync(out, { recursive: true });
      for (const f of LANDMASK) copyFileSync(resolve(__dirname, "../../public/textures/earth", f), resolve(out, f));
      for (const f of EXPLORE_FILES) {
        mkdirSync(resolve(__dirname, "dist", f, ".."), { recursive: true });
        copyFileSync(resolve(__dirname, "../../public", f), resolve(__dirname, "dist", f));
      }
    },
  };
}

const FILTERED_DATA = /\/src\/data\/canon-(timeline|embeddings)\.json$/;

function deniedRows(): Plugin {
  return {
    name: "bkt-denied-rows",
    enforce: "pre",
    transform(code, id) {
      if (!FILTERED_DATA.test(id.split("?")[0])) return null;
      const data = JSON.parse(code) as Record<string, unknown>;
      for (const [k, v] of Object.entries(data)) if (Array.isArray(v)) data[k] = v.filter((row) => !DENIED_NAME.test(JSON.stringify(row)));
      return { code: JSON.stringify(data), map: null };
    },
  };
}

export default defineConfig({
  plugins: [deniedRows(), react(), landmask()],
  publicDir: false,
  resolve: {
    dedupe: ["react", "react-dom", "three", "@react-three/fiber", "@react-three/drei"],
    alias: [
      ...Object.entries(exploreAliases).map(([find, replacement]) => ({ find: new RegExp(`^${find}$`), replacement })),
      ...["react-dom", "react", "three-stdlib", "three", "@react-three/fiber", "@react-three/drei", "3dmol", "smiles-drawer"].map((pkg) => ({
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
