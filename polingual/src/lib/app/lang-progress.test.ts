import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyMemory } from "@academy/lang-memory";
import type { LogRow } from "@academy/learn-log";
import { hoursText, langProgress } from "./lang-progress";

const NOW = Date.UTC(2026, 10, 26, 18);
const base = { device_id: "d", tz: "UTC", system_id: "s" };

test("langProgress sums covered input, counts known words and marks 5-minute input days", () => {
  const es = emptyMemory("es");
  es.baseline.cards["es:casa"] = { state: "review", stability: 40, difficulty: 5, lastReview: NOW - 86_400_000, due: NOW + 10 * 86_400_000, reps: 3, lapses: 0 };
  const log: LogRow[] = [
    { ...base, kind: "session", review_id: "s1", reviewed_at: NOW, lang: "es", id: "x", started: NOW - 900_000, ended: NOW, share_target: null, share_real: null, arm: null, units: 1, cards: 0 },
    { ...base, kind: "exposure", review_id: "e1", reviewed_at: NOW - 600_000, lang: "es", item: "i", unit: "u", lemmas_seen: ["casa"], taps: [], seconds: 360, coverage_pred: 0.95, completed: true },
    { ...base, kind: "exposure", review_id: "e2", reviewed_at: NOW - 500_000, lang: "es", item: "i", unit: "u2", lemmas_seen: [], taps: [], seconds: 900, coverage_pred: 0.5, completed: true },
  ];
  es.log = log;
  const out = langProgress([es, emptyMemory("fr")], NOW);
  assert.deepEqual(out.langs, [
    { lang: "es", inputSeconds: 360, inputHours: 0.1, knownWords: 1 },
    { lang: "fr", inputSeconds: 0, inputHours: 0, knownWords: 0 },
  ]);
  assert.deepEqual(out.inputDays, ["2026-11-26"]);
  assert.equal(hoursText(0), "0.0");
  assert.equal(hoursText(12.3), "12.3");
});

test("langProgress counts a cognate held in another studied language at weight 0.5", () => {
  const card = { state: "review" as const, stability: 40, difficulty: 5, lastReview: NOW - 86_400_000, due: NOW + 10 * 86_400_000, reps: 3, lapses: 0 };
  const es = emptyMemory("es");
  es.baseline.cards["es:casa"] = card;
  const fr = emptyMemory("fr");
  fr.baseline.cards["fr:nation"] = card;
  fr.baseline.cards["fr:nom"] = card;
  const index = { nación: { fr: ["nation"] }, nombre: { fr: ["nom"] }, perro: { fr: ["chien"] } };
  assert.deepEqual(langProgress([es, fr], NOW).langs.map((l) => l.knownWords), [1, 2]);
  assert.deepEqual(langProgress([es, fr], NOW, { es: index }).langs.map((l) => l.knownWords), [2, 2]);
});
