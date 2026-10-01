import test from "node:test";
import assert from "node:assert/strict";
import {
  EXACT_TITLE_BONUS,
  FOUNDING_BONUS_CAP,
  dedupeWorks,
  foundingApproved,
  indexDoc,
  matchFounding,
  queryTerms,
  rank,
  scoreDoc,
  statsOf,
  terms,
  type FoundingRow,
  type RankDoc,
} from "../src/lib/explore/rank";
import { foundingCard, foundingFor, unverifiedFoundingAllowed, UNVERIFIED_FLAG } from "../src/lib/explore/founding";
import { buildCorpus, rankedPools } from "../src/lib/explore/ranked";
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
  const indexed = DOCS.map(indexDoc);
  const stats = statsOf(indexed);
  const q = queryTerms("natural selection");
  const exact = scoreDoc(q, indexDoc(doc("x", "Natural selection")), stats).score;
  const longer = scoreDoc(q, indexDoc(doc("y", "Natural selection again")), stats).score;
  assert.ok(exact > longer * (1 + EXACT_TITLE_BONUS / 2));
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
  const stats = statsOf(DOCS.map(indexDoc));
  const short = scoreDoc(queryTerms("finches"), indexDoc(doc("s", "Finches")), stats).score;
  const long = scoreDoc(queryTerms("finches"), indexDoc(doc("l", "Finches and many other birds of the islands and the mainland")), stats).score;
  assert.ok(short > long && long > 0);
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
});

test("a mislabelled founding row cannot outrank a better title match by more than the cap", () => {
  const plain = ranked("natural selection");
  const base = new Map(plain.map((x) => [x.doc.id, x.score]));
  for (const wrong of ["d", "f"]) {
    const boosted = ranked("natural selection", DOCS, new Map([[wrong, 1000]]));
    const got = new Map(boosted.map((x) => [x.doc.id, x.score]));
    assert.ok((got.get(wrong) ?? 0) - (base.get(wrong) ?? 0) <= FOUNDING_BONUS_CAP + 1e-9);
    for (const x of plain) {
      if (x.doc.id === wrong) continue;
      assert.equal(got.get(x.doc.id), x.score);
      assert.ok((got.get(wrong) ?? 0) - x.score <= FOUNDING_BONUS_CAP + 1e-9 || (base.get(wrong) ?? 0) > x.score);
      if (x.score - (base.get(wrong) ?? 0) > FOUNDING_BONUS_CAP) assert.ok(boosted.findIndex((y) => y.doc.id === x.doc.id) < boosted.findIndex((y) => y.doc.id === wrong));
    }
  }
  const unmatched = ranked("natural selection", DOCS, new Map([["f", 1000]])).find((x) => x.doc.id === "f");
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
  assert.ok(hits.some((h) => h.score > 1));
  assert.ok(!hits.some((h) => /granite/i.test(h.title)));
  assert.deepEqual(explore("zzqxv plorth"), []);
  assert.deepEqual(hits, explore("heat second law"));
});

test("any-term matching keeps rows under half of the query's weight and still drops rows that match nothing", () => {
  const strict = rankedPools("heat zzqxv plorth", CORPUS);
  assert.equal(strict.sources.length + strict.excerpts.length, 0);
  const any = rankedPools("heat zzqxv plorth", CORPUS, { minShare: 0 });
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
