#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOTS = ["src", "scripts", "tools", "services", "learning/app/js", "learning/app/art", "public/academy-app", "quantum", "grants-gateway", "polingual", "mcp-server", "tests", "supabase/functions"];
const ROOT_FILES = ["next.config.mjs", "tailwind.config.ts", "postcss.config.mjs", "playwright.config.ts"];
const SKIP = [/\.min\.(js|css)$/, /node_modules\//, /\/vendor\//, /\.d\.ts$/];
const KEEP = /eslint-(disable|enable)|@ts-(expect-error|ignore|nocheck|check)|voice-ignore|prettier-ignore|istanbul ignore|c8 ignore|[#@]__PURE__|webpackChunkName|@vite-ignore|SPDX-License|@jsx|@jsxImportSource|biome-ignore|^\/\*!|^\/\/\/\s*<reference|shellcheck|noqa|type:\s*ignore|pragma|^#!|-\*- coding|fmt:\s*(off|on|skip)|pylint:/;

const mode = process.argv[2] ?? "check";
const only = process.argv.slice(3);

function listFiles() {
  if (only.length) return only;
  const out = execFileSync("git", ["ls-files", "--", ...ROOTS, ...ROOT_FILES], { encoding: "utf8" });
  return out.split("\n").filter((f) => f && /\.(tsx?|jsx?|mjs|cjs|py|sh|css)$/.test(f) && !SKIP.some((r) => r.test(f)));
}

function applyRanges(text, ranges) {
  ranges.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && (r[0] <= last[1] || /^[ \t]*$/.test(text.slice(last[1], r[0])))) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  const lineOf = (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const lineText = (n) => text.slice(starts[n], n + 1 < starts.length ? starts[n + 1] - 1 : text.length);
  const blank = (n) => n >= 0 && n < starts.length && /^[ \t]*$/.test(lineText(n));
  const mask = new Uint8Array(text.length);
  const wholeRuns = [];
  const maskLine = (n) => { const e = n + 1 < starts.length ? starts[n + 1] : text.length; mask.fill(1, starts[n], e); };
  for (const [s, e] of merged) {
    const sl = lineOf(s), el = lineOf(Math.max(s, e - 1));
    const before = text.slice(starts[sl], s);
    const endOfLine = el + 1 < starts.length ? starts[el + 1] - 1 : text.length;
    const after = text.slice(e, endOfLine);
    if (/^[ \t]*$/.test(before) && /^[ \t]*$/.test(after)) {
      for (let n = sl; n <= el; n++) maskLine(n);
      wholeRuns.push([sl, el]);
    } else {
      let s2 = s;
      if (/^[ \t]*$/.test(after)) while (s2 > starts[sl] && /[ \t]/.test(text[s2 - 1])) s2--;
      mask.fill(1, s2, e);
    }
  }
  const deleted = (n) => { const st = starts[n]; return mask[st] === 1 && (n + 1 >= starts.length || mask[starts[n + 1] - 1] === 1); };
  for (const [sl, el] of wholeRuns) {
    let prev = sl - 1; while (prev >= 0 && deleted(prev)) prev--;
    let next = el + 1; while (next < starts.length && deleted(next)) next++;
    if (next < starts.length && blank(next) && (prev < 0 || blank(prev))) maskLine(next);
  }
  let out = "";
  for (let i = 0; i < text.length; i++) if (!mask[i]) out += text[i];
  return out;
}

function tsRanges(file, text) {
  const ext = path.extname(file);
  const kind = ext === ".tsx" ? ts.ScriptKind.TSX : ext === ".ts" ? ts.ScriptKind.TS : ext === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const seen = new Map();
  const drop = [];
  const take = (list) => {
    for (const c of list ?? []) {
      if (seen.has(c.pos)) continue;
      const body = text.slice(c.pos, c.end);
      seen.set(c.pos, true);
      if (KEEP.test(body)) continue;
      drop.push([c.pos, c.end]);
    }
  };
  const visit = (node, parentIsJsxText) => {
    if (ts.isJsxExpression(node) && !node.expression) {
      const inner = text.slice(node.getStart(sf) + 1, node.getEnd() - 1);
      const probe = ts.getLeadingCommentRanges(inner, 0) ?? [];
      const keep = probe.some((c) => KEEP.test(inner.slice(c.pos, c.end)));
      if (!keep) {
        drop.push([node.getStart(sf), node.getEnd()]);
        return;
      }
    }
    const kids = node.getChildren(sf);
    if (kids.length === 0) {
      if (node.kind !== ts.SyntaxKind.JsxText && node.kind !== ts.SyntaxKind.JsxTextAllWhiteSpaces) {
        if (!parentIsJsxText) take(ts.getLeadingCommentRanges(text, node.getFullStart()));
        take(ts.getTrailingCommentRanges(text, node.getEnd()));
      }
      return;
    }
    let prevJsxText = false;
    for (const k of kids) {
      visit(k, prevJsxText);
      prevJsxText = k.kind === ts.SyntaxKind.JsxText;
    }
  };
  visit(sf, false);
  return drop;
}

function cssRanges(text) {
  const drop = [];
  let i = 0;
  let q = null;
  while (i < text.length) {
    const ch = text[i];
    if (q) {
      if (ch === "\\") i++;
      else if (ch === q) q = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; i++; continue; }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const e = end < 0 ? text.length : end + 2;
      if (!KEEP.test(text.slice(i, e))) drop.push([i, e]);
      i = e;
      continue;
    }
    i++;
  }
  return drop;
}

function shRanges(text) {
  const drop = [];
  const lines = text.split("\n");
  let pos = 0;
  let heredoc = null;
  lines.forEach((line, n) => {
    const start = pos;
    pos += line.length + 1;
    if (heredoc) {
      if (line.replace(/^\t+/, "") === heredoc) heredoc = null;
      return;
    }
    const m = line.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
    if (m && !/^\s*#/.test(line)) heredoc = m[1];
    if (n === 0 && line.startsWith("#!")) return;
    if (/^\s*#/.test(line) && !KEEP.test(line)) drop.push([start + line.indexOf("#"), start + line.length]);
  });
  return drop;
}

function pyStrip(file) {
  return execFileSync("python3", [path.join(path.dirname(new URL(import.meta.url).pathname), "comments_py.py"), file], { encoding: "utf8", maxBuffer: 1 << 28 });
}

let dirty = 0;
let changed = 0;
for (const file of listFiles()) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  let next;
  if (file.endsWith(".py")) next = pyStrip(file);
  else {
    const ranges = file.endsWith(".css") ? cssRanges(text) : file.endsWith(".sh") ? shRanges(text) : tsRanges(file, text);
    next = ranges.length ? applyRanges(text, ranges) : text;
  }
  if (next === text) continue;
  dirty++;
  if (mode === "fix") { writeFileSync(file, next); changed++; }
  else console.log(file);
}
if (mode === "fix") console.log(`stripped ${changed} files`);
else if (dirty) { console.error(`${dirty} files carry comments; run: node scripts/comments.mjs fix`); process.exit(1); }
