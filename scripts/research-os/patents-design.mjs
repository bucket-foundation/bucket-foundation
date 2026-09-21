#!/usr/bin/env node
/**
 * Builds src/lib/research-os/patents-design-data.json from
 * learning/research-os/PATENTS.md and the ros-patents rows queued in
 * BEADS-PENDING.jsonl, for the Patents page in Research OS.
 *
 *   node scripts/research-os/patents-design.mjs          # write the JSON
 *   node scripts/research-os/patents-design.mjs --check  # exit 1 when the JSON is stale
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cells, segments, writeOrCheck } from "./md-inline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MEMO = path.join(ROOT, "learning/research-os/PATENTS.md");
const BEADS = path.join(ROOT, "BEADS-PENDING.jsonl");
const OUT = path.join(ROOT, "src/lib/research-os/patents-design-data.json");

function table(lines, header) {
  const start = lines.findIndex((l) => l.trim() === header);
  if (start < 0) throw new Error(`PATENTS.md: table "${header}" moved`);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith("|"); i++) rows.push(cells(lines[i]).map((c) => segments(c).segs));
  return rows;
}

function bullets(lines, heading) {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) throw new Error(`PATENTS.md: "${heading}" moved`);
  const out = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("#"); i++) {
    const m = lines[i].match(/^- (.+)$/);
    if (m) out.push(segments(m[1]).segs);
  }
  return out;
}

const lines = fs.readFileSync(MEMO, "utf8").split("\n");
const sources = table(lines, "| Source | Research OS | Gateway paid routes |").map(([source, researchOs, gateway]) => ({ source, researchOs, gateway }));
const corpus = table(lines, "| Branch | CPC symbols for the first slice | Why |").map(([branch, cpc, why]) => ({ branch, cpc, why }));
const settled = bullets(lines, "### What the memo settles");

const slices = [];
for (const l of fs.readFileSync(BEADS, "utf8").split("\n")) {
  if (!l.trim()) continue;
  const b = JSON.parse(l);
  const m = String(b.title ?? "").match(/^ros-patents (\d+): (.+)$/);
  // A slice has shipped when the memo carries its section.
  if (m) slices.push({ n: Number(m[1]), title: m[2], shipped: lines.some((x) => x.startsWith(`## Slice ${m[1]}:`)) });
}
const seen = new Set();
const uniqueSlices = slices.filter((s) => (seen.has(s.n) ? false : (seen.add(s.n), true))).sort((a, b) => a.n - b.n);

const data = { memo: "learning/research-os/PATENTS.md", sources, corpus, settled, slices: uniqueSlices };
writeOrCheck(fs, OUT, JSON.stringify(data, null, 1) + "\n", "patents-design-data.json", `${sources.length} sources, ${corpus.length} branches, ${settled.length} decisions, ${uniqueSlices.length} slices`);
