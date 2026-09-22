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
// The whole of src and scripts. The narrower roots left three live
// dropped reads outside the gate, one of them serving a credential
// verification an empty progress list as though it were the answer.
const ROOTS = ["src", "scripts"];

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
  const found = scanTree(ROOTS).map((f) => f.anchor);
  const listed = new Set(ERROR_EXCEPTIONS.map((e) => e.at));
  const unlisted = found.filter((f) => !listed.has(f));
  assert.deepEqual(
    unlisted,
    [],
    `these reads drop their error, so a failure becomes an empty result. Check the error, or add an entry to scripts/research-os/error-allowlist.ts saying why a failure and an empty result mean the same thing here: ${unlisted.join(", ")}`,
  );
});

test("the list carries no entry for a read that is already fixed", () => {
  const found = new Set(scanTree(ROOTS).map((f) => f.anchor));
  const stale = ERROR_EXCEPTIONS.filter((e) => !found.has(e.at)).map((e) => e.at);
  assert.deepEqual(stale, [], `fixed or moved, so the entry is stale: ${stale.join(", ")}`);
});

test("the list can only get shorter", () => {
  // Three ratchets, and the total is the one that binds. Pinning the two
  // worded buckets alone let a new entry launder itself into neither by
  // choosing different prose: a critic added a live dropped read with an
  // entry worded "a maybeSingle lookup whose miss and whose failure both
  // mean carry on without it" and all nine tests stayed green. The total
  // has no third bucket to escape into, so a new entry now has to remove
  // an old one.
  const TOTAL_CEILING = 51;
  const UNTRIAGED_CEILING = 17;
  const EMPTY_GUARD_CEILING = 27;

  const emptyGuard = ERROR_EXCEPTIONS.filter((e) => e.because.startsWith("not yet triaged, empty-guard")).length;
  const untriaged = ERROR_EXCEPTIONS.filter((e) => e.because.startsWith("not yet triaged") && !e.because.startsWith("not yet triaged, empty-guard")).length;

  for (const [name, count, ceiling] of [
    ["entries", ERROR_EXCEPTIONS.length, TOTAL_CEILING],
    ["untriaged reads", untriaged, UNTRIAGED_CEILING],
    ["empty-guard reads", emptyGuard, EMPTY_GUARD_CEILING],
  ] as [string, number, number][]) {
    assert.ok(count <= ceiling, `${name} went up to ${count}, above the ceiling of ${ceiling}. Repair the read rather than raising this number.`);
    assert.equal(count, ceiling, `${name} are down to ${count}. Lower the ceiling to ${count} so the ground that was won cannot be given back.`);
  }
});
