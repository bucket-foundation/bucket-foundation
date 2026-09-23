import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WINDOW = 6;
const PROSE = /\.(md|mdx)$/;
const CITE_COUNT = /(?<![\w./-])(?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|py|sh|css|json|yaml|yml)\b/g;
const CITE = /(?<![\w./-])((?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|py|sh|css|json|yaml|yml)):(\d+)/g;
const SOURCE_TREES = ["src", "supabase", "scripts", "tools", "learning", "services", "deploy"];
const SYMBOL = /`([A-Za-z_$][A-Za-z0-9_$.]*)([^`\n]*)`/g;
const GENERIC = new Set([
  "public", "private", "shared", "dev", "main", "test", "app", "null", "true", "false",
  "graph", "bucket", "node", "nodes", "edges", "error", "data", "value", "status", "kind",
]);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (PROSE.test(entry.name)) out.push(full);
  }
  return out;
}

function bySuffix(dir, suffix) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...bySuffix(full, suffix));
    else if (full === suffix || full.endsWith(path.sep + suffix)) out.push(full);
  }
  return out;
}

function fencedLines(text) {
  const inFence = new Set();
  let open = null;
  text.split("\n").forEach((line, i) => {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (m) {
      const [, marks, rest] = m;
      const char = marks[0];
      if (open === null) {
        open = { char, length: marks.length };
        inFence.add(i + 1);
        return;
      }
      if (char === open.char && marks.length >= open.length && rest.trim() === "") {
        open = null;
        inFence.add(i + 1);
        return;
      }
      inFence.add(i + 1);
      return;
    }
    if (open) inFence.add(i + 1);
  });
  return { inFence, unclosed: open !== null };
}

function scopeAround(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const lineEnd = text.indexOf("\n", index);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  if (line.trimStart().startsWith("|")) return lineAround(text, index);
  let start = text.lastIndexOf("\n\n", index);
  start = start === -1 ? 0 : start + 2;
  let end = text.indexOf("\n\n", index);
  if (end === -1) end = text.length;
  return text.slice(start, end);
}

function lineAround(text, index) {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  const end = text.indexOf("\n", index);
  const line = text.slice(start, end === -1 ? text.length : end);
  if (!line.trimStart().startsWith("|")) return line;
  const offset = index - start;
  let at = 0;
  for (const cell of line.split("|")) {
    const next = at + cell.length + 1;
    if (offset >= at && offset < next) return cell;
    at = next;
  }
  return line;
}

function exemptedOnLine(lines, proseLine) {
  const here = lines[proseLine - 1] ?? "";
  const above = lines[proseLine - 2] ?? "";
  return /cite-ignore-line/.test(here) || /cite-ignore-next/.test(above);
}

function ignored() {
  const file = path.join(ROOT, ".citeignore");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

const skip = ignored();
const targets = process.argv.slice(2);
const files = targets.length
  ? targets.flatMap((t) => (statSync(t).isDirectory() ? walk(t) : [t]))
  : [...walk(path.join(ROOT, "learning")), ...walk(path.join(ROOT, "docs"))];

const problems = [];
let checked = 0;
let symbolChecked = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (skip.some((s) => rel === s || rel.startsWith(s.endsWith("/") ? s : s + "/"))) continue;
  const text = readFileSync(file, "utf8");
  const { inFence: fenced, unclosed } = fencedLines(text);
  if (unclosed) {
    problems.push({
      kind: "unclosed-fence",
      where: path.relative(ROOT, file),
      cited: "",
      detail: "a code fence is never closed, so every citation below it would be skipped",
    });
  }
  const lines = text.split("\n");
  let m;
  CITE.lastIndex = 0;
  while ((m = CITE.exec(text))) {
    const proseLine = text.slice(0, m.index).split("\n").length;
    if (fenced.has(proseLine)) continue;
    if (exemptedOnLine(lines, proseLine)) continue;
    const [, cited, lineText] = m;
    const where = `${path.relative(ROOT, file)}:${proseLine}`;
    checked += 1;

    let target = path.join(ROOT, cited);
    if (!existsSync(target)) {
      const matches = SOURCE_TREES.flatMap((t) => bySuffix(path.join(ROOT, t), cited));
      if (matches.length === 0) {
        problems.push({ kind: "missing-file", where, cited, detail: `nothing under ${SOURCE_TREES.join(", ")} ends with that path` });
        continue;
      }
      if (matches.length > 1) {
        problems.push({
          kind: "ambiguous",
          where,
          cited,
          detail: `${matches.length} files end with that path: ${matches.slice(0, 4).map((f) => path.relative(ROOT, f)).join(", ")}${matches.length > 4 ? ", and more" : ""}`,
        });
        continue;
      }
      target = matches[0];
    }
    const body = readFileSync(target, "utf8").split("\n");
    const n = Number(lineText);
    if (n < 1 || n > body.length) {
      problems.push({ kind: "out-of-range", where, cited: `${cited}:${n}`, detail: `the file has ${body.length} lines` });
      continue;
    }

    const sentence = scopeAround(text, m.index);
    const citesOnThisLine = (lineAround(text, m.index).match(CITE_COUNT) || []).length;
    const symbols = [];
    let s;
    SYMBOL.lastIndex = 0;
    while ((s = SYMBOL.exec(sentence))) {
      const name = s[1];
      const whole = name + s[2];
      if (whole.includes("/") || /\.(ts|tsx|js|jsx|mjs|cjs|sql|py|sh|css|json|yaml|yml|md)\b/.test(whole)) continue;
      if (name.includes("/")) continue;
      if (name.length < 3) continue;
      if (GENERIC.has(name.toLowerCase())) continue;
      symbols.push(name);
    }
    if (symbols.length === 0 || citesOnThisLine > 1) continue;
    symbolChecked += 1;

    const window = body.slice(Math.max(0, n - 1 - WINDOW), n + WINDOW).join("\n");
    const found = symbols.filter((name) => window.includes(name.split(".")[0]));
    if (found.length === 0) {
      const actual = body.findIndex((l) => l.includes(symbols[0].split(".")[0])) + 1;
      problems.push({
        kind: "symbol-not-there",
        where,
        cited: `${cited}:${n}`,
        detail: `names ${symbols.map((x) => `\`${x}\``).join(", ")}, and none appears within ${WINDOW} lines${actual ? `. \`${symbols[0]}\` is at line ${actual}` : ""}`,
      });
    }
  }
}

const byKind = (k) => problems.filter((p) => p.kind === k);
console.log(`${checked} code citation(s) checked in ${files.length} prose file(s), ${symbolChecked} with a named symbol to verify`);
for (const kind of ["unclosed-fence", "missing-file", "ambiguous", "out-of-range", "symbol-not-there"]) {
  const rows = byKind(kind);
  if (!rows.length) continue;
  console.log(`\n${kind} (${rows.length}):`);
  for (const p of rows) console.log(`  ${p.where}  ->  ${p.cited}  ${p.detail}`);
}
if (problems.length === 0) console.log("every citation resolves");
process.exit(problems.length ? 1 : 0);
