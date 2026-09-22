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
// One copy of the rule. This file carried its own, character for
// character, beside the one in scan-source.ts.
import { stripComments } from "./research-os/scan-source";
import { GRAPH_UNIQUE_KEYS, orderIsTotal } from "./research-os/graph-keys";

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


/**
 * The statements in a file, as single lines. A PostgREST builder chain
 * can wrap across lines, so the file is flattened first and then split
 * on `;`, which is where one chain ends.
 */
function statements(src: string, options: { keepStrings?: boolean } = {}): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  // A comment may describe these rules or break them, and a
  // docstring naming `.range(` is not a read. They are blanked, keeping
  // the line count so a report still points at the right line.
  const lines = stripComments(src, options).split("\n");
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
  assert.ok(files.some((f) => f.endsWith("read-access.ts")), "read-access.ts is among them");
  assert.ok(files.some((f) => f.endsWith("db.ts")), "db.ts is among them, which is where the page helpers live");
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

/**
 * Every paged read of a `graph` table, with the table it reads, the
 * columns it orders on, and the columns it pins to a single value.
 *
 * A statement is the unit here because one PostgREST chain is one
 * statement. `eq()` pins a column to one value, so that column cannot
 * vary across the result and contributes to the order for free.
 * `in()` hands a list, which pins nothing.
 */
function pagedReads(src: string): { table: string; ordered: string[]; pinned: string[]; line: number }[] {
  const out: { table: string; ordered: string[]; pinned: string[]; line: number }[] = [];
  for (const s of statements(src, { keepStrings: true })) {
    if (!/\.range\(/.test(s.text)) continue;
    const table = s.text.match(/\.from\(\s*["']([a-z_]+)["']\s*\)/);
    if (!table) continue;
    out.push({
      table: table[1],
      ordered: Array.from(s.text.matchAll(/\.order\(\s*["']([a-z_]+)["']/g)).map((m) => m[1]),
      pinned: Array.from(s.text.matchAll(/\.eq\(\s*["']([a-z_]+)["']/g)).map((m) => m[1]),
      line: s.line,
    });
  }
  return out;
}

test("every paged read of a known table carries a total order", () => {
  // Rule 1 above asks only that an order exists. An order that is not
  // total passes it and still repeats and skips rows: graph/route.ts
  // read class_members with `.in("class_id", chunk).order("learner_id")`
  // and satisfied rule 1 while leaving every learner enrolled in two
  // classes of the chunk in a tie group with another. class_members'
  // primary key is (class_id, learner_id).
  const offenders: string[] = [];
  const checked: string[] = [];
  for (const file of files) {
      // keepStrings, because this rule reads which table and which
      // columns the call names.
      for (const r of pagedReads(fs.readFileSync(file, "utf8"))) {
      if (!GRAPH_UNIQUE_KEYS[r.table]) continue;
      checked.push(`${r.table}@${path.relative(root, file)}:${r.line}`);
      if (orderIsTotal(r.table, r.ordered, r.pinned)) continue;
      offenders.push(
        `${path.relative(root, file)}:${r.line} reads ${r.table} ordered on [${r.ordered.join(", ") || "nothing"}] with [${r.pinned.join(", ") || "nothing"}] pinned, and its keys are ${GRAPH_UNIQUE_KEYS[r.table].map((k) => `(${k.join(", ")})`).join(" or ")}`,
      );
    }
  }
  assert.ok(checked.length > 10, `the rule reached ${checked.length} paged reads of known tables`);
  assert.deepEqual(
    offenders,
    [],
    `these paged reads can repeat a row on one page and drop another: ${offenders.join("; ")}`,
  );
});

test("the rule counts an eq-pinned key column and refuses an in-list one", () => {
  // learner_node_state is (learner_id, node_id). Pinning the learner
  // leaves node_id total; handing a list of learners does not.
  assert.equal(orderIsTotal("learner_node_state", ["node_id"], ["learner_id"]), true);
  assert.equal(orderIsTotal("learner_node_state", ["node_id"], []), false);
  assert.equal(orderIsTotal("class_members", ["learner_id"], []), false, "the shape graph/route.ts shipped");
  assert.equal(orderIsTotal("class_members", ["class_id", "learner_id"], []), true);
  assert.equal(orderIsTotal("edges", ["id"], []), true);
  assert.equal(orderIsTotal("edges", ["from_id"], []), false);
  assert.equal(orderIsTotal("some_table_nobody_declared", [], []), true, "an unknown table is out of scope, not a failure");
});
