import test from "node:test";
import assert from "node:assert/strict";
import { masteredAtomIds } from "../src/lib/research-os/learn-sync";
import { onAcademyMastery } from "../src/lib/research-os/stages";

test("masteredAtomIds reads fused mastery from a stored blob and applies the threshold", () => {
  const data = {
    cards: {
      strong: { state: "review", stability: 400, difficulty: 3, due: 1, lastReview: 1, reps: 9 },
      weak: { state: "review", stability: 1, difficulty: 6, due: 1, lastReview: 1, reps: 1 },
      unstarted: { state: "new" },
    },
    prof: { strong: { theta: 4, n: 9 }, weak: { theta: -2, n: 2 } },
  };
  const ids = masteredAtomIds(data).map((m) => m.id);
  assert.deepEqual(ids, ["strong"]);
  assert.deepEqual(masteredAtomIds(null), []);
  assert.deepEqual(masteredAtomIds({ cards: {} }), []);
});

test("onAcademyMastery lifts access and awareness to understanding and leaves higher stages alone", () => {
  const learn = { atomId: "waves", branch: "02-physics", mastery: 0.8, threshold: 0.7 };
  assert.equal(onAcademyMastery("access", learn).nextStage, "understanding");
  assert.equal(onAcademyMastery("awareness", learn).nextStage, "understanding");
  assert.equal(onAcademyMastery("understanding", learn).nextStage, "understanding");
  assert.equal(onAcademyMastery("internalization", learn).nextStage, "internalization");
  assert.equal(onAcademyMastery("awareness", { ...learn, mastery: 0.5 }).nextStage, "awareness");
  const t = onAcademyMastery("access", learn, "2026-09-16T00:00:00Z");
  assert.equal(t.event.kind, "academy_mastery");
  assert.equal(t.event.atomId, "waves");
  assert.equal(t.event.mastery, 0.8);
  assert.equal(t.event.fromStage, "access");
});
