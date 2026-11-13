import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");
export async function resolve(spec, ctx, next) {
  let s = spec;
  if (s.startsWith("@academy/")) s = pathToFileURL(`${ROOT}/src/lib/academy/${s.slice(9)}`).href;
  else if (s.startsWith("@/")) s = pathToFileURL(`${ROOT}/polingual/src/${s.slice(2)}`).href;
  if (s.startsWith("file:") || s.startsWith(".")) {
    const base = s.startsWith(".") ? new URL(s, ctx.parentURL).href : s;
    const p = fileURLToPath(base);
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) if (existsSync(p + ext) && !(ext === "" && !/\.\w+$/.test(p))) return next(pathToFileURL(p + ext).href, ctx);
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { type: "json" } });
  return next(url, ctx);
}
