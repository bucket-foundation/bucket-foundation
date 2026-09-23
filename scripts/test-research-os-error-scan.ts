import test from "node:test";
import assert from "node:assert/strict";
import { scanFile, scanTree } from "./research-os/error-scan";
import { ERROR_EXCEPTIONS } from "./research-os/error-allowlist";
import { ALLOWED_BASELINE } from "./research-os/error-allowlist-baseline";

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
  const listed = ERROR_EXCEPTIONS.map((e) => e.at).sort();
  const baseline = new Set(ALLOWED_BASELINE);
  const added = listed.filter((a) => !baseline.has(a));
  assert.deepEqual(
    added,
    [],
    `these reads are allowlisted and are not in the baseline. Repair the read, or add it to error-allowlist-baseline.ts and say why in the review: ${added.join(", ")}`,
  );

  const gone = ALLOWED_BASELINE.filter((a) => !listed.includes(a));
  assert.deepEqual(
    gone,
    [],
    `these baseline reads are no longer allowlisted, which means they were repaired. Remove them from error-allowlist-baseline.ts: ${gone.join(", ")}`,
  );
});

test("a log line above the empty return does not buy a way out", () => {
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

  const ignored = scanFile(
    "f.ts",
    `async function p() {
       const { data, error } = await svc.from("academy_profiles").select("id").maybeSingle();
       if (error) return null;
       return data;
     }`,
  );
  assert.equal(ignored.length, 1, "a null with the error unread is a drop");

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

const UNTRIAGED = /^(UNTRIAGED:|not yet triaged)/i;

test("every reason is substantive, and an unread one says so", () => {
  for (const e of ERROR_EXCEPTIONS) {
    assert.ok(e.at.includes("::"), `${e.at} is an anchor, not a line key`);
    assert.ok(e.because.trim().length > 25, `${e.at} carries no reason: "${e.because}"`);
  }
});

test("the untriaged count is a ratchet", () => {
  const untriaged = ERROR_EXCEPTIONS.filter((e) => UNTRIAGED.test(e.because)).length;
  assert.ok(
    untriaged <= 38,
    `${untriaged} entries are untriaged, and the ceiling is 38. Triage one and lower this number; never raise it.`,
  );
});

test("a refusal arm is not an empty result, and an empty one still is", () => {
  const refusal = scanFile(
    "f.ts",
    `const { data, error } = await svc.from("nodes").select("id");
     if (error) return { ok: false };`,
  );
  assert.deepEqual(refusal, [], "a discriminated refusal answers the error");

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
