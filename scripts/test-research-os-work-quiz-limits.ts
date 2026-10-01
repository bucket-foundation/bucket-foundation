import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CLOZE_TITLE_TOKENS, MAKERS, OPTION_TITLE_TOKENS, STEM_TITLE_TOKENS, clozeOptions, clozeWords, generateQuestion, seededRng, shortPair } from "../src/lib/research-os/work-quiz/generate";
import { LIMITS, checkLimits, countTokens, parityOk, screenTokens, shortTitle, stemTokens, tokenize, withinLimits } from "../src/lib/research-os/work-quiz/limits";
import { QUIZ_TYPES, type QuizType, type WorkSources } from "../src/lib/research-os/work-quiz/types";

const TITLES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures/quiz-titles.json"), "utf8")) as { prs: string[]; beads: string[] };
const SEEDS = 200;
const RECALL_GATE = 0.6;
const STATUSES = ["open", "closed", "in_progress", "deferred"];

const day = (i: number) => new Date(Date.UTC(2026, 8, 1 + Math.floor(i / 4))).toISOString().slice(0, 10);

const SOURCES: WorkSources = {
  repoUrl: "https://github.com/example/repo",
  prs: TITLES.prs.map((title, i) => ({ number: 400 + i, title: `${title} (#${400 + i})`, date: day(i), order: i })),
  beads: TITLES.beads.map((title, i) => ({ id: `bkt-f${i.toString(36)}`, title, status: STATUSES[i % STATUSES.length], priority: i % 5, createdAt: day(i) })),
  notes: [
    { file: "_intake/ideas/IDEAS-2026-09-18.md", heading: "Swipe breaks between long reading sessions", date: "2026-09-18" },
    { file: "_intake/ideas/IDEAS-2026-09-20.md", heading: "A work quiz that surprises you during the day", date: "2026-09-20" },
    { file: "_intake/ideas/IDEAS-2026-09-24.md", heading: "Citation receipts as a public ledger of reading", date: "2026-09-24" },
    { file: "_intake/ideas/IDEAS-2026-09-27.md", heading: "Prime directions for the advisor map", date: "2026-09-27" },
    { file: "_intake/ideas/IDEAS-2026-09-29.md", heading: "Daily quiz from chat sessions", date: "2026-09-29" },
    { file: "_intake/ideas/IDEAS-2026-10-01.md", heading: "Question forms as a sample space", date: "2026-10-01" },
  ],
};

const PARTS: Record<string, WorkSources> = {
  all: SOURCES,
  prs: { ...SOURCES, beads: [], notes: [] },
  beads: { ...SOURCES, prs: [], notes: [] },
  notes: { ...SOURCES, prs: [], beads: [] },
};

test("a word, an identifier, a number with its unit and a short formula are one token each", () => {
  assert.deepEqual(tokenize("Which word fills the blank?"), ["Which", "word", "fills", "the", "blank?"]);
  assert.equal(countTokens("bkt-33cg src/lib/limits.ts work_quiz_cards #504 2026-10-01"), 5);
  assert.deepEqual(tokenize("Within 20 percent counts as right."), ["Within", "20 percent", "counts", "as", "right."]);
  assert.equal(countTokens("wait 30 s then 5 minutes at 3.5 GB"), 6);
  assert.deepEqual(tokenize("so E = mc^2 holds"), ["so", "E = mc^2", "holds"]);
  assert.equal(countTokens("a + b = c"), 1);
  assert.equal(countTokens("alpha + beta = gamma"), 3);
  assert.equal(countTokens("slice - limits"), 2);
  assert.equal(countTokens("one · two | three"), 3);
  assert.equal(countTokens("fill ____ here"), 3);
  assert.equal(countTokens("  "), 0);
});

test("shortTitle strips the commit prefix and PR number, drops function words and keeps whole tokens", () => {
  assert.equal(shortTitle("feat(research-os): evolution labor importer for Eloundou (#346)", 5), "evolution labor importer Eloundou");
  assert.equal(shortTitle("fix(bkt): never overwrite a keyring entry, scope keys to the data folder, allowlist --json", 4), "never overwrite keyring entry");
  assert.equal(shortTitle("fix!: the cap of 20 percent on bkt-33cg in src/lib/limits.ts", 4), "cap 20 percent bkt-33cg src/lib/limits.ts");
  assert.equal(shortTitle("Explore slice 2: founding works data and its validator", 3), "Explore slice 2");
  assert.equal(shortTitle("Quiz: the of and", 5), "Quiz");
  assert.equal(shortTitle("of the and", 5), "");
  assert.equal(shortTitle("docs: E = mc^2 as a card", 2), "E = mc^2 card");
  for (const t of [...TITLES.prs, ...TITLES.beads]) {
    for (const cap of [3, 5, 8]) {
      const s = shortTitle(t, cap);
      assert.ok(countTokens(s) <= cap, `${s} within ${cap}`);
      assert.ok(!/…|\.\.\.$/.test(s), "no ellipsis");
      for (const piece of tokenize(s)) assert.ok(t.includes(piece.replace(/[,;:.]+$/, "")), `${piece} is a whole token of the title`);
    }
  }
});

test("checkLimits names each limit a question breaks", () => {
  const ok = { prompt: "Which branch takes desktop PRs?", lines: [], choices: ["dev", "main"], explain: "Desktop work targets dev.", sources: [] };
  assert.deepEqual(checkLimits(ok), []);
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  assert.match(checkLimits({ ...ok, prompt: words(16) })[0], /stem has 16 tokens, the limit is 15/);
  assert.match(checkLimits({ ...ok, prompt: words(10), lines: [words(6)] })[0], /stem has 16 tokens/);
  assert.deepEqual(checkLimits({ ...ok, prompt: words(15) }), []);
  assert.match(checkLimits({ ...ok, choices: ["a1", "b2", "c3", "d4", "e5"] })[0], /5 options, the limit is 4/);
  assert.match(checkLimits({ ...ok, choices: [words(6), words(6), words(6), words(6)] })[0], /an option has 6 tokens, the limit is 5/);
  assert.deepEqual(checkLimits({ prompt: words(15), choices: [words(10), words(10)] }), []);
  assert.match(checkLimits({ ...ok, choices: [words(11), words(11)] })[0], /an option has 11 tokens, the limit is 10/);
  assert.match(checkLimits({ ...ok, choices: [words(1), words(3)] })[0], /options differ/);
  assert.match(checkLimits({ ...ok, choices: ["dev", "hte/integration"] })[0], /options differ/);
  assert.match(checkLimits({ ...ok, explain: words(21) })[0], /why line has 21 tokens, the limit is 20/);
  assert.match(checkLimits({ ...ok, sources: [1, 2] })[0], /2 sources, the limit is 1 link/);
  assert.equal(LIMITS.stem + LIMITS.maxOptions * LIMITS.option, LIMITS.screen);
  assert.equal(LIMITS.stem + 2 * LIMITS.optionOfTwo, LIMITS.screen);
  assert.ok(parityOk(["true", "false"]));
  assert.ok(!parityOk(["Fermi", "Exact match", "Rubric", "Peer"]));
});

test("an intent question is free text with a stem of at most 20 tokens", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  assert.deepEqual(checkLimits({ prompt: words(20), choices: null }, { intent: true }), []);
  assert.match(checkLimits({ prompt: words(21), choices: null }, { intent: true })[0], /stem has 21 tokens, the limit is 20/);
  assert.match(checkLimits({ prompt: words(5), choices: ["yes", "no"] }, { intent: true })[0], /free text/);
});

test(`${SEEDS} seeds per generator over fixture PRs, beads and notes stay within every limit`, () => {
  for (const [part, src] of Object.entries(PARTS)) {
    for (const type of QUIZ_TYPES) {
      let made = 0;
      for (let i = 0; i < SEEDS; i++) {
        const q = MAKERS[type](src, seededRng(`limits-${part}-${type}-${i}`));
        if (!q) continue;
        made++;
        assert.deepEqual(checkLimits(q), [], `${part} ${type} seed ${i}: ${q.prompt} | ${q.lines.join(" | ")} | ${(q.choices ?? []).join(" | ")} | ${q.explain}`);
        assert.ok(stemTokens(q) <= LIMITS.stem && screenTokens(q) <= LIMITS.screen);
        assert.ok(![q.prompt, ...q.lines, ...(q.choices ?? []), q.explain].some((s) => s.includes("…")), "no ellipsis");
        assert.ok(q.sources.length <= 1);
        if (q.choices) assert.ok(q.choices.includes(q.answer));
      }
      const possible = (type === "which_first" && part === "beads") || (part === "notes" && type !== "which_first");
      if (!possible) assert.ok(made >= SEEDS * 0.75, `${part} ${type} made ${made} of ${SEEDS}`);
    }
  }
});

test("generateQuestion drops a question over a limit and falls through to the next form", () => {
  const long: WorkSources = { repoUrl: null, notes: [], prs: [], beads: [{ id: "bkt-a", title: "of the and", status: "open", priority: 1, createdAt: "2026-10-01" }, { id: "bkt-b", title: "to in on", status: "closed", priority: 2, createdAt: "2026-10-01" }] };
  for (let i = 0; i < 50; i++) {
    const q = generateQuestion(long, `drop-${i}`);
    if (q) assert.ok(withinLimits(q));
  }
  assert.equal(generateQuestion(long, "x", "true_false"), null);
});

function share(cells: boolean[]): number {
  return cells.length === 0 ? 0 : cells.filter(Boolean).length / cells.length;
}

function allPairs(titles: string[]): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < titles.length; i++) for (let j = i + 1; j < titles.length; j++) out.push(shortPair(titles[i], titles[j]) !== null);
  return out;
}

export function validCells(titles: { prs: string[]; beads: string[] }): Record<QuizType | "four_titles", number> {
  const all = [...titles.prs, ...titles.beads];
  const shorts = all.map((t) => shortTitle(t, CLOZE_TITLE_TOKENS));
  const pool = Array.from(new Set(shorts.flatMap(clozeWords)));
  const recall = shorts.map((s) => {
    const words = clozeWords(s);
    const lower = new Set(words.map((w) => w.toLowerCase()));
    const once = words.filter((w) => words.filter((x) => x.toLowerCase() === w.toLowerCase()).length === 1);
    const others = pool.filter((w) => !lower.has(w.toLowerCase()));
    return once.some((answer) => {
      const options = clozeOptions(answer, others);
      return options !== null && withinLimits({ prompt: "Which word fills the blank?", lines: [s.replace(answer, "____")], choices: options, explain: `PR #000 reads: ${s}` });
    });
  });
  const stem = (cap: number, frame: (s: string) => string) => all.map((t) => shortTitle(t, cap) !== "" && withinLimits({ prompt: frame(shortTitle(t, cap)), choices: ["true", "false"] }));
  const rng = seededRng("four-titles");
  const four = Array.from({ length: 2000 }, () => {
    const picked = new Set<number>();
    while (picked.size < 4) picked.add(Math.floor(rng() * all.length));
    const options = Array.from(picked).map((i) => shortTitle(all[i], LIMITS.option));
    return new Set(options).size === 4 && parityOk(options);
  });
  return {
    recall: share(recall),
    true_false: share(stem(STEM_TITLE_TOKENS, (s) => `"${s}" merged on 2026-10-01.`)),
    which_first: share([...allPairs(titles.prs), ...allPairs(titles.beads)]),
    estimate: 1,
    spot_error: share(all.map((t) => shortTitle(t, OPTION_TITLE_TOKENS) !== "" && withinLimits({ prompt: "Which fact is wrong?", lines: [`number: #000`, "merged: 2026-10-01", `title: ${shortTitle(t, OPTION_TITLE_TOKENS)}`], choices: ["the number", "the date", "the title"] }))),
    four_titles: share(four),
  };
}

test("the gate: recall keeps at least 60 percent valid cells on real PR and bead titles", () => {
  assert.ok(TITLES.prs.length >= 95 && TITLES.beads.length >= 95);
  const cells = validCells(TITLES);
  for (const [form, value] of Object.entries(cells)) console.log(`valid cells ${form}: ${(value * 100).toFixed(1)} percent`);
  assert.ok(cells.recall >= RECALL_GATE, `recall has ${(cells.recall * 100).toFixed(1)} percent valid cells`);
  for (const type of QUIZ_TYPES) assert.ok(cells[type] >= RECALL_GATE, `${type} has ${(cells[type] * 100).toFixed(1)} percent valid cells`);
});
