import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, mergeConfig, type Plugin, type UserConfig } from "vite";
import ui from "../bkt-ui/vite.config";

const LANDMASK = ["landmask-2k.bin", "landmask-2k.json"];

function landmask(): Plugin {
  return {
    name: "bkt-mobile-landmask",
    closeBundle() {
      const out = resolve(__dirname, "dist/textures/earth");
      mkdirSync(out, { recursive: true });
      for (const f of LANDMASK) copyFileSync(resolve(__dirname, "../../public/textures/earth", f), resolve(out, f));
    },
  };
}

const base = ui as UserConfig;

export default defineConfig(
  mergeConfig(
    { ...base, plugins: (base.plugins ?? []).filter((p) => !(p && typeof p === "object" && "name" in p && p.name === "bkt-landmask")) },
    {
      root: __dirname,
      css: { postcss: resolve(__dirname, "../bkt-ui") },
      plugins: [landmask()],
      build: {
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: true,
        rollupOptions: { input: resolve(__dirname, "index.html"), output: { entryFileNames: "assets/app.js" } },
      },
    },
  ),
);
