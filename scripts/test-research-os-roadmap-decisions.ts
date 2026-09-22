/**
 * The roadmap's decision list and `docs/FOUNDER-DECISIONS.md` name the
 * same rows.
 *
 * Declaring one list twice is the first defect in
 * `docs/CRITIC-PROTOCOL.md`, and this pair caught it: the memo gained
 * three rows and `roadmap.ts` did not, so the roadmap reported real
 * decisions as rows that do not exist, and the page showed MVP work as
 * unblocked while the founder's own file said three decisions blocked it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DECISIONS, ROADMAP } from "../src/lib/research-os/roadmap";

const MEMO = path.join(__dirname, "..", "docs", "FOUNDER-DECISIONS.md");

/** The FD ids the memo carries, in the order it lists them. */
function memoIds(): string[] {
  const text = fs.readFileSync(MEMO, "utf8");
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*\|\s*(FD-\d+)\s*\|/);
    if (m) out.push(m[1]);
  }
  return out;
}

test("the memo is readable and lists rows", () => {
  assert.ok(fs.existsSync(MEMO), "docs/FOUNDER-DECISIONS.md exists");
  assert.ok(memoIds().length >= 8, `the memo lists its rows: found ${memoIds().length}`);
});

test("every decision the roadmap knows is a row of the memo", () => {
  const rows = memoIds();
  const unknown = DECISIONS.filter((d) => rows.indexOf(d) === -1);
  assert.deepEqual(unknown, [], `the roadmap names decisions the memo does not carry: ${unknown.join(", ")}`);
});

test("every row of the memo is a decision the roadmap knows", () => {
  const missing = memoIds().filter((d) => DECISIONS.indexOf(d) === -1);
  assert.deepEqual(
    missing,
    [],
    `the memo carries decisions the roadmap has never heard of, so a blockedBy on one would read as a typo: ${missing.join(", ")}`,
  );
});

test("no roadmap item is blocked by a decision that does not exist", () => {
  const rows = memoIds();
  const bad: string[] = [];
  for (const item of ROADMAP) {
    for (const d of item.blockedBy ?? []) {
      if (rows.indexOf(d) === -1) bad.push(`${item.id} waits on ${d}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("; "));
});
