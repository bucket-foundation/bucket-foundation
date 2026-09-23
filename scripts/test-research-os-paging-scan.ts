import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { scanFile, scanTree } from "./research-os/paging-scan";
import { PAGING_EXCEPTIONS } from "./research-os/paging-allowlist";

const ROOTS = ["src/lib/research-os", "src/app/api/research-os", "scripts/research-os"];

test("the scanner finds a read that pages neither way", () => {
  const src = `
    const svc = client();
    const rows = await svc.from("nodes").select("id").in("id", ids);
  `;
  const found = scanFile("fixture.ts", src);
  assert.equal(found.length, 1, "one finding");
  assert.deepEqual(found[0].reasons.length, 2, "no range and no order");
});

test("a literal list is bounded by the source, so it is not a finding", () => {
  const src = `const r = await svc.from("class_members").select("x").in("role", ["teacher", "librarian"]);`;
  assert.deepEqual(scanFile("fixture.ts", src), [], "a two-element literal cannot overflow");
});

test("a paged read is not a finding", () => {
  const src = `const r = await svc.from("nodes").select("id").in("id", ids).order("id").range(0, 999);`;
  assert.deepEqual(scanFile("fixture.ts", src), []);
});

test("a read that ranges without ordering is still a finding", () => {
  const found = scanFile("fixture.ts", `const r = await svc.from("nodes").select("id").in("id", ids).range(0, 999);`);
  assert.equal(found.length, 1);
  assert.match(found[0].reasons.join(" "), /order/);
});

test("a sibling read cannot satisfy the rule for an unordered one", () => {
  const src = `
    const [a, b] = await Promise.all([
      svc.from("nodes").select("id").in("id", ids).order("id").range(0, 999),
      svc.from("edges").select("id").in("from_id", ids).range(0, 999),
    ]);
  `;
  const found = scanFile("fixture.ts", src);
  assert.equal(found.length, 1, "the unordered sibling is found on its own");
  assert.match(found[0].reasons.join(" "), /order/);
});

test("a builder behind a local function is still seen", () => {
  const src = `
    function readChunk(svc, chunk) {
      return svc.from("learner_node_state").select("node_id").in("node_id", chunk);
    }
    const rows = await inChunks(ids, (chunk) => readChunk(svc, chunk));
  `;
  const found = scanFile("fixture.ts", src);
  assert.equal(found.length, 1, "the chain inside the helper is the read");
});

test("a single-row read needs no paging", () => {
  const src = `const r = await svc.from("nodes").select("id").in("id", ids).maybeSingle();`;
  assert.deepEqual(scanFile("fixture.ts", src), []);
});

test("every unpaged read in the tree carries a reason", () => {
  const found = scanTree(ROOTS).map((f) => f.anchor);
  const listed = new Set(PAGING_EXCEPTIONS.map((e) => e.at));
  const unlisted = found.filter((f) => !listed.has(f));
  assert.deepEqual(
    unlisted,
    [],
    `these reads filter on a list of ids and neither page nor carry a reason. Page them, or add an entry to scripts/research-os/paging-allowlist.ts saying why the row count cannot pass a thousand: ${unlisted.join(", ")}`,
  );
});

test("the list carries no entry for a read that is already fixed", () => {
  const found = new Set(scanTree(ROOTS).map((f) => f.anchor));
  const stale = PAGING_EXCEPTIONS.filter((e) => !found.has(e.at)).map((e) => e.at);
  assert.deepEqual(stale, [], `paged or moved, so the entry is stale and should go: ${stale.join(", ")}`);
});

test("a reason either names what bounds the read, or says it is untriaged", () => {
  const grounded = /primary key|unique|pinned with eq|by construction/;
  for (const e of PAGING_EXCEPTIONS) {
    assert.ok(e.at.includes("::"), `${e.at} is an anchor, not a line key`);
    assert.ok(
      e.because.startsWith("UNTRIAGED:") || grounded.test(e.because),
      `${e.at} claims a bound without naming one: "${e.because}"`,
    );
  }
});

test("the untriaged count is a ratchet", () => {
  const untriaged = PAGING_EXCEPTIONS.filter((e) => e.because.startsWith("UNTRIAGED:")).length;
  assert.ok(untriaged <= 6, `untriaged reads rose to ${untriaged}; lower this ceiling when you bring it down`);
});
