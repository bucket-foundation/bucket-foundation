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
  // A ratchet, and it only ratchets when the ceiling is the count. It was
  // written at 27 against a list holding 19, so eight new untriaged reads
  // could be added without failing anything, which a critic proved by
  // adding one. The ceiling is the current number, and lowering it is the
  // only edit this line ever takes.
  // Two ceilings, because the scanner learned a second shape and a new
  // rule's backlog must not be able to hide inside the old rule's. The
  // dropped-error count is the one the branch started from; the
  // empty-guard count is what the new rule found on its first run.
  const UNTRIAGED_CEILING = 17;
  const EMPTY_GUARD_CEILING = 31;
  const emptyGuard = ERROR_EXCEPTIONS.filter((e) => e.because.startsWith("not yet triaged, empty-guard")).length;
  assert.ok(
    emptyGuard <= EMPTY_GUARD_CEILING,
    `empty-guard reads went up to ${emptyGuard}, above the ceiling of ${EMPTY_GUARD_CEILING}. Triage the read rather than raising this number.`,
  );
  assert.equal(
    emptyGuard,
    EMPTY_GUARD_CEILING,
    `empty-guard reads are down to ${emptyGuard}. Lower EMPTY_GUARD_CEILING to ${emptyGuard}.`,
  );
  const untriaged = ERROR_EXCEPTIONS.filter((e) => e.because.startsWith("not yet triaged") && !e.because.startsWith("not yet triaged, empty-guard")).length;
  assert.ok(
    untriaged <= UNTRIAGED_CEILING,
    `untriaged reads went up to ${untriaged}, above the ceiling of ${UNTRIAGED_CEILING}. Triage the read rather than raising this number.`,
  );
  assert.equal(
    untriaged,
    UNTRIAGED_CEILING,
    `untriaged reads are down to ${untriaged}. Lower UNTRIAGED_CEILING to ${untriaged} so the ground that was won cannot be given back.`,
  );
});
