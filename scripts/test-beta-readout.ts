import test from "node:test";
import assert from "node:assert/strict";
import { newcombe, proportion, readoutExperiment, wilson } from "../src/lib/beta/readout";
import type { AssignmentRow } from "../src/lib/beta/experiment-registry";
import type { BetaTester, StoredBetaEvent } from "../src/lib/beta/store";

const DAY = 86_400_000;
const NOW = new Date("2026-10-25T12:00:00Z");
const EXP = { key: "new_words", arms: ["4", "8"], fallback: "4" } as const;
const iso = (dayOffset: number) => new Date(NOW.getTime() + dayOffset * DAY).toISOString();

function close(a: number, b: number, eps = 1e-4) {
  assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
}

test("wilson matches reference values", () => {
  const ci = wilson(81, 263)!;
  close(ci.lo, 0.2553, 1e-3);
  close(ci.hi, 0.3662, 1e-3);
  const zero = wilson(0, 10)!;
  assert.equal(zero.lo, 0);
  close(zero.hi, 0.2775, 1e-3);
  assert.equal(wilson(0, 0), null);
});

test("newcombe hybrid matches Newcombe 1998 example", () => {
  const d = newcombe(proportion(56, 70), proportion(48, 80), "b");
  close(d.diff!, 0.2);
  close(d.ci!.lo, 0.0524, 1e-3);
  close(d.ci!.hi, 0.3339, 1e-3);
});

interface Synth {
  testers: BetaTester[];
  events: StoredBetaEvent[];
  assignments: AssignmentRow[];
}

function synth(): Synth {
  const s: Synth = { testers: [], events: [], assignments: [] };
  let n = 0;
  const add = (arm: string, assignedOffset: number, plan: (d: number) => { active: boolean; correct: number; wrong: number }) => {
    const userId = `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;
    s.testers.push({ userId, cohort: "wave1", firstApp: "polingual", optedOut: false, enrolledAt: iso(assignedOffset) });
    s.assignments.push({ userId, experiment: EXP.key, arm, source: "hash", cohort: "wave1", assignedAt: iso(assignedOffset) });
    for (const d of [1, 7, 30]) {
      const p = plan(d);
      if (!p.active) continue;
      const ts = iso(assignedOffset + d);
      s.events.push({ userId, app: "polingual", name: "app_open", sessionId: null, ts, props: {} });
      for (let i = 0; i < p.correct; i++) s.events.push({ userId, app: "polingual", name: "card_answered", sessionId: null, ts, props: { correct: true } });
      for (let i = 0; i < p.wrong; i++) s.events.push({ userId, app: "polingual", name: "card_answered", sessionId: null, ts, props: { correct: false } });
    }
  };
  for (let i = 0; i < 100; i++) add("4", -40, () => ({ active: i < 50, correct: 6, wrong: 4 }));
  for (let i = 0; i < 100; i++) add("8", -40, () => ({ active: i < 70, correct: 8, wrong: 2 }));
  for (let i = 0; i < 20; i++) add("8", -3, () => ({ active: true, correct: 10, wrong: 0 }));
  return s;
}

test("known rates come back per arm and window", () => {
  const { testers, events, assignments } = synth();
  const r = readoutExperiment(EXP, testers, events, assignments, NOW);
  assert.equal(r.control, "4");
  const [ctl, trt] = r.arms;
  assert.equal(ctl.isControl, true);
  for (const w of ctl.windows) {
    assert.equal(w.eligibleUsers, 100);
    assert.equal(w.retention.rate, 0.5);
    close(w.recall.rate!, 0.6);
    assert.equal(w.retention.vsControl, null);
  }
  for (const w of trt.windows.filter((x) => x.day !== 1)) {
    close(w.retention.rate!, 0.7);
    close(w.recall.rate!, 0.8);
    close(w.retention.vsControl!.diff!, 0.2);
    close(w.recall.vsControl!.diff!, 0.2);
    assert.ok(w.retention.vsControl!.ci!.lo > 0);
    assert.ok(w.retention.ci!.lo < 0.7 && w.retention.ci!.hi > 0.7);
  }
});

test("users younger than N days are censored from the D-N denominator", () => {
  const { testers, events, assignments } = synth();
  const trt = readoutExperiment(EXP, testers, events, assignments, NOW).arms[1];
  const byDay = Object.fromEntries(trt.windows.map((w) => [w.day, w]));
  assert.equal(byDay[1].eligibleUsers, 120);
  assert.equal(byDay[1].censoredUsers, 0);
  close(byDay[1].retention.rate!, 90 / 120);
  close(byDay[1].recall.rate!, 760 / 900);
  assert.equal(byDay[7].eligibleUsers, 100);
  assert.equal(byDay[7].censoredUsers, 20);
  assert.equal(byDay[30].censoredUsers, 20);
  assert.equal(trt.users, 120);
});

test("opted-out users and empty arms produce no rates", () => {
  const { testers, events, assignments } = synth();
  const out = testers.map((t) => ({ ...t, optedOut: true }));
  const r = readoutExperiment(EXP, out, events, assignments, NOW);
  for (const a of r.arms) for (const w of a.windows) {
    assert.equal(w.retention.rate, null);
    assert.equal(w.recall.ci, null);
  }
  assert.equal(r.arms[1].windows[0].retention.vsControl!.ci, null);
});
