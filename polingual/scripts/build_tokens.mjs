import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../src/ui/tokens.json");

export function tokensCss(t) {
  const lines = [];
  for (const [k, v] of Object.entries(t.color)) lines.push(`  --pl-${k}: ${v};`);
  for (const [k, v] of Object.entries(t.font)) lines.push(`  --pl-font-${k}: ${v};`);
  for (const [k, v] of Object.entries(t.type)) lines.push(`  --pl-type-${k}: ${v.weight} ${v.size}px/${v.line} var(--pl-font-${v.font});`);
  for (const [k, v] of Object.entries(t.radius)) lines.push(`  --pl-radius-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.space)) lines.push(`  --pl-space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.lip)) lines.push(`  --pl-lip-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.motion)) lines.push(`  --pl-motion-${k}: ${typeof v === "number" ? `${v}ms` : v};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

export function readTokens() {
  return JSON.parse(readFileSync(src, "utf8"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(path.join(here, "../src/ui/tokens.css"), tokensCss(readTokens()));
}
