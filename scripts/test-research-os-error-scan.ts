/**
 * Every read either checks its error, or is listed with the reason a
 * failure and an empty result mean the same thing there.
 *
 * `|| []` is correct on a read that succeeded, because an empty set also
 * arrives as null, so matching text finds nothing useful. What matters
 * is whether anything looks at `error`, which takes parsing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { scanFile, scanTree } from "./research-os/error-scan";
import { ERROR_EXCEPTIONS } from "./research-os/error-allowlist";

// The ingest scripts write the graph the routes read, so a dropped error
// there lands in what every route serves. They are inside the gate.
const ROOTS = ["src/lib/research-os", "src/app/api/research-os", "scripts/research-os"];

test("a read that drops its error is found", () => {
  const found = scanFile("f.ts", `const { data } = await svc.from("nodes").select("id").eq("id", x);`);
  assert.equal(found.length, 1);
});

test("a read that checks its error is not", () => {
  assert.deepEqual(scanFile("f.ts", `const { data, error } = await svc.from("nodes").select("id").eq("id", x);`), []);
});

test("a renamed binding is still checked", () => {
  const ok = scanFile("f.ts", `const { data: rows, error: err } = await svc.from("nodes").select("id");`);
  assert.deepEqual(ok, [], "renaming both is checking both");
  const bad = scanFile("f.ts", `const { data: rows } = await svc.from("nodes").select("id");`);
  assert.equal(bad.length, 1, "renaming only data is still dropping the error");
});

test("a head count binds count rather than data, and is its own concern", () => {
  assert.deepEqual(scanFile("f.ts", `const { count } = await svc.from("nodes").select("id", { head: true });`), []);
});

test("reading .data off an awaited call is the same defect", () => {
  const found = scanFile("f.ts", `const rows = (await svc.from("nodes").select("id")).data ?? [];`);
  assert.equal(found.length, 1);
});

test("something that is not a PostgREST read is left alone", () => {
  assert.deepEqual(scanFile("f.ts", `const { data } = await axios.get("/x");`), []);
});

test("every read that drops its error carries a reason", () => {
  const found = scanTree(ROOTS).map((f) => `${f.file}:${f.line}`);
  const listed = new Set(ERROR_EXCEPTIONS.map((e) => e.at));
  const unlisted = found.filter((f) => !listed.has(f));
  assert.deepEqual(
    unlisted,
    [],
    `these reads drop their error, so a failure becomes an empty result. Check the error, or add an entry to scripts/research-os/error-allowlist.ts saying why a failure and an empty result mean the same thing here: ${unlisted.join(", ")}`,
  );
});

test("the list carries no entry for a read that is already fixed", () => {
  const found = new Set(scanTree(ROOTS).map((f) => `${f.file}:${f.line}`));
  const stale = ERROR_EXCEPTIONS.filter((e) => !found.has(e.at)).map((e) => e.at);
  assert.deepEqual(stale, [], `fixed or moved, so the entry is stale: ${stale.join(", ")}`);
});

test("the untriaged count is recorded, so it can only fall", () => {
  // A ratchet. Triaging an entry, or fixing the read, lowers this. A new
  // untriaged read raises it and fails here, which is the point.
  const untriaged = ERROR_EXCEPTIONS.filter((e) => e.because.startsWith("not yet triaged")).length;
  assert.ok(untriaged <= 27, `untriaged reads went up to ${untriaged}; lower the ceiling in this test when you bring it down`);
});
