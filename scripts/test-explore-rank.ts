import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { FOUNDING_BONUS_CAP_MICRO, MICRO, clampBonus, idiv, kernelRank, kernelScore, termWeightMilli, type KernelDoc, type KernelQuery } from "../src/lib/explore/rank-kernel";
import {
  ANY_TERM,
  FOUNDING_BONUS_CAP,
  dedupeWorks,
  foundingApproved,
  indexDoc,
  matchFounding,
  queryTerms,
  rank,
  statsOf,
  terms,
  unreadableScript,
  type FoundingRow,
  type RankDoc,
} from "../src/lib/explore/rank";
import { foundingCard, foundingFor, unverifiedFoundingAllowed, UNVERIFIED_FLAG } from "../src/lib/explore/founding";
import { buildCorpus, needsClosest, rankedPools, semanticExcerpts } from "../src/lib/explore/ranked";
import { parseTalk } from "../src/lib/explore/talks";
import { unify } from "../src/lib/explore/search";
import type { SourceRow } from "../src/lib/explore/sources";
import type { ClaimIndexEntry } from "../src/lib/canon-search";

const doc = (id: string, title: string, author = "", concept = "", body = "", doi?: string): RankDoc => ({ id, title, author, concept, body, doi });

const DOCS: RankDoc[] = [
  doc("a", "Natural selection in the wild", "Ann Reader", "", "A field study of finches."),
  doc("b", "A study of finches", "Bo Writer", "", "Beaks change under natural selection over several seasons of drought and rain."),
  doc("c", "Natural selection", "Cy Author", "", "The principle stated."),
  doc("d", "Garden notes", "Di Natural", "", "Selection of roses for a small plot."),
  doc("e", "Roses", "Ed Grower", "selection", "Pruning."),
  doc("f", "Granite", "Flo Miner", "", "Quarry records from the north."),
  doc("g", "Basalt", "Gus Miner", "", "Quarry records from the south."),
  doc("h", "Slate", "Hal Miner", "", "Quarry records from the east."),
];

function ranked(query: string, docs = DOCS, bonus?: Map<string, number>) {
  const indexed = docs.map(indexDoc);
  return rank(query, indexed, statsOf(indexed), { bonus });
}

test("terms drop stop words, fold accents and plurals", () => {
  assert.deepEqual(terms("The Schrödinger equations of galaxies"), ["schrodinger", "equation", "galaxy"]);
  assert.deepEqual(queryTerms("P versus NP"), ["versus", "np"]);
  assert.deepEqual(queryTerms("entropy and entropy"), ["entropy"]);
});

test("a title match outranks the same words in the body", () => {
  const r = ranked("natural selection");
  const at = (id: string) => r.findIndex((x) => x.doc.id === id);
  assert.ok(at("a") < at("b"));
});

test("an exact title match ranks first and carries the exact-title bonus", () => {
  const r = ranked("natural selection");
  assert.equal(r[0].doc.id, "c");
  const pair = ranked("natural selection", [doc("x", "Natural selection"), doc("y", "Natural selection again"), ...DOCS.slice(5)]);
  assert.equal(pair[0].doc.id, "x");
  assert.ok(pair[0].score * 4 > pair[1].score * 5);
});

test("a phrase match outranks the same terms apart", () => {
  const docs = [doc("p", "On natural selection today"), doc("q", "On selection, natural or today"), ...DOCS.slice(5)];
  const r = ranked("natural selection", docs);
  assert.equal(r[0].doc.id, "p");
  assert.ok(r[0].score > r[1].score);
});

test("a row with every query term outranks a row with one term in a heavier field", () => {
  const r = ranked("natural selection");
  const at = (id: string) => r.findIndex((x) => x.doc.id === id);
  assert.ok(at("b") < at("e") || at("e") < 0);
});

test("a longer field scores lower for the same match", () => {
  const r = ranked("finches", [doc("s", "Finches"), doc("l", "Finches and many other birds of the islands and the mainland"), ...DOCS.slice(5)]);
  assert.deepEqual(r.map((x) => x.doc.id), ["s", "l"]);
  assert.ok(r[0].score > r[1].score && r[1].score > 0);
});

test("a row that matches nothing is never returned", () => {
  assert.deepEqual(ranked("zzqxv plorth"), []);
  assert.deepEqual(ranked(""), []);
  assert.deepEqual(ranked("the of and"), []);
  const r = ranked("natural selection");
  assert.ok(r.every((x) => x.score > 0));
  assert.ok(!r.some((x) => ["f", "g", "h"].includes(x.doc.id)));
});

test("a row that covers under half of the query's weight is dropped", () => {
  const r = ranked("quarry zzqxv plorth");
  assert.deepEqual(r, []);
  assert.ok(ranked("quarry records").length === 3);
});

test("a query the corpus cannot answer returns nothing", () => {
  assert.equal(ranked("quarry").length, 3);
  assert.equal(ranked("bitcoin").length, 0);
});

test("ranking is deterministic and independent of input order", () => {
  const first = ranked("natural selection quarry records");
  const again = ranked("natural selection quarry records");
  const reversed = ranked("natural selection quarry records", DOCS.slice().reverse());
  assert.deepEqual(first, again);
  assert.deepEqual(first.map((x) => [x.doc.id, x.score]), reversed.map((x) => [x.doc.id, x.score]));
});

test("equal scores break by id ascending", () => {
  const twins = [doc("z2", "Quartz"), doc("z1", "Quartz"), doc("z3", "Quartz"), ...DOCS];
  const r = ranked("quartz", twins);
  assert.deepEqual(r.map((x) => x.doc.id), ["z1", "z2", "z3"]);
  assert.ok(r[0].score === r[1].score && r[1].score === r[2].score);
});

test("works deduplicate by DOI, else by title and first author", () => {
  const rows = [
    { doc: doc("paper:d/10.1/x", "On Computable Numbers", "Alan Turing", "", "", "10.1/X"), score: 3 },
    { doc: doc("paper:o/W1", "On computable numbers", "A. M. Turing et al.", "", ""), score: 5 },
    { doc: doc("paper:o/W2", "On Computable Numbers", "Someone Else"), score: 4 },
    { doc: doc("paper:d/10.1/x2", "Reprint under another title", "Alan Turing", "", "", "10.1/x"), score: 1 },
  ];
  const works = dedupeWorks(rows);
  assert.equal(works.length, 2);
  assert.equal(works[0].best.doc.id, "paper:o/W1");
  assert.deepEqual(works[0].also, ["paper:d/10.1/x", "paper:d/10.1/x2"]);
  assert.equal(works[1].best.doc.id, "paper:o/W2");
});

const row = (over: Partial<FoundingRow> = {}): FoundingRow => ({
  concept: "natural selection",
  aliases: ["origin of species"],
  work: { kind: "openalex", id: "W1", title: "On the Origin of Species", author: "Charles Darwin", year: 1859 },
  tier: "founding",
  basis_verified: true,
  reviewer: "A. Person",
  ...over,
});

test("a founding row counts as approved only with a reviewer and a verified basis", () => {
  assert.equal(foundingApproved(row()), true);
  assert.equal(foundingApproved(row({ reviewer: "" })), false);
  assert.equal(foundingApproved(row({ reviewer: "  " })), false);
  assert.equal(foundingApproved(row({ basis_verified: false })), false);
});

test("an unapproved row is used only when unverified rows are allowed", () => {
  const draft = [row({ reviewer: "", basis_verified: false })];
  assert.equal(matchFounding("natural selection", draft, false), null);
  assert.equal(matchFounding("natural selection", draft, true)?.approved, false);
  assert.equal(matchFounding("natural selection", [row()], false)?.approved, true);
});

test("the query matches a concept or an alias by its terms, and the longest name wins", () => {
  const rows = [row(), row({ concept: "selection", aliases: [], work: { ...row().work, id: "W2" } })];
  assert.equal(matchFounding("the origin of species", rows, false)?.matched, "origin of species");
  assert.equal(matchFounding("who wrote about natural selection", rows, false)?.row.work.id, "W1");
  assert.equal(matchFounding("selection", rows, false)?.row.work.id, "W2");
  assert.equal(matchFounding("natural history", rows, false), null);
});

test("the unverified switch is off in production and off unless set", () => {
  assert.equal(unverifiedFoundingAllowed({}), false);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", VERCEL_ENV: "production" }), false);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", VERCEL_ENV: "production", NODE_ENV: "development" }), false);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", NODE_ENV: "production" }), false);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1" }), false);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", VERCEL_ENV: "preview" }), true);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", VERCEL_ENV: "development" }), true);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "1", NODE_ENV: "test" }), true);
  assert.equal(unverifiedFoundingAllowed({ [UNVERIFIED_FLAG]: "0", VERCEL_ENV: "preview" }), false);
});

test("the committed founding works pin nothing in production and pin Darwin when unverified rows are allowed", () => {
  assert.equal(foundingFor("natural selection", { VERCEL_ENV: "production", [UNVERIFIED_FLAG]: "1" }), null);
  assert.equal(foundingFor("natural selection", { VERCEL_ENV: "production" }), null);
  const open = foundingFor("natural selection", { VERCEL_ENV: "preview", [UNVERIFIED_FLAG]: "1" });
  assert.equal(open?.card.author, "Charles Darwin");
  assert.equal(open?.card.checked, false);
  assert.equal(foundingFor("zzqxv plorth", { VERCEL_ENV: "preview", [UNVERIFIED_FLAG]: "1" }), null);
});

test("a disputed row shows its dispute note on the card and earns no bonus", () => {
  const m = matchFounding("natural selection", [row({ disputed: true, dispute_reason: "Wallace published jointly in 1858." })], false);
  assert.ok(m);
  const f = foundingCard(m, { openalex: "o" });
  assert.equal(f.bonus, 0);
  assert.equal(f.card.dispute_note, "Wallace published jointly in 1858.");
  assert.equal(f.hitId, "paper:o/W1");
  const clean = foundingCard(matchFounding("natural selection", [row()], false)!, { openalex: "o" });
  assert.equal(clean.bonus, FOUNDING_BONUS_CAP);
  assert.equal(clean.card.dispute_note, null);
  assert.equal(f.card.label, "Contested founding work");
  assert.equal(clean.card.label, "Founding work");
});

test("a mislabelled founding row cannot outrank a better title match by more than the cap", () => {
  const plain = ranked("natural selection");
  const base = new Map(plain.map((x) => [x.doc.id, x.score]));
  for (const wrong of ["d", "f"]) {
    const boosted = ranked("natural selection", DOCS, new Map([[wrong, 1000 * MICRO]]));
    const got = new Map(boosted.map((x) => [x.doc.id, x.score]));
    assert.ok((got.get(wrong) ?? 0) - (base.get(wrong) ?? 0) <= FOUNDING_BONUS_CAP);
    for (const x of plain) {
      if (x.doc.id === wrong) continue;
      assert.equal(got.get(x.doc.id), x.score);
      assert.ok((got.get(wrong) ?? 0) - x.score <= FOUNDING_BONUS_CAP || (base.get(wrong) ?? 0) > x.score);
      if (x.score - (base.get(wrong) ?? 0) > FOUNDING_BONUS_CAP) assert.ok(boosted.findIndex((y) => y.doc.id === x.doc.id) < boosted.findIndex((y) => y.doc.id === wrong));
    }
  }
  const unmatched = ranked("natural selection", DOCS, new Map([["f", 1000 * MICRO]])).find((x) => x.doc.id === "f");
  assert.equal(unmatched?.score, FOUNDING_BONUS_CAP);
});

const entry = (concept: string, slug: string, text: string, path: string): ClaimIndexEntry => ({ rowid: 0, branch: "02-physics", concept, slug, title: `Claim ${slug}`, path, text, vec: new Float32Array(0) });

const ROWS: SourceRow[] = [
  ["o", "W1", "Heat and the second law", 1850, "On the moving force of heat.", "Rudolf Clausius"],
  ["d", "10.9/heat", "Heat and the Second Law", 1850, "Annalen der Physik", "R. Clausius"],
  ["p", "77", "Granite quarry records", 1990, "Journal of stone", "A Miner"],
  ["y", "vid00001", "A talk about heat", 2020, "Heat, engines and the second law.", "Some Channel"],
];
const ENTRIES = [
  entry("heat", "001-a", "heat flows from hot to cold in every engine", "t/1.md"),
  entry("heat", "002-b", "the second law of heat is about engines and heat", "t/2.md"),
  entry("engines", "003-c", "heat again in another talk", "u/3.md"),
  entry("stone", "004-d", "granite is a rock", "u/4.md"),
];
const TALKS: Record<string, { id: string; title: string }> = { "t/1.md": { id: "vidAAAAAA", title: "The long talk" }, "t/2.md": { id: "vidAAAAAA", title: "The long talk" }, "u/3.md": { id: "vidBBBBBB", title: "Another talk" } };
const CORPUS = buildCorpus({ rows: ROWS, entries: ENTRIES, files: [{ title: "Heat notes", branch: "02-physics", path: "02-physics/heat.md", size: 10 }], talk: (f) => TALKS[f] ?? null });

function explore(query: string, bonus?: Map<string, number>) {
  const pools = rankedPools(query, CORPUS, { bonus });
  return unify({ query, excerpts: pools.excerpts, advisors: [], sources: pools.sources, extraHits: pools.files, stats: CORPUS.stats, topK: 50 });
}

test("one work held under a DOI and under another record is one entry", () => {
  const hits = explore("heat second law");
  const clausius = hits.filter((h) => /second law/i.test(h.title) && h.type === "paper");
  assert.equal(clausius.length, 1);
  assert.equal([clausius[0].id, ...(clausius[0].also ?? [])].sort().join(), "paper:d/10.9/heat,paper:o/W1");
});

test("fragments of one talk collapse into one entry that lists its best fragments", () => {
  const hits = explore("heat");
  const talks = hits.filter((h) => h.type === "excerpt");
  assert.deepEqual(talks.map((h) => h.title).sort(), ["Another talk", "The long talk"]);
  const long = talks.find((h) => h.title === "The long talk")!;
  assert.equal(long.fragments?.length, 2);
  assert.equal(long.also?.length, 1);
  assert.equal(long.fragments?.[0].id, long.id);
});

test("pools merge on absolute scores, sorted by score then id, with no zero rows", () => {
  const hits = explore("heat second law");
  assert.ok(hits.length > 3);
  assert.ok(hits.every((h, i) => h.score > 0 && (i === 0 || hits[i - 1].score > h.score || (hits[i - 1].score === h.score && hits[i - 1].id < h.id))));
  assert.ok(new Set(hits.map((h) => h.type)).size >= 3);
  assert.ok(hits.some((h) => h.score > MICRO));
  assert.ok(!hits.some((h) => /granite/i.test(h.title)));
  assert.deepEqual(explore("zzqxv plorth"), []);
  assert.deepEqual(hits, explore("heat second law"));
});

test("any-term matching keeps rows under half of the query's weight and still drops rows that match nothing", () => {
  const strict = rankedPools("heat zzqxv plorth", CORPUS);
  assert.equal(strict.sources.length + strict.excerpts.length, 0);
  const any = rankedPools("heat zzqxv plorth", CORPUS, { floor: ANY_TERM });
  assert.ok(any.excerpts.length >= 3 && any.sources.length >= 2);
  assert.ok(!any.sources.some((h) => /granite/i.test(h.title)));
  assert.ok([...any.sources, ...any.excerpts].every((h) => h.score > 0));
});

test("a topic row appears only when its name matches the query", () => {
  const hits = explore("heat");
  assert.deepEqual(hits.filter((h) => h.type === "work").map((h) => h.title), ["heat"]);
});

test("a founding work enters the list on the bonus alone and never above the cap", () => {
  const plain = explore("heat");
  assert.ok(!plain.some((h) => h.id === "paper:p/77"));
  const boosted = explore("heat", new Map([["paper:p/77", FOUNDING_BONUS_CAP]]));
  assert.equal(boosted.find((h) => h.id === "paper:p/77")?.score, FOUNDING_BONUS_CAP);
});

test("a talk source line gives the talk id and title", () => {
  assert.deepEqual(parseTalk("- **Source**: [A Talk (part 1)](https://www.youtube.com/watch?v=2EqExGl4rQU&t=5795)\n"), { id: "2EqExGl4rQU", title: "A Talk (part 1)" });
  assert.equal(parseTalk("no source here"), null);
});

const KQ: KernelQuery = { idfMicro: [2_000_000, 6_000_000], avgMilli: [8_000, 2_000, 1_000, 20_000], floorNum: 1, floorDen: 2 };
const kdoc = (id: string, tf: number[][], over: Partial<KernelDoc> = {}): KernelDoc => ({ id, tf, len: [8, 2, 0, 20], phrase: false, exactTitle: false, bonusMicro: 0, ...over });

test("the kernel takes integers and returns integers", () => {
  const rows = [kdoc("a", [[1, 0, 0, 2], [0, 0, 0, 1]]), kdoc("b", [[0, 0, 0, 0], [2, 1, 0, 0]], { phrase: true }), kdoc("c", [[1, 0, 0, 0], [0, 0, 0, 0]], { bonusMicro: 5 * MICRO })];
  for (const r of kernelRank(KQ, rows)) for (const v of [r.score, r.lexical, r.matchedMicro, r.totalMicro]) assert.ok(Number.isSafeInteger(v));
  assert.equal(idiv(7, 2), 3);
  assert.equal(idiv(9_007_199_254_740_991, 3), 3_002_399_751_580_330);
  assert.equal(termWeightMilli([1, 0, 0, 0], [8, 0, 0, 0], KQ.avgMilli), 3_000);
  assert.equal(termWeightMilli([0, 0, 0, 1], [0, 0, 0, 40], KQ.avgMilli), 571);
});

test("the kernel score is the stated integer formula", () => {
  const s = kernelScore(KQ, kdoc("a", [[1, 0, 0, 0], [0, 0, 0, 1]]));
  const title = idiv(2_000_000 * 3_000, 1_200 + 3_000);
  const body = idiv(6_000_000 * 1_000, 1_200 + 1_000);
  assert.equal(s.lexical, idiv((title + body) * 5, 4));
  assert.equal(s.score, s.lexical);
  const exact = kernelScore(KQ, kdoc("a", [[1, 0, 0, 0], [0, 0, 0, 1]], { phrase: true, exactTitle: true }));
  assert.equal(exact.lexical, idiv((title + body) * 8, 4));
});

test("the kernel floor is 2 * matched >= total on integers", () => {
  const light = kernelScore(KQ, kdoc("a", [[3, 0, 0, 0], [0, 0, 0, 0]]));
  assert.equal(light.matchedMicro, 2_000_000);
  assert.equal(light.totalMicro, 8_000_000);
  assert.equal(light.score, 0);
  const heavy = kernelScore(KQ, kdoc("b", [[0, 0, 0, 0], [0, 0, 0, 1]]));
  assert.ok(2 * heavy.matchedMicro >= heavy.totalMicro && heavy.score > 0);
  const edge: KernelQuery = { ...KQ, idfMicro: [4_000_000, 4_000_000] };
  assert.ok(kernelScore(edge, kdoc("c", [[1, 0, 0, 0], [0, 0, 0, 0]])).score > 0);
  assert.ok(kernelScore({ ...KQ, floorNum: 0, floorDen: 1 }, kdoc("a", [[3, 0, 0, 0], [0, 0, 0, 0]])).score > 0);
});

test("the kernel bonus is an integer at or under its cap and the order is score then id", () => {
  assert.equal(clampBonus(5 * MICRO), FOUNDING_BONUS_CAP_MICRO);
  assert.equal(clampBonus(-3), 0);
  assert.equal(clampBonus(250_000), 250_000);
  const only = kernelScore(KQ, kdoc("z", [[0, 0, 0, 0], [0, 0, 0, 0]], { bonusMicro: 9 * MICRO }));
  assert.equal(only.score, FOUNDING_BONUS_CAP_MICRO);
  const tie = [[0, 0, 0, 0], [0, 0, 0, 1]];
  const order = kernelRank(KQ, [kdoc("m2", tie), kdoc("m1", tie), kdoc("top", [[1, 0, 0, 0], [1, 0, 0, 0]]), kdoc("none", [[0, 0, 0, 0], [0, 0, 0, 0]])]).map((r) => r.id);
  assert.deepEqual(order, ["top", "m1", "m2"]);
});

test("the interface hands the kernel an integer idf table built at index time", () => {
  const stats = statsOf(DOCS.map(indexDoc));
  assert.ok(Array.from(stats.idfMicro.values()).every((v) => Number.isSafeInteger(v) && v > 0));
  assert.ok(Number.isSafeInteger(stats.unseenIdfMicro) && stats.avgMilli.every((v) => Number.isSafeInteger(v) && v > 0));
  assert.ok(ranked("natural selection quarry").every((r) => Number.isSafeInteger(r.score)));
});

test("semantic excerpts with a worded query sit on the same scale as sources", () => {
  const found = ENTRIES.map((e, i) => ({ entry: e, score: 0.9 - i * 0.1 }));
  const worded = semanticExcerpts("heat second law", CORPUS, found);
  const lexical = rankedPools("heat second law", CORPUS, { floor: ANY_TERM }).excerpts;
  assert.equal(worded.length, ENTRIES.length);
  for (const e of worded.filter((x) => x.slug !== "004-d")) assert.equal(e.score, lexical.find((x) => x.slug === e.slug)?.score);
  const unmatched = worded.find((e) => e.slug === "004-d")!;
  assert.equal(unmatched.score, 600);
  assert.ok(worded.every((e) => e.slug === "004-d" || e.score > unmatched.score));
  const pools = rankedPools("heat second law", CORPUS);
  const hits = unify({ query: "heat second law", excerpts: worded, advisors: [], sources: pools.sources, stats: CORPUS.stats, topK: 50 });
  const top = hits.find((h) => h.type === "excerpt")!;
  const weakest = hits.filter((h) => h.type !== "excerpt" && h.type !== "work").pop()!;
  assert.ok(Number.isSafeInteger(top.score) && top.score > 0 && weakest.score > 0);
  assert.deepEqual(hits.map((h) => h.score), hits.map((h) => h.score).sort((a, b) => b - a));
});

test("semantic excerpts with no words keep the cosine order as integers", () => {
  const found = [{ entry: ENTRIES[3], score: 0.75 }, { entry: ENTRIES[0], score: 0.5 }, { entry: ENTRIES[1], score: -0.2 }];
  assert.deepEqual(semanticExcerpts("", CORPUS, found).map((e) => [e.slug, e.score]), [["004-d", 750_000], ["001-a", 500_000], ["002-b", 0]]);
});

test("closest matches apply only when a worded search leaves between one and nine rows", () => {
  assert.equal(needsClosest("double helix structure of DNA", 4), true);
  assert.equal(needsClosest("double helix structure of DNA", 10), false);
  assert.equal(needsClosest("cheap flights to paris", 0), false);
  assert.equal(needsClosest("thermodynamics", 3), false);
});

async function explorePage(query: string): Promise<{ results: { id: string; also?: string[] }[]; closest: boolean }> {
  const before = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  process.env.BUCKET_ADVISOR_REVIEW = path.join(__dirname, "fixtures", "no-advisor-review.json");
  delete process.env.BUCKET_ADVISOR_BUNDLE;
  const { GET } = await import("../src/app/api/explore/search/route");
  const url = new URL("http://x/api/explore/search");
  url.searchParams.set("q", query);
  url.searchParams.set("top_k", "50");
  const res = await GET(new NextRequest(url.toString())).finally(() => {
    if (before === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = before;
  });
  return JSON.parse(await res.text());
}

test("double helix structure of DNA falls back to closest matches and fills the list", async () => {
  const body = await explorePage("double helix structure of DNA");
  assert.equal(body.closest, true);
  assert.equal(body.results.length, 50);
});

test("galaxies recede in proportion to their distance stays empty, as the negative queries do", async () => {
  const galaxies = await explorePage("galaxies recede in proportion to their distance");
  assert.equal(galaxies.closest, false);
  assert.equal(galaxies.results.length, 0);
  for (const q of ["cheap flights to paris", "taylor swift tour dates", "bitcoin price today"]) {
    const body = await explorePage(q);
    assert.equal(body.results.length, 0, q);
    assert.equal(body.closest, false, q);
  }
});

test("a search in a script the index does not cover is recognised", () => {
  assert.equal(unreadableScript("термодинамика"), true);
  assert.equal(unreadableScript("熱力学"), true);
  assert.equal(unreadableScript("thermodynamics"), false);
  assert.equal(unreadableScript("Schrödinger"), false);
  assert.equal(unreadableScript("!!!"), false);
  assert.equal(unreadableScript(""), false);
});

test("no index row carries a replacement character", () => {
  const raw = fs.readFileSync(path.join(__dirname, "..", "src", "data", "explore-sources.json"), "utf8");
  assert.equal(raw.includes("\ufffd"), false);
  assert.ok(raw.includes("Über die Krümmung des Raumes"));
});
