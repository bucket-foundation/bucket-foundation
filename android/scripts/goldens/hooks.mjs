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
const PARAM_PROPERTY = /constructor\(([^)]*)\)\s*\{/s;

function lowerParamProperties(src) {
  const m = src.match(PARAM_PROPERTY);
  if (!m || !/\b(private|public|protected|readonly)\s+\w+/.test(m[1])) return src;
  const fields = [];
  const params = m[1].replace(/\b(?:private|public|protected|readonly)\s+(?:readonly\s+)?(\w+)(\s*:[^,=]+)?/g, (_, name, type) => {
    fields.push(`  ${name}${type ?? ""};`);
    return `${name}${type ?? ""}`;
  });
  const assigns = fields.map((f) => f.trim().split(/[:;]/)[0]).map((n) => `this.${n} = ${n};`).join(" ");
  return src.replace(m[0], `${fields.join("\n")}\n  constructor(${params}) { ${assigns}`);
}

export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { type: "json" } });
  if (url.endsWith(".ts")) {
    const r = await next(url, { ...ctx, format: "module-typescript" });
    const src = typeof r.source === "string" ? r.source : new TextDecoder().decode(r.source);
    const fixed = lowerParamProperties(src);
    return fixed === src ? r : { ...r, source: fixed };
  }
  return next(url, ctx);
}
