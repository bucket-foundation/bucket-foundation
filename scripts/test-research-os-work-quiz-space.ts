import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkLimits } from "../src/lib/research-os/work-quiz/limits";
import { gradeAnswer } from "../src/lib/research-os/work-quiz/grade";
import { BLOCKED_FORMS, DEPTHS, FORMATS, FORMS, VALID_PAIRS, allCells, cellValid, openCells, validPair, validPairs, type Form } from "../src/lib/research-os/work-quiz/space";
import { CARD_KEY_SEPARATOR, cardFields, compoundFactId, cardKey, factId, factsFromSources, parseCardKey } from "../src/lib/research-os/work-quiz/fact";
import { ESTIMATE_LOG10, FORM_MAKERS, estimateFactor, makeForm, sampledId } from "../src/lib/research-os/work-quiz/forms";
import type { WorkSources } from "../src/lib/research-os/work-quiz/types";

const TITLES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures/quiz-titles.json"), "utf8")) as { prs: string[]; beads: string[] };
const SEEDS = 200;
const STATUSES = ["open", "closed", "in_progress", "deferred"];
const day = (i: number) => new Date(Date.UTC(2026, 8, 1 + Math.floor(i / 4))).toISOString().slice(0, 10);

const SOURCES: WorkSources = {
  repoUrl: "https://github.com/example/repo",
  prs: TITLES.prs.map((title, i) => ({ number: 400 + i, title: `${title} (#${400 + i})`, date: day(i), order: i })),
  beads: TITLES.beads.map((title, i) => ({ id: `bkt-f${i.toString(36)}`, title, status: STATUSES[i % STATUSES.length], priority: i % 5, createdAt: day(i) })),
  notes: [
    { file: "_intake/ideas/IDEAS-2026-09-18.md", heading: "Swipe breaks between reading sessions", date: "2026-09-18" },
    { file: "_intake/ideas/IDEAS-2026-09-20.md", heading: "A work quiz during the day", date: "2026-09-20" },
  ],
};

test("the space has nine forms, four formats, three depths and eleven valid form-format pairs", () => {
  assert.equal(FORMS.length, 9);
  assert.equal(FORMATS.length, 4);
  assert.equal(DEPTHS.length, 3);
  assert.deepEqual(
    validPairs().map(([f, fmt]) => `${f}:${fmt}`).sort(),
    ["cause_effect:pick", "cloze:pick", "cloze:word", "compare:pick", "estimate:number", "order:order", "recall:pick", "recall:word", "spot_error:pick", "true_false:pick", "which_changed:pick"],
  );
  assert.equal(allCells().length, 33);
  for (const f of FORMS) for (const fmt of FORMATS) assert.equal(validPair(f, fmt), VALID_PAIRS[f].includes(fmt));
  assert.equal(validPair("estimate", "pick"), false);
  assert.equal(validPair("order", "pick"), false);
});

test("invalid cells: estimate without a count, order under three dated facts, compare across kinds, which_changed blocked", () => {
  const none = { counts: 0, dated: 0, datedByKind: {} };
  assert.equal(cellValid({ form: "estimate", format: "number", depth: 1 }, none), false);
  assert.equal(cellValid({ form: "estimate", format: "number", depth: 1 }, { ...none, counts: 1 }), true);
  assert.equal(cellValid({ form: "order", format: "order", depth: 2 }, { counts: 0, dated: 4, datedByKind: { pr: 2, note: 2 } }), false);
  assert.equal(cellValid({ form: "order", format: "order", depth: 2 }, { counts: 0, dated: 3, datedByKind: { pr: 3 } }), true);
  assert.equal(cellValid({ form: "compare", format: "pick", depth: 1 }, { counts: 0, dated: 2, datedByKind: { pr: 1, note: 1 } }), false);
  assert.equal(cellValid({ form: "which_changed", format: "pick", depth: 1 }, { counts: 9, dated: 9, datedByKind: { pr: 9 } }), false);
  assert.ok(BLOCKED_FORMS.which_changed);
  assert.equal(openCells({ counts: 9, dated: 9, datedByKind: { pr: 9 } }).some((c) => c.form === "which_changed"), false);
});

test("facts carry kind:ref ids and cards key on fact.id|form", () => {
  const facts = factsFromSources(SOURCES);
  assert.equal(facts.length, SOURCES.prs.length + SOURCES.beads.length + SOURCES.notes.length);
  assert.equal(facts[0].id, "pr:400");
  assert.equal(factId("bead", "bkt-33cg"), "bead:bkt-33cg");
  assert.equal(cardKey(facts[0], "order"), "pr:400|order");
  assert.equal(cardKey("note:a.md#b", "compare"), `note:a.md#b${CARD_KEY_SEPARATOR}compare`);
  assert.deepEqual(parseCardKey("bead:bkt-33cg|true_false"), { factId: "bead:bkt-33cg", form: "true_false" });
  assert.throws(() => cardKey("a|b", "recall"));
  for (const f of facts) assert.equal(f.id.includes(CARD_KEY_SEPARATOR), false);
});

test("the Supabase migration builds the card key the same way as cardKey", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261001150000_research_os_work_quiz_card_key.sql"), "utf8");
  assert.match(sql, /p_fact_id \|\| '\|' \|\| p_form/);
  assert.match(sql, /unique index if not exists graph_work_quiz_cards_card_key_idx on graph\.work_quiz_cards \(learner_id, card_key\)/);
  assert.equal(cardKey("pr:504", "estimate"), ["pr:504", "estimate"].join("|"));
});

const BUILT: Form[] = ["true_false", "estimate", "compare", "order"];

for (const form of BUILT) {
  test(`${form}: ${SEEDS} seeds per depth, every question passes checkLimits and grades on an existing grader`, () => {
    let made = 0;
    for (const depth of DEPTHS) {
      for (let s = 0; s < SEEDS; s++) {
        const q = makeForm(form, SOURCES, `space-${form}-${depth}-${s}`, depth);
        if (!q) continue;
        made += 1;
        assert.deepEqual(checkLimits(q), [], `${form} seed ${s}: ${q.prompt} ${q.lines.join(" / ")}`);
        assert.equal(q.form, form);
        assert.equal(q.cardKey, cardKey(compoundFactId(q.factIds), form));
        assert.equal(q.id, sampledId(form, q.factIds, depth));
        assert.equal(gradeAnswer(q, q.answer, 1000).correct, true);
        if (q.choices) assert.ok(q.choices.includes(q.answer));
      }
    }
    assert.ok(made >= SEEDS, `${form} made ${made} questions`);
  });
}

test("the same seed yields a deep-equal question for every built form, depth and seed", () => {
  let made = 0;
  for (const form of BUILT) {
    for (const depth of DEPTHS) {
      for (let s = 0; s < 50; s++) {
        const a = makeForm(form, SOURCES, `same-${s}`, depth);
        assert.deepEqual(makeForm(form, SOURCES, `same-${s}`, depth), a, `${form} ${depth} ${s}`);
        if (a) made += 1;
      }
    }
  }
  assert.ok(made >= 300, `made ${made}`);
});

test("order uses a choice string and estimate grades by log10 distance", () => {
  const o = makeForm("order", SOURCES, "o", 3)!;
  assert.equal(o.lines.length, 3);
  assert.equal(o.choices!.length, 4);
  assert.match(o.answer, /^[ABC]{3}$/);
  const e = makeForm("estimate", SOURCES, "e", 2)!;
  assert.equal(e.log10Tolerance, 0.2);
  assert.equal(gradeAnswer(e, String(Number(e.answer) * 1.5), 1000).correct, Math.log10(1.5) <= 0.2);
  assert.equal(gradeAnswer(e, String(Number(e.answer) * 10), 1000).correct, false);
});

test("the estimate prompt states the factor the log10 grader accepts on both sides", () => {
  assert.deepEqual(DEPTHS.map(estimateFactor), [1.99, 1.58, 1.25]);
  for (const depth of DEPTHS) {
    const f = estimateFactor(depth);
    assert.ok(Math.log10(f) <= ESTIMATE_LOG10[depth] && Math.log10(f + 0.01) > ESTIMATE_LOG10[depth]);
    for (let s = 0; s < 20; s++) {
      const q = makeForm("estimate", SOURCES, `band-${depth}-${s}`, depth)!;
      const n = Number(q.answer);
      assert.deepEqual(q.lines, [`A factor of ${f} either way counts.`]);
      assert.equal(q.lines.join(" ").includes("percent"), false);
      for (const edge of [n * f, n / f]) assert.equal(gradeAnswer(q, String(edge), 1000).correct, true, `${depth} ${edge}`);
      for (const out of [n * (f + 0.02), n / (f + 0.02)]) assert.equal(gradeAnswer(q, String(out), 1000).correct, false, `${depth} ${out}`);
    }
  }
});

test("which_changed has no maker and the other built forms do", () => {
  assert.equal(FORM_MAKERS.which_changed, undefined);
  for (const f of BUILT) assert.ok(FORM_MAKERS[f]);
});

test("cardFields maps legacy question rows to the same fact.id|form key the migration backfill writes", () => {
  const pr = { id: "which_first:abc", type: "which_first" as const, sources: [{ kind: "pr" as const, ref: "#504", label: "", href: null }] };
  assert.deepEqual(cardFields(pr), { fact_id: "pr:504", form: "compare", card_key: "pr:504|compare" });
  const bead = { id: "true_false:x", type: "true_false" as const, sources: [{ kind: "bead" as const, ref: "bkt-33cg", label: "", href: null }] };
  assert.equal(cardFields(bead).card_key, "bead:bkt-33cg|true_false");
  assert.equal(cardFields({ id: "estimate:q1", type: "estimate", sources: [] }).card_key, "count:estimate:q1|estimate");
  const q = makeForm("order", SOURCES, "o", 2)!;
  assert.equal(cardFields(q).card_key, q.cardKey);
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261001150000_research_os_work_quiz_card_key.sql"), "utf8");
  assert.match(sql, /when 'which_first' then 'compare'/);
  assert.match(sql, /'pr:' \|\| ltrim\(question -> 'sources' -> 0 ->> 'ref', '#'\)/);
});

test("order cards key on every fact id in order, so two triples sharing an oldest change do not collide", () => {
  const keys = new Map<string, string>();
  for (let s = 0; s < SEEDS; s++) {
    const q = makeForm("order", SOURCES, `collide-${s}`, 2);
    if (!q) continue;
    assert.equal(q.factIds.length, 3);
    assert.equal(q.cardKey, `${q.factIds.join("+")}|order`);
    const prior = keys.get(q.cardKey);
    if (prior) assert.equal(prior, q.factIds.join(","));
    keys.set(q.cardKey, q.factIds.join(","));
  }
  assert.ok(new Set(Array.from(keys.keys()).map((k) => k.split("+")[0])).size < keys.size);
});
