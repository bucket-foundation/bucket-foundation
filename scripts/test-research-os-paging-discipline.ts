/**
 * Two paging rules for a read filtered by a list of ids, checked against
 * the source so they hold for reads no test happens to exercise. No
 * database needed.
 *
 * These rules cover the reads they can see. A raw `.in(ids)` read that
 * uses no chunk helper is invisible to both of them, and so is a builder
 * hidden behind a local function. A green run is the absence of these
 * two shapes, and nothing more.
 *
 * 1. A read that pages carries an order. Postgres gives no stable row
 *    order across LIMIT and OFFSET without one, so a page boundary
 *    landing inside a tie group can repeat one row and skip another.
 * 2. A read filtered by a chunked id list pages. Chunking bounds the
 *    request line and says nothing about PostgREST's thousand-row cap,
 *    so an unpaged chunked read returns a prefix with no error.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
// The ingest scripts write the graph the routes then read, so a read
// there that stops at the row cap corrupts what every route serves. They
// are inside the gate for that reason.
const ROOTS = [path.join(root, "src/lib/research-os"), path.join(root, "src/app/api/research-os"), path.join(root, "scripts/research-os")];

function sources(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Comments blanked, newlines kept, so line numbers still line up. */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  let mode: "code" | "line" | "block" | "single" | "double" | "tick" = "code";
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (mode === "code") {
      if (two === "//") { mode = "line"; out += "  "; i += 2; continue; }
      if (two === "/*") { mode = "block"; out += "  "; i += 2; continue; }
      if (src[i] === "'") mode = "single";
      else if (src[i] === '"') mode = "double";
      else if (src[i] === "`") mode = "tick";
      out += src[i]; i += 1; continue;
    }
    if (mode === "line") {
      if (src[i] === "\n") { mode = "code"; out += "\n"; } else out += " ";
      i += 1; continue;
    }
    if (mode === "block") {
      if (two === "*/") { mode = "code"; out += "  "; i += 2; continue; }
      out += src[i] === "\n" ? "\n" : " "; i += 1; continue;
    }
    // Inside a string: blank the contents, keep the quotes and the
    // newlines. A `.range(` inside an error message is not a read.
    if (src[i] === "\\") { out += "  "; i += 2; continue; }
    if ((mode === "single" && src[i] === "'") || (mode === "double" && src[i] === '"') || (mode === "tick" && src[i] === "`")) {
      mode = "code";
      out += src[i]; i += 1; continue;
    }
    out += src[i] === "\n" ? "\n" : " "; i += 1;
  }
  return out;
}

/**
 * The statements in a file, as single lines. A PostgREST builder chain
 * can wrap across lines, so the file is flattened first and then split
 * on `;`, which is where one chain ends.
 */
function statements(src: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  // A comment may describe these rules or break them, and a
  // docstring naming `.range(` is not a read. They are blanked, keeping
  // the line count so a report still points at the right line.
  const lines = stripComments(src).split("\n");
  let buf = "";
  let start = 1;
  for (let i = 0; i < lines.length; i += 1) {
    if (buf === "") start = i + 1;
    buf += " " + lines[i].trim();
    if (lines[i].trim().endsWith(";")) {
      out.push({ text: buf.replace(/\s+/g, " "), line: start });
      buf = "";
    }
  }
  if (buf.trim()) out.push({ text: buf.replace(/\s+/g, " "), line: start });
  return out;
}

const files = ROOTS.flatMap(sources);

test("the checker is looking at the files it is meant to police", () => {
  assert.ok(files.length > 20, `found ${files.length} Research OS sources`);
  assert.ok(
    files.some((f) => f.endsWith("db.ts")),
    "db.ts is among them, which is where the page helpers live",
  );
});

test("every paged read carries an order", () => {
  const offenders: string[] = [];
  for (const file of files) {
    for (const s of statements(fs.readFileSync(file, "utf8"))) {
      if (!/\.range\(/.test(s.text)) continue;
      if (/\.order\(/.test(s.text)) continue;
      offenders.push(`${path.relative(root, file)}:${s.line}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these reads page without an order, so a page boundary can repeat and skip rows: ${offenders.join(", ")}`,
  );
});

/** Each call to one of the page helpers, as its whole balanced-paren call. */
function pagedCalls(src: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const call = /\b(inChunks|inLearnerChunks|pagedRead)\s*[<(]/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(src))) {
    let i = src.indexOf("(", m.index + m[0].length - 1);
    if (i === -1) continue;
    let depth = 0;
    let end = i;
    for (; end < src.length; end += 1) {
      if (src[end] === "(") depth += 1;
      else if (src[end] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push({ text: src.slice(i, end + 1).replace(/\s+/g, " "), line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

test("every read filtered by a chunked id list pages", () => {
  // A chunk callback holds several statements, so the whole call is read
  // as one region: the `.from(` and the `.range(` can sit in different
  // statements inside the same callback.
  const offenders: string[] = [];
  for (const file of files) {
    for (const c of pagedCalls(stripComments(fs.readFileSync(file, "utf8")))) {
      if (!/\.from\(/.test(c.text)) continue;
      if (/\.range\(/.test(c.text)) continue;
      offenders.push(`${path.relative(root, file)}:${c.line}`);
    }
  }
  assert.deepEqual(offenders, [], `these chunked reads never page: ${offenders.join(", ")}`);
});
