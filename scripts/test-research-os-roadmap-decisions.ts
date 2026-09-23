/**
 * The roadmap's decision list and `docs/FOUNDER-DECISIONS.md` name the
 * same rows.
 *
 * Declaring one list twice is the first defect in
 * `docs/CRITIC-PROTOCOL.md`, and this pair caught it: the memo gained
 * three rows and `roadmap.ts` did not, so the roadmap reported real
 * decisions as rows that do not exist, and the page showed MVP work as
 * unblocked while the founder's own file said three decisions blocked it.
 *
 * The same defect has two more places to hide: the counts that
 * learning/research-os/ROADMAP.md states, and the AI rows, whose
 * dependencies are also written in their BEADS-PENDING.jsonl records.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { countsByStage, DECISIONS, ROADMAP, roadmapProblems } from "../src/lib/research-os/roadmap";

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

test("the canonical list has no problems", () => {
  assert.deepEqual(roadmapProblems(), []);
});

test("ROADMAP.md states the counts the list has", () => {
  const text = fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ROADMAP.md"), "utf8");
  const m = text.match(/(\d+) items: (\d+) in MVP, (\d+) near-term, (\d+) later\./);
  assert.ok(m, "ROADMAP.md states its counts");
  const c = countsByStage();
  const stage = (s: { open: number; shipped: number }) => s.open + s.shipped;
  assert.deepEqual(
    m!.slice(1).map(Number),
    [ROADMAP.length, stage(c.mvp), stage(c.near), stage(c.later)],
    "the counts in ROADMAP.md match roadmap.ts",
  );
});

test("each AI row depends on what its pending bead record names", () => {
  const pending = fs.readFileSync(path.join(__dirname, "..", "BEADS-PENDING.jsonl"), "utf8");
  const records: { key: string; deps: string[] }[] = [];
  for (const line of pending.split("\n")) {
    if (!line.trim()) continue;
    const o = JSON.parse(line) as { source?: string; title?: string; description?: string };
    if (o.source !== "research-os-ai" || !o.title) continue;
    const key = o.title.split(": ")[0];
    // The epic is the row's epic field, and ros-ai-roadmap is this list itself.
    if (key === "ros-ai" || key === "ros-ai-roadmap") continue;
    const m = /(?:^|\s)Depends on:\s*(.+?)\.(?:\s|$)/.exec(o.description ?? "");
    const deps = (m ? m[1].split(",") : []).map((d) => d.trim()).filter((d) => d && d !== "none" && !/^PR #\d+/.test(d));
    records.push({ key, deps });
  }
  assert.equal(records.length, 10, "the ten AI work records");
  for (const r of records) {
    const item = ROADMAP.find((i) => i.id === r.key);
    assert.ok(item, `${r.key} is a roadmap row`);
    assert.equal(item!.epic, "ai");
    assert.deepEqual([...item!.dependsOn].sort(), [...r.deps].sort(), `${r.key} depends on what its record names`);
  }
});
