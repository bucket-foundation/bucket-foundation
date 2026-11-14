import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const FILE_MAX = 300;
const FN_MAX = 60;
const GENERATED = ["ui/art/data.ts", "ui/art/objects.tsx", "lib/translate/slugs.ts", "data/"];
const DEBT: Record<string, number> = JSON.parse(readFileSync(join(process.cwd(), "src/lib/size-debt.json"), "utf8"));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

function functions(src: string): { name: string; lines: number }[] {
  const lines = src.split("\n");
  const out: { name: string; lines: number }[] = [];
  lines.forEach((l, i) => {
    const m = /^(?:export )?(?:default )?(?:async )?function (\w+)/.exec(l);
    if (!m) return;
    let j = i + 1;
    while (j < lines.length && lines[j] !== "}") j++;
    out.push({ name: m[1], lines: j - i + 1 });
  });
  return out;
}

export function overBudget(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of files(ROOT)) {
    const rel = relative(ROOT, p);
    if (GENERATED.some((g) => rel.startsWith(g))) continue;
    const src = readFileSync(p, "utf8");
    const n = src.split("\n").length;
    if (n > FILE_MAX) out[rel] = n;
    for (const f of functions(src)) if (f.lines > FN_MAX) out[`${rel}:${f.name}`] = f.lines;
  }
  return out;
}

test("no source file passes 300 lines and no function passes 60, except recorded debt that may only shrink", () => {
  const over = overBudget();
  const fresh = Object.keys(over).filter((k) => !(k in DEBT));
  assert.deepEqual(fresh, [], `new size violations: ${fresh.map((k) => `${k} (${over[k]})`).join(", ")}`);
  const grew = Object.keys(over).filter((k) => over[k] > DEBT[k]);
  assert.deepEqual(grew, [], `debt grew: ${grew.map((k) => `${k} ${DEBT[k]} to ${over[k]}`).join(", ")}`);
});
