import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CLOZE_TITLE_TOKENS, MAKERS, OPTION_TITLE_TOKENS, clozeOptions, clozeWords, generateQuestion, rewriteQuestion, seededRng, shortTriple } from "../src/lib/research-os/work-quiz/generate";
import { LIMITS, checkLimits, countTokens, parityOk, screenTokens, shortTitle, stemTokens, tokenize, withinLimits } from "../src/lib/research-os/work-quiz/limits";
import { QUIZ_TYPES, RETIRED_QUIZ_TYPES, type WorkQuizType, type WorkSources } from "../src/lib/research-os/work-quiz/types";

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
  assert.equal(countTokens("— – … · | ? ! → ≤"), 0);
  assert.equal(countTokens("fill ____ here"), 3);
  assert.equal(countTokens("  "), 0);
});

test("other scripts and emoji count, and scripts without spaces count by length", () => {
  assert.equal(countTokens("量子力学の基礎"), 4);
  assert.equal(countTokens("量子"), 1);
  assert.equal(countTokens("这是一个没有空格的很长的中文句子用来测试"), 10);
  assert.equal(countTokens("ทดสอบภาษาไทย"), 6);
  assert.equal(countTokens("ما هو الفرع الذي يأخذ الطلبات"), 6);
  assert.equal(countTokens("שלום עולם"), 2);
  assert.equal(countTokens("Привет мир café naïve"), 4);
  assert.equal(countTokens("🚀 🎉 ✅"), 3);
  assert.equal(countTokens("ship 🚀 now"), 3);
  assert.equal(countTokens("PR 量子力学"), 3);
  assert.ok(checkLimits({ prompt: "这是一个没有空格的很长的中文句子用来测试题干长度限制是否生效的例子" }).some((v) => /stem has 17 tokens/.test(v)));
  assert.equal(shortTitle("feat: 量子力学の基礎 を 追加", 3), "");
  assert.equal(shortTitle("feat: 量子力学 追加 する", 3), "量子力学 追加");
});

test("one token and the whole screen have character caps", () => {
  const url = `https://example.org/${"a".repeat(300)}`;
  assert.equal(countTokens(url), 1);
  assert.ok(checkLimits({ prompt: `Open ${url} now` }).some((v) => v === `a token has ${url.length} characters, the limit is 40`));
  assert.ok(checkLimits({ prompt: "Which one?", choices: ["dev", `x-${"y".repeat(60)}`] }).some((v) => /a token has 62 characters/.test(v)));
  assert.ok(checkLimits({ prompt: "Why?", explain: `see ${"snake_case_identifier_".repeat(3)}` }).some((v) => /a token has 66 characters/.test(v)));
  const wide = Array.from({ length: 15 }, () => "w".repeat(38)).join(" ");
  assert.deepEqual(checkLimits({ prompt: wide }), ["584 characters on screen before answering, the limit is 280"]);
  assert.deepEqual(checkLimits({ prompt: "Why?", explain: Array.from({ length: 20 }, () => "w".repeat(12)).join(" ") }), ["the why line has 259 characters, the limit is 160"]);
  assert.deepEqual(checkLimits({ prompt: "Open src/lib/research-os/work-quiz/limits.ts now" }), []);
});

test("shortTitle keeps negations and direction words, and distinct titles stay distinct", () => {
  assert.equal(shortTitle("Add no-op guard without breaking retry path", 8), "Add no-op guard without breaking retry path");
  assert.equal(shortTitle("fix: run the check before the merge, not after", 8), "run check before merge, not after");
  assert.equal(shortTitle("Move limits over the wire under a flag", 8), "Move limits over wire under flag");
  assert.equal(shortTitle("never ship if no test passes until review", 8), "never ship if no test passes until review");
  assert.notEqual(shortTitle("Retry before the timeout", 5), shortTitle("Retry after the timeout", 5));
  assert.notEqual(shortTitle("Guard with a retry", 5), shortTitle("Guard without a retry", 5));
  const all = [...TITLES.prs, ...TITLES.beads];
  for (const word of ["without", "over", "under", "before", "after", "not", "no", "never", "into", "out"]) {
    for (const t of all.filter((x) => new RegExp(`\\b${word}\\b`, "i").test(x.replace(/\s*\(#\d+\)$/, "")))) {
      const kept = shortTitle(t, 40);
      if (!/^[a-z]+(\([^)]*\))?!?:/i.test(t) || !new RegExp(`^[^:]*\\b${word}\\b[^:]*:`, "i").test(t)) assert.match(kept, new RegExp(`\\b${word}\\b`, "i"), `${word} survives in ${t}`);
    }
  }
  const full = new Set(all);
  const short = new Set(Array.from(full).map((t) => shortTitle(t, CLOZE_TITLE_TOKENS)));
  assert.ok(short.size >= full.size - 2, `${full.size - short.size} of ${full.size} distinct titles collide at ${CLOZE_TITLE_TOKENS} tokens`);
});

test("shortTitle strips the commit prefix and PR number, drops function words and keeps whole tokens", () => {
  assert.equal(shortTitle("feat(research-os): evolution labor importer for Eloundou (#346)", 5), "evolution labor importer Eloundou");
  assert.equal(shortTitle("fix(bkt): never overwrite a keyring entry, scope keys to the data folder, allowlist --json", 4), "never overwrite keyring entry");
  assert.equal(shortTitle("fix!: the cap of 20 percent on bkt-33cg in src/lib/limits.ts", 4), "cap 20 percent bkt-33cg src/lib/limits.ts");
  assert.equal(shortTitle("Explore slice 2: founding works data and its validator", 3), "Explore slice 2");
  assert.equal(shortTitle("Quiz: the of and", 5), "Quiz");
  assert.equal(shortTitle("of the and", 5), "");
  assert.equal(shortTitle(`Open https://example.org/${"a".repeat(60)} first`, 5), "");
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
  const ok = { prompt: "Which branch takes desktop PRs?", lines: [], choices: ["dev", "main", "ops"], explain: "Desktop work targets dev.", sources: [] };
  assert.deepEqual(checkLimits(ok), []);
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  assert.match(checkLimits({ ...ok, prompt: words(16) })[0], /stem has 16 tokens, the limit is 15/);
  assert.match(checkLimits({ ...ok, prompt: words(10), lines: [words(6)] })[0], /stem has 16 tokens/);
  assert.deepEqual(checkLimits({ ...ok, prompt: words(15) }), []);
  assert.match(checkLimits({ ...ok, choices: ["a1", "b2", "c3", "d4"] })[0], /4 options, a choice question takes exactly 3/);
  assert.match(checkLimits({ ...ok, choices: ["true", "false"] })[0], /2 options, a choice question takes exactly 3/);
  assert.match(checkLimits({ ...ok, choices: [words(6), words(6), words(6)] })[0], /an option has 6 tokens, the limit is 5/);
  assert.deepEqual(checkLimits({ prompt: words(15), choices: [words(5), words(5), words(5)] }), []);
  assert.match(checkLimits({ ...ok, choices: [words(1), words(3), words(3)] })[0], /options differ/);
  assert.match(checkLimits({ ...ok, choices: ["dev", "hte/integration", "main"] })[0], /options differ/);
  assert.match(checkLimits({ ...ok, explain: words(21) })[0], /why line has 21 tokens, the limit is 20/);
  assert.match(checkLimits({ ...ok, sources: [1, 2] })[0], /2 sources, the limit is 1 link/);
  assert.equal(LIMITS.stem + LIMITS.choices * LIMITS.option, LIMITS.screen);
  assert.ok(parityOk(["true", "false", "maybe"]));
  assert.ok(!parityOk(["Fermi", "Exact match", "Rubric", "Peer"]));
});

test("an intent question is free text with a stem of at most 20 tokens", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  assert.deepEqual(checkLimits({ prompt: words(20), choices: null }, { intent: true }), []);
  assert.match(checkLimits({ prompt: words(21), choices: null }, { intent: true })[0], /stem has 21 tokens, the limit is 20/);
  assert.match(checkLimits({ prompt: words(5), choices: ["yes", "no", "later"] }, { intent: true })[0], /free text/);
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

test("a retired type makes no question, and the stem names the kind of fact", () => {
  for (const type of RETIRED_QUIZ_TYPES) {
    for (let i = 0; i < 40; i++) assert.equal(MAKERS[type](SOURCES, seededRng(`retired-${type}-${i}`)), null);
    assert.equal(generateQuestion(SOURCES, "retired", type), null);
  }
  assert.ok(!QUIZ_TYPES.some((t) => (RETIRED_QUIZ_TYPES as readonly string[]).includes(t)));
  for (let i = 0; i < 40; i++) {
    const r = MAKERS.recall(SOURCES, seededRng(`kind-${i}`));
    if (r) assert.match(r.prompt, /^Fill the blank in this (task|merged change)\.$/);
    for (const type of QUIZ_TYPES) {
      const q = MAKERS[type](SOURCES, seededRng(`plain-${type}-${i}`));
      if (!q) continue;
      const frame = [q.prompt.replace(/"[^"]*"/g, ""), ...(type === "spot_error" ? q.choices ?? [] : []), ...q.sources.map((x) => x.label)].join(" ");
      assert.ok(!/\bbeads?\b|\bPRs?\b|\bid\b/i.test(frame), `${type} uses plain words: ${frame}`);
    }
  }
});

test("every generated choice question offers exactly three choices", () => {
  for (const [part, src] of Object.entries(PARTS)) {
    for (const type of QUIZ_TYPES) {
      for (let i = 0; i < SEEDS; i++) {
        const q = MAKERS[type](src, seededRng(`three-${part}-${type}-${i}`));
        if (!q) continue;
        if (type === "estimate") assert.equal(q.choices, null);
        else {
          assert.equal(q.choices?.length, LIMITS.choices, `${part} ${type} seed ${i}`);
          assert.equal(new Set(q.choices).size, LIMITS.choices);
          assert.equal(q.choices!.filter((c) => c === q.answer).length, 1);
        }
      }
    }
  }
});

test("a stored question is rewritten about the same fact, or not at all", () => {
  for (const type of QUIZ_TYPES) {
    let done = 0;
    for (let i = 0; i < 40; i++) {
      const q = MAKERS[type](SOURCES, seededRng(`rw-${type}-${i}`));
      if (!q) continue;
      const again = rewriteQuestion({ ...q, id: type === "estimate" ? q.id : `${q.id}x`, prompt: `${q.prompt} ${"padding ".repeat(20)}` }, SOURCES);
      if (!again) continue;
      done++;
      assert.deepEqual(checkLimits(again), []);
      assert.equal(again.type, type);
      if (type === "which_first" && q.sources[0].kind === "pr") {
        const pr = SOURCES.prs.find((p) => `#${p.number}` === q.sources[0].ref)!;
        assert.ok((again.choices ?? []).some((c) => shortTitle(pr.title, OPTION_TITLE_TOKENS).startsWith(c)));
      } else if (type !== "estimate" && type !== "which_first") assert.equal(again.sources[0].ref, q.sources[0].ref);
    }
    assert.ok(done >= 10, `${type} rewrote ${done}`);
  }
  const gone = { ...MAKERS.spot_error(PARTS.prs, seededRng("gone"))!, sources: [{ kind: "pr" as const, ref: "#99999", label: "x", href: null }] };
  assert.equal(rewriteQuestion(gone, SOURCES), null);
  assert.equal(rewriteQuestion({ ...gone, sources: [] }, SOURCES), null);
});

test("generateQuestion drops a question over a limit and falls through to the next form", () => {
  const long: WorkSources = { repoUrl: null, notes: [], prs: [], beads: [{ id: "bkt-a", title: "of the and", status: "open", priority: 1, createdAt: "2026-10-01" }, { id: "bkt-b", title: "to in on", status: "closed", priority: 2, createdAt: "2026-10-01" }] };
  for (let i = 0; i < 50; i++) {
    const q = generateQuestion(long, `drop-${i}`);
    if (q) assert.ok(withinLimits(q));
  }
  assert.equal(generateQuestion(long, "x", "spot_error"), null);
});

function share(cells: boolean[]): number {
  return cells.length === 0 ? 0 : cells.filter(Boolean).length / cells.length;
}

function allTriples(titles: string[]): boolean[] {
  const out: boolean[] = [];
  const rng = seededRng("triples");
  for (let n = 0; n < 4000; n++) {
    const picked = new Set<number>();
    while (picked.size < 3) picked.add(Math.floor(rng() * titles.length));
    const [a, b, c] = Array.from(picked).map((i) => titles[i]);
    out.push(shortTriple([a, b, c]) !== null);
  }
  return out;
}

export function validCells(titles: { prs: string[]; beads: string[] }): Record<Exclude<WorkQuizType, "true_false"> | "three_titles", number> {
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
      return options !== null && withinLimits({ prompt: "Fill the blank in this merged change.", lines: [s.replace(answer, "____")], choices: options, explain: `Change #000 reads: ${s}` });
    });
  });
  const rng = seededRng("four-titles");
  const four = Array.from({ length: 2000 }, () => {
    const picked = new Set<number>();
    while (picked.size < LIMITS.choices) picked.add(Math.floor(rng() * all.length));
    const options = Array.from(picked).map((i) => shortTitle(all[i], LIMITS.option));
    return new Set(options).size === LIMITS.choices && parityOk(options);
  });
  return {
    recall: share(recall),
    which_first: share([...allTriples(titles.prs), ...allTriples(titles.beads)]),
    estimate: 1,
    spot_error: share(all.map((t) => shortTitle(t, OPTION_TITLE_TOKENS) !== "" && withinLimits({ prompt: "Which change fact is wrong?", lines: [`number: #000`, "merged: 2026-10-01", `title: ${shortTitle(t, OPTION_TITLE_TOKENS)}`], choices: ["the number", "the date", "the title"] }))),
    three_titles: share(four),
  };
}

test("the gate: recall keeps at least 60 percent valid cells on real PR and bead titles", () => {
  assert.ok(TITLES.prs.length >= 95 && TITLES.beads.length >= 95);
  const cells = validCells(TITLES);
  for (const [form, value] of Object.entries(cells)) console.log(`valid cells ${form}: ${(value * 100).toFixed(1)} percent`);
  assert.ok(cells.recall >= RECALL_GATE, `recall has ${(cells.recall * 100).toFixed(1)} percent valid cells`);
  for (const type of QUIZ_TYPES) {
    const value = cells[type as keyof typeof cells];
    assert.ok(value >= RECALL_GATE, `${type} has ${(value * 100).toFixed(1)} percent valid cells`);
  }
});
