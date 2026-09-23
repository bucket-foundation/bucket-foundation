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

test("a log line above the empty return does not buy a way out", () => {
  // The branch took a block only when it held exactly one statement, so
  // every repair on this branch, all written as log-then-return, was a
  // shape the gate could no longer see. The house style was the bypass.
  const logged = scanFile(
    "f.ts",
    `async function read() {
       const { data, error } = await svc.from("nodes").select("id");
       if (error) {
         console.error("nodes read failed:", error.message);
         return [];
       }
       return data;
     }`,
  );
  assert.equal(logged.length, 1, "logging is not handling");

  const bare = scanFile(
    "f.ts",
    `async function read() {
       const { data, error } = await svc.from("nodes").select("id");
       if (error) return [];
       return data;
     }`,
  );
  assert.equal(bare.length, 1, "and the one-statement form is the same defect");
});

test("null is the unknown this tree uses, and only counts when the branch throws it away", () => {
  // `if (error) { log; return null; }` in a function answering
  // `number | null` is the repair. Reading it as a defect would have the
  // gate demand the thing it exists to produce.
  const signal = scanFile(
    "f.ts",
    `async function decks(): Promise<number | null> {
       const { data, error } = await svc.from("academy_progress").select("branch");
       if (error) {
         console.error("read failed:", error.message);
         return null;
       }
       return (data ?? []).length;
     }`,
  );
  assert.deepEqual(signal, [], "a null answered after reading the error is the signal");

  // The same null is a drop when the branch never looks at the error.
  const ignored = scanFile(
    "f.ts",
    `async function p() {
       const { data, error } = await svc.from("academy_profiles").select("id").maybeSingle();
       if (error) return null;
       return data;
     }`,
  );
  assert.equal(ignored.length, 1, "a null with the error unread is a drop");

  // And when the same branch answers a miss, which makes an outage and a
  // not-found one value the caller cannot tell apart.
  const conflated = scanFile(
    "f.ts",
    `async function p() {
       const { data, error } = await svc.from("academy_profiles").select("id").maybeSingle();
       if (error || !data) {
         console.error("read failed:", error?.message);
         return null;
       }
       return data;
     }`,
  );
  assert.equal(conflated.length, 1, "a branch shared with a miss conflates the two");
});

test("a bare return leaves a void function and hides nothing", () => {
  const bail = scanFile(
    "f.ts",
    `async function mint(id: string) {
       const { data, error } = await svc.from("ip_metadata").select().eq("research_id", id);
       if (error) {
         console.error("read failed:", error.message);
         return;
       }
       if (data?.length) await mintReadNFT(data[0]);
     }`,
  );
  assert.deepEqual(bail, [], "nothing reaches a caller to be mistaken for a result");
});

/** An entry that says out loud that nobody has read the code yet. */
const UNTRIAGED = /^(UNTRIAGED:|not yet triaged)/i;

test("every reason is substantive, and an unread one says so", () => {
  // The sibling paging gate has carried a reason-shape assertion since
  // six of its reasons were found to have been written from table names
  // without reading the code. This one had none: blanking a `because`
  // to the empty string left the suite green.
  for (const e of ERROR_EXCEPTIONS) {
    assert.ok(e.at.includes("::"), `${e.at} is an anchor, not a line key`);
    assert.ok(e.because.trim().length > 25, `${e.at} carries no reason: "${e.because}"`);
  }
});

test("the untriaged count is a ratchet", () => {
  // 38 of the 43 entries say nobody has read the code they excuse. That
  // number is the debt this branch takes on, and it can only fall.
  // Triaging one means reading the callers and writing what they do with
  // the empty value, which is the work, and this holds the score.
  const untriaged = ERROR_EXCEPTIONS.filter((e) => UNTRIAGED.test(e.because)).length;
  assert.ok(
    untriaged <= 38,
    `${untriaged} entries are untriaged, and the ceiling is 38. Triage one and lower this number; never raise it.`,
  );
});

test("a refusal arm is not an empty result, and an empty one still is", () => {
  // `{ ok: false }` reads as one property whose value is empty, so the
  // every-property test called the refusal arm of a result union an
  // empty result. reviewerScope answers its error that way in two
  // reads, and both failed this gate while answering the error
  // it names. A success arm is `{ ok: true, ... }`, so a read that
  // succeeded cannot produce the refusal and the caller can always tell
  // them apart.
  const refusal = scanFile(
    "f.ts",
    `const { data, error } = await svc.from("nodes").select("id");
     if (error) return { ok: false };`,
  );
  assert.deepEqual(refusal, [], "a discriminated refusal answers the error");

  // The shape the exemption must not widen into: a failure and a
  // successful read that found nothing give the same bytes.
  const hidden = scanFile(
    "f.ts",
    `const { data, error } = await svc.from("nodes").select("id");
     if (error) return { rows: [], total: 0 };`,
  );
  assert.equal(hidden.length, 1, "an object whose every value is empty still hides the failure");

  const stillCaught = scanFile(
    "f.ts",
    `const { data, error } = await svc.from("nodes").select("id");
     if (error) return [];`,
  );
  assert.equal(stillCaught.length, 1, "and so does an empty list");
});
