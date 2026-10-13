import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const ENGINE = "_intake/solver-gap-engine";
const backtest = JSON.parse(read(`${ENGINE}/backtest/backtest.json`));
const snapshots = backtest.snapshots;
const fixed = (n) => n.toFixed(3);
const series = (items) => `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
const sentence = `AUC ${series(snapshots.map((s) => fixed(s.auc)))} at the snapshots of ${series(snapshots.map((s) => s.date))}, where 0.5 is chance`;
const tag = `[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 backtest.py --repo fc-history.git --head 137aec5c]`;

const whatsNew = JSON.parse(read("data/whats-new.json"));
const entry = whatsNew.entries.find((e) => e.category === "production" && e.title === "Solver gap engine");
const COPIES = {
  "reports/2026-09-30-solver-gap-engine.md": read("reports/2026-09-30-solver-gap-engine.md"),
  [`${ENGINE}/README.md`]: read(`${ENGINE}/README.md`),
  "data/whats-new.json discussion": entry.discussion,
};

test("the backtest head matches the commit the source tag names", () => {
  assert.ok("137aec5c".startsWith(backtest.head));
  assert.equal(snapshots.length, 4);
});

test("every prose copy quotes the AUC values in backtest.json with the source tag", () => {
  for (const [name, text] of Object.entries(COPIES)) {
    assert.ok(text.includes(`${sentence} ${tag}`), `${name} must contain: ${sentence} ${tag}`);
  }
});

test("BACKTEST.md carries one table row per snapshot with the values in backtest.json", () => {
  const doc = read(`${ENGINE}/BACKTEST.md`);
  for (const s of snapshots) {
    const row = `| ${s.date} | ${s.tracked.toLocaleString("en-US")} | ${s.solved_later} | ${fixed(s.auc)} | ${fixed(s.auc_ci95[0])} to ${fixed(s.auc_ci95[1])} | ${fixed(s.p_permutation)} | ${fixed(s.auc_within_collection)} | ${fixed(s.auc_docstring_length)} |`;
    assert.ok(doc.includes(row), `BACKTEST.md must contain: ${row}`);
  }
});

test("no copy calls the backtest unmerged or sends high scores to a prover", () => {
  const texts = { ...COPIES, [`${ENGINE}/IDEAS.md`]: read(`${ENGINE}/IDEAS.md`), "data/whats-new.json links": JSON.stringify(entry.links) };
  for (const [name, text] of Object.entries(texts)) {
    assert.doesNotMatch(text, /unmerged/i, name);
    assert.doesNotMatch(text, /prover on the top|marks candidates to hand to a prover|worth handing to a prover/i, name);
  }
});
