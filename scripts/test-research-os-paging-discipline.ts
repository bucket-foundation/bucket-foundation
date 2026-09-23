import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { stripComments } from "./research-os/scan-source";
import { GRAPH_UNIQUE_KEYS, orderIsTotal } from "./research-os/graph-keys";

const root = path.join(__dirname, "..");
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


function statements(src: string, options: { keepStrings?: boolean } = {}): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
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

function pagedReads(src: string): { table: string; ordered: string[]; pinned: string[]; line: number }[] {
  const out: { table: string; ordered: string[]; pinned: string[]; line: number }[] = [];
  for (const s of statements(src, { keepStrings: true })) {
    if (!/\.range\(/.test(s.text)) continue;
    const table = s.text.match(/\.from\(\s*["']([a-z0-9_]+)["']\s*\)/);
    if (!table) continue;
    out.push({
      table: table[1],
      ordered: Array.from(s.text.matchAll(/\.order\(\s*["']([a-z0-9_]+)["']/g)).map((m) => m[1]),
      pinned: Array.from(s.text.matchAll(/\.eq\(\s*["']([a-z0-9_]+)["']/g)).map((m) => m[1]),
      line: s.line,
    });
  }
  return out;
}

test("every paged read of a known table carries a total order", () => {
  const offenders: string[] = [];
  const checked: string[] = [];
  for (const file of files) {
      for (const r of pagedReads(fs.readFileSync(file, "utf8"))) {
      if (!GRAPH_UNIQUE_KEYS[r.table]) continue;
      checked.push(`${r.table}@${path.relative(root, file)}:${r.line}`);
      if (orderIsTotal(r.table, r.ordered, r.pinned)) continue;
      offenders.push(
        `${path.relative(root, file)}:${r.line} reads ${r.table} ordered on [${r.ordered.join(", ") || "nothing"}] with [${r.pinned.join(", ") || "nothing"}] pinned, and its keys are ${GRAPH_UNIQUE_KEYS[r.table].map((k) => `(${k.columns.join(", ")})${k.nullable.length ? ` with ${k.nullable.join(", ")} nullable` : ""}`).join(" or ")}`,
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
  assert.equal(orderIsTotal("learner_node_state", ["node_id"], ["learner_id"]), true);
  assert.equal(orderIsTotal("learner_node_state", ["node_id"], []), false);
  assert.equal(orderIsTotal("class_members", ["learner_id"], []), false, "the shape graph/route.ts shipped");
  assert.equal(orderIsTotal("class_members", ["class_id", "learner_id"], []), true);
  assert.equal(orderIsTotal("edges", ["id"], []), true);
  assert.equal(orderIsTotal("edges", ["from_id"], []), false);
  assert.equal(orderIsTotal("some_table_nobody_declared", [], []), true, "an unknown table is out of scope, not a failure");

  assert.equal(orderIsTotal("node_grants", ["node_id", "grantee_id", "role"], []), false, "ordering on a nullable column leaves the nulls in one tie group");
  assert.equal(orderIsTotal("node_grants", ["node_id", "role"], ["grantee_id"]), true, "pinning it with eq excludes the nulls");
  assert.equal(orderIsTotal("node_grants", ["id"], []), true, "and the primary key is total either way");
});

test("the parser reads a column name that carries a digit", () => {
  const one = pagedReads(`
    await svc.from("import_files").select("id").eq("import_id", id).order("created_at").order("sha256").range(0, 99);
  `);
  assert.equal(one.length, 1, "a paged read of a table whose name has a digit is still found");
  assert.deepEqual(one[0].ordered, ["created_at", "sha256"]);
  assert.deepEqual(one[0].pinned, ["import_id"]);
  assert.equal(orderIsTotal(one[0].table, one[0].ordered, one[0].pinned), true);

  const two = pagedReads(`await svc.from("sha256_blobs").select("id").range(0, 99);`);
  assert.equal(two.length, 1, "a table whose name carries a digit is in scope");
  assert.equal(two[0].table, "sha256_blobs");
});
