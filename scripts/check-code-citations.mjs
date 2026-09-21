/**
 * Every `file.ts:123` in a prose file points at a line that exists, and
 * at the symbol the prose names beside it.
 *
 * A memo that grounds a schema decision in the current code is only worth
 * the accuracy of its addresses. One review of `learning/research-os/`
 * found thirteen citations pointing at the wrong line while every
 * quotation around them was verbatim: the author read the source and
 * wrote down the wrong address. Code moves, prose does not, so this drifts
 * by itself.
 *
 *   node scripts/check-code-citations.mjs [paths...]
 *
 * With no paths it checks `learning/**` and `docs/**`. Exit 1 on any
 * citation that cannot be resolved.
 *
 * What counts as a hit: `path/to/file.ext:N`, where the path resolves
 * from the repo root. A citation inside a fenced code block is skipped,
 * since that is usually sample output rather than a claim.
 *
 * A prose file that reviews another repository cites paths this one does
 * not hold. List those files in `.citeignore`, one path per line, the way
 * `.voiceignore` works for the voice rules.
 *
 * What counts as a symbol: a backticked identifier in the same sentence.
 * The line itself, or the twelve lines around it, must contain it. The
 * window is generous on purpose; this catches an address that moved, not
 * one that drifted by a line.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WINDOW = 6;
const PROSE = /\.(md|mdx)$/;
// A bare `engine-bridge.ts:35` is a citation too, and the commonest
// shape in these memos. It resolves by basename against the source
// trees, and an ambiguous basename is itself a finding: a reader cannot
// follow it either.
/**
 * Any file path on the line, with or without a line number. A row citing
 * two files gives no way to say which symbol belongs to which, and the
 * second file often carries no line number at all, which is how the
 * first version of this check reported a symbol against the wrong file.
 */
const CITE_COUNT = /(?<![\w./-])(?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|py|sh|css|json|yaml|yml)\b/g;
const CITE = /(?<![\w./-])((?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|py|sh|css|json|yaml|yml)):(\d+)/g;
const SOURCE_TREES = ["src", "supabase", "scripts", "tools", "learning"];
const SYMBOL = /`([A-Za-z_$][A-Za-z0-9_$.]*)`/g;
/**
 * Words that are backticked all over this repo and name no symbol in
 * particular. Looking for them produces a hit on almost any line.
 */
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

/** Every file under a tree whose path ends with this suffix. */
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

/** Line numbers inside a fenced block, which are illustrations. */
function fencedLines(text) {
  const inFence = new Set();
  let open = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      open = !open;
      inFence.add(i + 1);
      return;
    }
    if (open) inFence.add(i + 1);
  });
  return inFence;
}

/**
 * The line a citation sits on, which holds the symbols named beside it.
 *
 * A sentence boundary is the wrong unit here. A markdown table row has
 * no full stop, so reaching for one swallowed the rest of the file and
 * every backticked word in it (measured on docs/PROBLEM-REGISTER.md: one
 * citation collected eighty symbols). A line is the clause a reader
 * takes the citation to be about.
 *
 * Inside a markdown table the unit is the cell. A register row puts the
 * citation in one column and the proposed fix in the next, and the fix
 * names symbols that are absent from the cited file by design.
 */
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

/** Prose files exempted in `.citeignore`, one path per line. */
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

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (skip.some((s) => rel === s || rel.startsWith(s.endsWith("/") ? s : s + "/"))) continue;
  const text = readFileSync(file, "utf8");
  const fenced = fencedLines(text);
  const lines = text.split("\n");
  let m;
  CITE.lastIndex = 0;
  while ((m = CITE.exec(text))) {
    const proseLine = text.slice(0, m.index).split("\n").length;
    if (fenced.has(proseLine)) continue;
    const [, cited, lineText] = m;
    const where = `${path.relative(ROOT, file)}:${proseLine}`;
    checked += 1;

    let target = path.join(ROOT, cited);
    if (!existsSync(target)) {
      // Prose abbreviates: `canon/search/route.ts` is how a reader refers
      // to `src/app/api/canon/search/route.ts`, and that is followable.
      // A suffix that resolves to exactly one file is accepted; one that
      // resolves to several is a finding, because the reader cannot
      // follow it either.
      const matches = SOURCE_TREES.flatMap((t) => bySuffix(path.join(ROOT, t), cited));
      if (matches.length === 0) {
        problems.push({ kind: "missing-file", where, cited, detail: "nothing under src, supabase, scripts, tools or learning ends with that path" });
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

    const sentence = lineAround(text, m.index);
    // A line citing several files gives no way to say which symbol
    // belongs to which, so the symbol check only runs where the mapping
    // is unambiguous. The line and file checks above still run on every
    // citation.
    const citesOnThisLine = (sentence.match(CITE_COUNT) || []).length;
    const symbols = [];
    let s;
    SYMBOL.lastIndex = 0;
    while ((s = SYMBOL.exec(sentence))) {
      const name = s[1];
      // A backticked path or a bare word is not a symbol to look for.
      if (name.includes("/") || /\.(ts|tsx|sql|md)$/.test(name)) continue;
      if (name.length < 3) continue;
      if (GENERIC.has(name.toLowerCase())) continue;
      symbols.push(name);
    }
    if (symbols.length === 0 || citesOnThisLine > 1) continue;

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
console.log(`${checked} code citation(s) checked in ${files.length} prose file(s)`);
for (const kind of ["missing-file", "ambiguous", "out-of-range", "symbol-not-there"]) {
  const rows = byKind(kind);
  if (!rows.length) continue;
  console.log(`\n${kind} (${rows.length}):`);
  for (const p of rows) console.log(`  ${p.where}  ->  ${p.cited}  ${p.detail}`);
}
if (problems.length === 0) console.log("every citation resolves");
process.exit(problems.length ? 1 : 0);
