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

const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "return", "function", "with"]);
const DECL = [
  /^\s*(?:export )?(?:default )?(?:async )?function\*?\s+(\w+)/,
  /^\s*(?:export )?(?:const|let|var) (\w+)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|(?:<[^>]*>)?\([^)]*\)?\s*(?::[^=]+)?=>|\w+\s*=>|\(\s*$)/,
  /^\s+(?:(?:public|private|protected|static|async|get|set)\s+)*(\w+)\s*(?:<[^>]*>)?\([^)]*\)\s*(?::\s*[^{=]+)?\{\s*$/,
  /^\s+(\w+)\s*:\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>)/,
];

function strip(line: string): string {
  return line
    .replace(/\/\/.*$/, "")
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
}

function depthOf(line: string): number {
  let d = 0;
  for (const c of strip(line)) {
    if (c === "{" || c === "(" || c === "[") d++;
    else if (c === "}" || c === ")" || c === "]") d--;
  }
  return d;
}

export function functions(src: string): { name: string; lines: number }[] {
  const lines = src.split("\n");
  const out = new Map<string, number>();
  lines.forEach((l, i) => {
    const name = DECL.map((r) => r.exec(l)?.[1]).find((n) => n && !KEYWORDS.has(n));
    if (!name) return;
    let depth = depthOf(l);
    let j = i;
    while (depth > 0 && j + 1 < lines.length) depth += depthOf(lines[++j]);
    const n = j - i + 1;
    if (n > (out.get(name) ?? 0)) out.set(name, n);
  });
  return [...out].map(([name, lines]) => ({ name, lines }));
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
  const fixed = Object.keys(DEBT).filter((k) => !(k in over));
  assert.deepEqual(fixed, [], `fixed, remove from size-debt.json: ${fixed.join(", ")}`);
  const shrank = Object.keys(over).filter((k) => over[k] < DEBT[k]);
  assert.deepEqual(shrank, [], `shrank, lower in size-debt.json: ${shrank.map((k) => `${k} ${DEBT[k]} to ${over[k]}`).join(", ")}`);
});

test("function detection sees declarations, arrow components and methods", () => {
  const body = Array.from({ length: 3 }, () => "  x();").join("\n");
  const src = [
    `function a() {\n${body}\n}`,
    `export const B = ({ p }: P) => {\n${body}\n};`,
    `const C = () => (\n  <div>\n  </div>\n);`,
    `class K {\n  m(x: number): void {\n${body}\n  }\n}`,
  ].join("\n");
  const got = Object.fromEntries(functions(src).map((f) => [f.name, f.lines]));
  assert.deepEqual(got, { a: 5, B: 5, C: 4, m: 5 });
});
