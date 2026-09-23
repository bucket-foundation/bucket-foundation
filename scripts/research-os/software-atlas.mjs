#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cells, plain, segments, writeOrCheck } from "./md-inline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MEMO = path.join(ROOT, "learning/research-os/SOFTWARE-ATLAS.md");
const OUT = path.join(ROOT, "src/lib/research-os/software-atlas-data.json");
const PATHS = ["browser", "runner", "import", "link"];

function parse(md) {
  const lines = md.split("\n");
  const sources = {};
  for (const l of lines) {
    const m = l.match(/^(\d+)\. (.+?): <(https?:[^>]+)>\s*$/);
    if (m) sources[m[1]] = { title: m[2], url: m[3] };
  }

  const at = (h) => lines.findIndex((l) => l.trim() === h);
  const atlasStart = at("## The atlas");
  const suiteStart = at("## The research tools suite");
  const unverifiedStart = at("## Unverified");
  const directionsStart = at("## Directions for the workbench");
  if ([atlasStart, suiteStart, unverifiedStart, directionsStart].some((i) => i < 0)) throw new Error("atlas headings moved");

  const index = {};
  for (let i = atlasStart; i < suiteStart; i++) {
    const c = cells(lines[i]);
    if (lines[i].startsWith("| ") && c.length === 4 && PATHS.includes(c[2]) && !c[0].startsWith("---")) {
      index[c[0]] = { field: c[1], first: c[2], fallback: PATHS.includes(c[3]) ? c[3] : null };
    }
  }

  const tools = [];
  const viewers = [];
  let field = null;
  let intro = {};
  for (let i = atlasStart; i < suiteStart; i++) {
    const l = lines[i];
    const h = l.match(/^### (.+)$/);
    if (h) {
      field = h[1];
      const p = lines.slice(i + 1).find((x) => x.trim() && !x.startsWith("|"));
      intro[field] = p ? plain(segments(p).segs) : "";
      continue;
    }
    if (!field || !l.startsWith("| ") || l.startsWith("| ---") || l.startsWith("|---")) continue;
    const c = cells(l);
    if (field === "Viewers and runtimes for the page") {
      if (c[0] === "Viewer or runtime" || c.length !== 6) continue;
      const cell = (k) => segments(c[k]).segs;
      viewers.push({
        name: c[0],
        license: cell(1),
        reads: cell(2),
        latest: cell(3),
        maintained: cell(4),
        serves: cell(5),
      });
      continue;
    }
    if (c[0] === "Tool" || c.length !== 7) continue;
    const idx = index[c[0]];
    const cell = (k) => segments(c[k]);
    const license = cell(1);
    const licText = plain(license.segs);
    const closed = /^closed/i.test(licText) || /\bclosed\b/i.test(licText.split(";")[0]);
    const refs = new Set();
    const row = {
      name: c[0],
      field,
      open: !closed,
      license: license.segs,
      renders: cell(2).segs,
      formats: cell(3).segs,
      first: idx ? idx.first : c[4].split(",")[0].trim(),
      fallback: idx ? idx.fallback : null,
      connects: cell(5).segs,
      shows: cell(6).segs,
      sources: [],
    };
    for (const k of [1, 2, 3, 5, 6]) for (const r of segments(c[k]).refs) refs.add(r);
    row.sources = [...refs].sort((a, b) => a - b).map((n) => ({ n, ...(sources[n] ?? { title: `source ${n}`, url: null }) }));
    tools.push(row);
  }

  const suite = [];
  let group = null;
  for (let i = suiteStart; i < unverifiedStart; i++) {
    const l = lines[i];
    const h = l.match(/^### Suite: (.+)$/);
    if (h) {
      group = h[1];
      continue;
    }
    if (!group || !l.startsWith("| ") || l.startsWith("| ---")) continue;
    const c = cells(l);
    if (c[0] === "Tool" || c.length !== 5) continue;
    const pyodide = plain(segments(c[3]).segs);
    suite.push({
      name: c[0],
      group,
      does: segments(c[1]).segs,
      runs: segments(c[2]).segs,
      pyodide,
      inBrowser: /^same/.test(pyodide),
      atlasRows: plain(segments(c[4]).segs),
    });
  }

  const directions = [];
  for (let i = directionsStart; i < lines.length; i++) {
    const m = lines[i].match(/^(\d+)\. \*\*(.+?)\*\* (.+)$/);
    if (m) directions.push({ n: Number(m[1]), title: m[2], body: segments(m[3]).segs });
  }

  const unverified = [];
  for (let i = unverifiedStart; i < directionsStart; i++) {
    const m = lines[i].match(/^- (.+)$/);
    if (m) unverified.push(segments(m[1]).segs);
  }

  return { memo: "learning/research-os/SOFTWARE-ATLAS.md", fields: [...new Set(tools.map((t) => t.field))].map((f) => ({ name: f, intro: intro[f] ?? "" })), tools, viewers, suite, directions, unverified };
}

const data = parse(fs.readFileSync(MEMO, "utf8"));
const missing = data.tools.filter((t) => !PATHS.includes(t.first));
if (missing.length) throw new Error(`no first path for ${missing.map((t) => t.name).join(", ")}`);
const json = JSON.stringify(data, null, 1) + "\n";

writeOrCheck(fs, OUT, json, "software-atlas-data.json", `${data.tools.length} tools in ${data.fields.length} fields, ${data.viewers.length} viewers, ${data.suite.length} suite tools, ${data.directions.length} directions`);
