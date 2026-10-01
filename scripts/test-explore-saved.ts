import test from "node:test";
import assert from "node:assert/strict";
import type { Hit } from "../src/lib/explore/search";
import {
  EMPTY_SAVED,
  SAVED_KEY,
  SAVED_LIMIT,
  addSaved,
  bibtex,
  doiOf,
  exportFileName,
  exportSaved,
  markerCiteFields,
  buildSavedItem,
  parseSaved,
  readSaved,
  removeSaved,
  savedItemFromHit,
  serializeSaved,
  writeSaved,
  type SavedItem,
} from "../src/lib/explore/saved";

const NOW = new Date("2026-10-01T12:00:00.000Z");

function hit(over: Partial<Hit>): Hit {
  return { id: "x", type: "paper", title: "T", subtitle: "", text: "", score: 1, branch: "", year: null, url: null, links: [], ...over };
}

const PAPER = hit({
  id: "paper:d/10.1090/s0002-9947-1945-0013131-6",
  title: "General theory of natural equivalences",
  subtitle: "Samuel Eilenberg, Saunders MacLane · Primary paper",
  branch: "Primary paper",
  source: "Primary paper",
  license: "Crossref and OpenAlex metadata, CC0",
  year: 1945,
  url: "https://doi.org/10.1090/s0002-9947-1945-0013131-6",
});
const BOOK = hit({
  id: "text:g/1041",
  type: "text",
  title: "Shakespeare's Sonnets",
  subtitle: "Shakespeare, William · Gutenberg",
  branch: "Gutenberg",
  source: "Gutenberg",
  license: "Project Gutenberg, public domain in the US",
  year: null,
  url: "https://www.gutenberg.org/ebooks/1041",
});
const ANON_BOOK = hit({ ...BOOK, id: "text:g/10", title: "The King James Version of the Bible", subtitle: "Gutenberg", url: "https://www.gutenberg.org/ebooks/10" });
const TALK = hit({
  id: "talk:y/-4O4hUwcpDw",
  type: "talk",
  title: "WITTGENSTEIN: Interview with Prof. Michael Potter",
  subtitle: "Nathan Hawkins · YouTube",
  branch: "YouTube",
  source: "YouTube",
  license: "YouTube transcript, link only",
  year: 2022,
  url: "https://www.youtube.com/watch?v=-4O4hUwcpDw",
});
const EXCERPT = hit({
  id: "excerpt:02-physics/thermodynamics/second-law",
  type: "excerpt",
  title: "The second law",
  subtitle: "physics · thermodynamics",
  branch: "02-physics",
  year: null,
  url: "/excerpts/thermodynamics/second-law",
});

test("a paper with a DOI cites its authors, year and a doi.org link", () => {
  const s = savedItemFromHit(PAPER, NOW)!;
  assert.equal(s.kind, "paper");
  assert.equal(s.authors, "Samuel Eilenberg, Saunders MacLane");
  assert.equal(s.url, "https://doi.org/10.1090/s0002-9947-1945-0013131-6");
  assert.equal(s.citation, "Samuel Eilenberg, Saunders MacLane (1945). General theory of natural equivalences. Primary paper. https://doi.org/10.1090/s0002-9947-1945-0013131-6");
  assert.equal(s.licence, "Crossref and OpenAlex metadata, CC0");
  assert.equal(s.savedAt, "2026-10-01T12:00:00.000Z");
});

test("a DOI found on another host still becomes a doi.org link", () => {
  const s = savedItemFromHit(hit({ id: "paper:o/W1", source: "OpenAlex", subtitle: "OpenAlex", url: "https://example.org/x/10.1000/abc.123." }), NOW)!;
  assert.equal(s.url, "https://doi.org/10.1000/abc.123");
  assert.equal(doiOf("https://openalex.org/W3011865677"), null);
});

test("a Gutenberg book with no year says so and keeps its licence note", () => {
  const s = savedItemFromHit(BOOK, NOW)!;
  assert.equal(s.kind, "book");
  assert.equal(s.year, null);
  assert.equal(s.citation, "Shakespeare, William (year not listed). Shakespeare's Sonnets. Gutenberg. https://www.gutenberg.org/ebooks/1041");
  assert.equal(s.licence, "Project Gutenberg, public domain in the US");
});

test("a book with no author and no year states both and invents neither", () => {
  const s = savedItemFromHit(ANON_BOOK, NOW)!;
  assert.equal(s.authors, "");
  assert.equal(s.citation, "Author not listed (year not listed). The King James Version of the Bible. Gutenberg. https://www.gutenberg.org/ebooks/10");
  const b = bibtex(s);
  assert.doesNotMatch(b, /author\s*=/);
  assert.doesNotMatch(b, /year\s*=/);
  assert.match(b, /^@book\{anonndthe,/);
});

test("a talk cites the channel the row names and its watch link", () => {
  const s = savedItemFromHit(TALK, NOW)!;
  assert.equal(s.kind, "talk");
  assert.equal(s.citation, "Nathan Hawkins (2022). WITTGENSTEIN: Interview with Prof. Michael Potter. YouTube. https://www.youtube.com/watch?v=-4O4hUwcpDw");
  assert.match(bibtex(s), /^@misc\{hawkins2022wittgenstein,/);
});

test("a canon excerpt has no author, an absolute site link and no licence field", () => {
  const s = savedItemFromHit(EXCERPT, NOW)!;
  assert.equal(s.kind, "excerpt");
  assert.equal(s.citation, "Author not listed (year not listed). The second law. Bucket Foundation canon. https://www.bucket.foundation/excerpts/thermodynamics/second-law");
  assert.equal("licence" in s, false);
});

test("people and a visitor's own upload are not saved items", () => {
  assert.equal(savedItemFromHit(hit({ id: "advisor:1", type: "advisor", title: "A Person", subtitle: "physics" }), NOW), null);
  assert.equal(savedItemFromHit(hit({ id: "you:1", type: "you" }), NOW), null);
});

test("the subtitle of a canon row is never read as an author", () => {
  assert.equal(savedItemFromHit(hit({ id: "work:02-physics/entropy", type: "work", title: "entropy", subtitle: "physics · 3 excerpts", branch: "02-physics" }), NOW)!.authors, "");
});

test("BibTeX for a paper carries the doi and escapes special characters", () => {
  const b = bibtex(savedItemFromHit({ ...PAPER, title: "Risk & {choice} 100%" }, NOW)!);
  assert.match(b, /^@article\{eilenberg1945risk,/);
  assert.match(b, /title = \{Risk \\& choice 100\\%\}/);
  assert.match(b, /doi = \{10\.1090\/s0002-9947-1945-0013131-6\}/);
  assert.match(b, /author = \{Samuel Eilenberg, Saunders MacLane\}/);
});

test("a globe marker becomes a canon entry with a BCE year", () => {
  const s = buildSavedItem(markerCiteFields({ id: "ev-1", title: "Elements", year: -300, path: null, excerpt: false }), NOW);
  assert.equal(s.id, "canon:ev-1");
  assert.equal(s.url, null);
  assert.equal(s.citation, "Author not listed (300 BCE). Elements. Bucket Foundation canon.");
});

test("stored value round-trips with its version and drops bad rows", () => {
  const a = savedItemFromHit(PAPER, NOW)!;
  const state = addSaved(addSaved(EMPTY_SAVED, a), a);
  assert.equal(state.items.length, 1);
  const raw = serializeSaved(state);
  assert.equal(JSON.parse(raw).v, 1);
  assert.deepEqual(parseSaved(raw).items, [a]);
  assert.deepEqual(parseSaved(JSON.stringify({ v: 1, items: [a, a, { id: "bad" }, null, 7] })).items, [a]);
  for (const bad of [null, "", "{", "[]", "null", JSON.stringify({ v: 2, items: [a] }), JSON.stringify({ v: 1, items: "x" })]) assert.deepEqual(parseSaved(bad), EMPTY_SAVED);
  assert.deepEqual(removeSaved(state, a.id).items, []);
});

test("the list stops at its limit", () => {
  let state = EMPTY_SAVED;
  const base = savedItemFromHit(PAPER, NOW)!;
  for (let i = 0; i <= SAVED_LIMIT; i++) state = addSaved(state, { ...base, id: `p${i}` });
  assert.equal(state.items.length, SAVED_LIMIT);
});

test("blocked, full or missing storage never throws", () => {
  const item = savedItemFromHit(PAPER, NOW) as SavedItem;
  const state = addSaved(EMPTY_SAVED, item);
  const blocked = {
    getItem(): string | null {
      throw new Error("blocked");
    },
    setItem(): void {
      throw new Error("quota");
    },
  };
  assert.deepEqual(readSaved(blocked), { state: EMPTY_SAVED, ok: false });
  assert.equal(writeSaved(blocked, state), false);
  assert.deepEqual(readSaved(null), { state: EMPTY_SAVED, ok: false });
  assert.equal(writeSaved(undefined, state), false);
  const mem = new Map<string, string>();
  const good = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  assert.equal(writeSaved(good, state), true);
  assert.equal(SAVED_KEY, "bucket.explore.saved.v1");
  assert.ok(mem.has("bucket.explore.saved.v1"));
  assert.deepEqual(readSaved(good), { state, ok: true });
});

test("the export carries every item, a version and a dated name", () => {
  const state = addSaved(addSaved(EMPTY_SAVED, savedItemFromHit(PAPER, NOW)!), savedItemFromHit(TALK, NOW)!);
  const out = exportSaved(state, NOW);
  assert.equal(out.kind, "bucket.explore.saved");
  assert.equal(out.version, 1);
  assert.equal(out.exportedAt, "2026-10-01T12:00:00.000Z");
  assert.equal(out.items.length, 2);
  assert.equal(exportFileName(NOW), "bucket-saved-2026-10-01.json");
});
