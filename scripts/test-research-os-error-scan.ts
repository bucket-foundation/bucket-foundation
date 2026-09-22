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
import { ALLOWED_BASELINE } from "./research-os/error-allowlist-baseline";

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
  // The set is what binds here. Three ceilings by equality closed the free
  // addition, and a swap walked straight through: repair one trivial
  // lookup, add one new dropped read, reuse the bucket wording, and
  // every test stayed green. A read that is not in the baseline cannot
  // be allowlisted without editing the baseline, which is a line in a
  // diff whose only purpose is to be that.
  const listed = ERROR_EXCEPTIONS.map((e) => e.at).sort();
  const baseline = new Set(ALLOWED_BASELINE);
  const added = listed.filter((a) => !baseline.has(a));
  assert.deepEqual(
    added,
    [],
    `these reads are allowlisted and are not in the baseline. Repair the read, or add it to error-allowlist-baseline.ts and say why in the review: ${added.join(", ")}`,
  );

  // And it shrinks. A repaired read leaves the list, and the baseline
  // follows it down so the ground cannot be given back.
  const gone = ALLOWED_BASELINE.filter((a) => !listed.includes(a));
  assert.deepEqual(
    gone,
    [],
    `these baseline reads are no longer allowlisted, which means they were repaired. Remove them from error-allowlist-baseline.ts: ${gone.join(", ")}`,
  );
});
