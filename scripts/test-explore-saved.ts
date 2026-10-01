import test from "node:test";
import assert from "node:assert/strict";
import type { Hit } from "../src/lib/explore/search";
import {
  EMPTY_SAVED,
  SAVED_KEY,
  SAVED_LIMIT,
  addSaved,
  bibEscape,
  bibKey,
  bibtex,
  changeSaved,
  citable,
  citeFieldsFromHit,
  importSaved,
  parseStored,
  safeUrl,
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
  assert.match(b, /^@book\{anonndthe-[0-9a-z]{7},/);
  assert.equal(citable(citeFieldsFromHit(ANON_BOOK)!), false);
  assert.equal(citable(citeFieldsFromHit(BOOK)!), true);
});

test("a talk never presents its channel as the author, so it is saved and not cited", () => {
  const s = savedItemFromHit(TALK, NOW)!;
  assert.equal(s.kind, "talk");
  assert.equal(s.authors, "");
  assert.equal(s.citation.includes("Nathan Hawkins"), false);
  assert.equal(citable(s), false);
  assert.equal(s.url, "https://www.youtube.com/watch?v=-4O4hUwcpDw");
});

test("a canon excerpt has no author, an absolute site link and no licence field", () => {
  const s = savedItemFromHit(EXCERPT, NOW)!;
  assert.equal(s.kind, "excerpt");
  assert.equal(s.citation, "Author not listed (year not listed). The second law. Bucket Foundation canon. https://www.bucket.foundation/excerpts/thermodynamics/second-law");
  assert.equal("licence" in s, false);
  assert.equal(citable(s), false);
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
  assert.match(b, /^@article\{eilenberg1945risk-[0-9a-z]{7},/);
  assert.ok(b.includes("title = {Risk \\& \\{choice\\} 100\\%}"));
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
  assert.deepEqual(readSaved(blocked), { state: EMPTY_SAVED, ok: false, status: "blocked" });
  assert.equal(writeSaved(blocked, state), false);
  assert.deepEqual(readSaved(null), { state: EMPTY_SAVED, ok: false, status: "blocked" });
  assert.equal(writeSaved(undefined, state), false);
  const mem = new Map<string, string>();
  const good = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  assert.equal(writeSaved(good, state), true);
  assert.equal(SAVED_KEY, "bucket.explore.saved.v1");
  assert.ok(mem.has("bucket.explore.saved.v1"));
  assert.deepEqual(readSaved(good), { state, ok: true, status: "ok" });
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

test("a title with braces, quotes and a backslash keeps every character", () => {
  assert.equal(bibEscape('The {"real"} C:\\path_1'), 'The \\{"real"\\} C:\\textbackslash{}path\\_1');
  const b = bibtex(savedItemFromHit({ ...PAPER, title: 'The {"real"} C:\\path' }, NOW)!);
  assert.ok(b.includes('title = {The \\{"real"\\} C:\\textbackslash{}path}'));
  const unescaped = b.replace(/\\[{}]/g, "").replace(/\\textbackslash\{\}/g, "");
  assert.equal((unescaped.match(/\{/g) ?? []).length, (unescaped.match(/\}/g) ?? []).length);
});

test("two items with the same author, year and first word get different keys", () => {
  const a = savedItemFromHit(PAPER, NOW)!;
  const b = { ...a, id: "paper:d/10.1000/other" };
  assert.notEqual(bibKey(a), bibKey(b));
  assert.equal(bibKey(a), bibKey({ ...a }));
});

test("a hostile stored value is dropped on read", () => {
  const good = savedItemFromHit(PAPER, NOW)!;
  const hostile = [
    { ...good, id: "h1", url: "javascript:alert(1)" },
    { ...good, id: "h2", url: " javascript:alert(1)" },
    { ...good, id: "h3", url: "JaVaScRiPt:alert(1)" },
    { ...good, id: "h4", url: "data:text/html,<script>1</script>" },
    { ...good, id: "h5", url: "//evil.example/x" },
    { ...good, id: "h6", url: "/\\evil.example" },
    { ...good, id: "h7", url: "https://ok.example/\njavascript:1" },
    { ...good, id: "h8", url: 7 },
    { ...good, id: "h9", title: "x".repeat(501) },
    { ...good, id: "h10", citation: "x".repeat(2001) },
    { ...good, id: "h11", year: 1.5 },
    { ...good, id: "h12", year: "1999" },
    { ...good, id: "h13", savedAt: "soon" },
    { ...good, id: "h14", kind: "script" },
    { ...good, id: "h15", authors: ["a"] },
    { ...good, id: "h16", licence: 3 },
    { ...good, id: "" },
    [good],
  ];
  const kept = { ...good, id: "k1", url: "/excerpts/a/b", extra: "<img onerror=1>" };
  const r = parseStored(JSON.stringify({ v: 1, items: [...hostile, good, kept] }));
  assert.equal(r.status, "ok");
  assert.deepEqual(r.state.items.map((i) => i.id), [good.id, "k1"]);
  assert.equal("extra" in r.state.items[1], false);
  for (const u of ["https://a.example/x", "http://a.example", "/explore#saved", null]) assert.equal(safeUrl(u), true);
  for (const u of ["javascript:alert(1)", "vbscript:x", "ftp://a.example", "", "mailto:a@b.c", "https://"]) assert.equal(safeUrl(u), false);
});

test("a value that cannot be read is never written over", () => {
  const item = savedItemFromHit(PAPER, NOW)!;
  for (const raw of ["{not a list", JSON.stringify({ v: 2, items: [item] })]) {
    const mem = new Map<string, string>([[SAVED_KEY, raw]]);
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    assert.equal(readSaved(store).status, "damaged");
    const r = changeSaved(store, EMPTY_SAVED, { add: item });
    assert.equal(r.kept, false);
    assert.deepEqual(r.state.items, [item]);
    assert.equal(mem.get(SAVED_KEY), raw);
  }
});

test("a change applies to what the other tab stored, merged by id", () => {
  const a = savedItemFromHit(PAPER, NOW)!;
  const b = savedItemFromHit(BOOK, NOW)!;
  const c = savedItemFromHit(TALK, NOW)!;
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  const tabOne = changeSaved(store, EMPTY_SAVED, { add: a }).state;
  changeSaved(store, EMPTY_SAVED, { add: b });
  const merged = changeSaved(store, tabOne, { add: c });
  assert.equal(merged.kept, true);
  assert.deepEqual(merged.state.items.map((i) => i.id).sort(), [a.id, b.id, c.id].sort());
  assert.deepEqual(changeSaved(store, tabOne, { add: a }).state.items.length, 3);
  assert.deepEqual(changeSaved(store, tabOne, { remove: b.id }).state.items.map((i) => i.id).sort(), [a.id, c.id].sort());
});

test("export then import yields the same items and refuses anything else", () => {
  const state = addSaved(addSaved(addSaved(EMPTY_SAVED, savedItemFromHit(PAPER, NOW)!), savedItemFromHit(EXCERPT, NOW)!), savedItemFromHit(TALK, NOW)!);
  const raw = JSON.stringify(exportSaved(state, NOW), null, 2);
  assert.deepEqual(importSaved(raw), state.items);
  assert.equal(importSaved("{"), null);
  assert.equal(importSaved(JSON.stringify({ kind: "other", version: 1, items: [] })), null);
  assert.equal(importSaved(JSON.stringify({ kind: "bucket.explore.saved", version: 2, items: [] })), null);
  assert.deepEqual(importSaved(JSON.stringify({ kind: "bucket.explore.saved", version: 1, items: [{ ...state.items[0], url: "javascript:1" }] })), []);
});
