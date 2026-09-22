/**
 * The admitted public-source corpus (ros-ai-corpus): normalization and
 * byte offsets against fixtures Python generated, source identities, the
 * rights policy, the builder's admission rules, revision behavior, the
 * validator against tampered artifacts, and staleness against a changed
 * graph. node:test, no database, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCorpus,
  curatedQuoteRevision,
  staleSources,
  validateCorpus,
  writeArtifacts,
  type CuratedPassage,
  type GraphNodeRow,
  type PassageRecord,
  type SourceRecord,
} from "../src/lib/research-os/evidence/corpus";
import { doiSourceId, graphSourceId, normalizeDoi, parseSourceId } from "../src/lib/research-os/evidence/identity";
import { indexRights, parsePolicy, quoteRights, type RightsPolicy } from "../src/lib/research-os/evidence/rights";
import { byteLength, byteSlice, normalizeText, OffsetError, sha256Hex } from "../src/lib/research-os/evidence/text";

const ROOT = path.join(__dirname, "..");
const policyText = readFileSync(path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json"), "utf8");
const POLICY = parsePolicy(JSON.parse(policyText));
const POLICY_SHA = sha256Hex(policyText);
const SEED = "supabase/seed/research-os-sky-blue.json";

interface FixtureCase {
  name: string;
  raw: string;
  normalized: string;
  bytes: number;
  originalSha256: string;
  normalizedSha256: string;
  spans: { start: number; end: number; text: string }[];
  insideCharacter: number[];
}
const FIXTURES = JSON.parse(readFileSync(path.join(ROOT, "src", "lib", "research-os", "evidence", "normalization-fixtures.json"), "utf8")) as {
  normalization: string;
  cases: FixtureCase[];
};

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const node = (n: number, over: Partial<GraphNodeRow> = {}): GraphNodeRow => ({
  id: uuid(n),
  slug: `node-${n}`,
  title: `Node ${n}`,
  kind: "concept",
  branch: "02-physics",
  visibility: "public",
  summary: `Summary of node ${n}.`,
  provenance: { type: "academy_atom" },
  superseded_by: null,
  ...over,
});
const seedSlugs = (...slugs: string[]) => new Map([[SEED, new Set(slugs)]]);
const WIKI: CuratedPassage = {
  text: "Rayleigh scattering is the scattering of light by particles much smaller than the wavelength.",
  locator: "Wikipedia, “Rayleigh scattering”, lead",
  url: "https://en.wikipedia.org/wiki/Rayleigh_scattering",
};

function artifactsOf(nodes: GraphNodeRow[], passages: Record<string, CuratedPassage>, seeds = seedSlugs("seeded"), policy: RightsPolicy = POLICY, limit = 500) {
  const result = buildCorpus({ nodes, passageFor: (s) => passages[s] ?? null, policy, seedSlugs: seeds, limit });
  const { files, manifest } = writeArtifacts(result, { createdAt: "2026-09-22T00:00:00Z", commit: "test", policy, policySha256: POLICY_SHA, limit });
  return { result, files, manifest };
}

test("normalization, byte length and both hashes match the Python fixtures", () => {
  assert.equal(FIXTURES.normalization, "nfc-lf/1");
  assert.equal(FIXTURES.cases.length, 8);
  for (const c of FIXTURES.cases) {
    const n = normalizeText(c.raw);
    assert.equal(n, c.normalized, c.name);
    assert.equal(byteLength(n), c.bytes, c.name);
    assert.equal(sha256Hex(c.raw), c.originalSha256, c.name);
    assert.equal(sha256Hex(n), c.normalizedSha256, c.name);
    for (const s of c.spans) assert.equal(byteSlice(n, s.start, s.end), s.text, `${c.name} [${s.start}, ${s.end})`);
  }
});

test("an offset inside a multibyte character is refused at either end of a span", () => {
  let checked = 0;
  for (const c of FIXTURES.cases) {
    for (const off of c.insideCharacter) {
      assert.throws(() => byteSlice(c.normalized, off, c.bytes), OffsetError, `${c.name} start ${off}`);
      assert.throws(() => byteSlice(c.normalized, 0, off), OffsetError, `${c.name} end ${off}`);
      checked++;
    }
  }
  assert.ok(checked >= 10, `checked ${checked} split offsets`);
  assert.throws(() => byteSlice("abc", 2, 1), OffsetError);
  assert.throws(() => byteSlice("abc", 0, 4), OffsetError);
  assert.throws(() => byteSlice("abc", -1, 2), OffsetError);
  assert.equal(byteSlice("abc", 3, 3), "");
});

test("source ids: graph uuids, DOIs in one compared form, and fetched URLs", () => {
  assert.equal(graphSourceId("0F8E6C1A-2B3D-4E5F-8A9B-0C1D2E3F4A5B"), "graph:0f8e6c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b");
  assert.throws(() => graphSourceId("not-a-uuid"));
  for (const raw of ["10.1098/RSPL.1868.0033", "https://doi.org/10.1098/rspl.1868.0033", "http://dx.doi.org/10.1098/rspl.1868.0033", "doi: 10.1098/rspl.1868.0033"]) {
    assert.equal(normalizeDoi(raw), "10.1098/rspl.1868.0033", raw);
  }
  assert.equal(normalizeDoi("not a doi"), null);
  assert.equal(normalizeDoi(null), null);
  assert.equal(doiSourceId("10.1080/14786447108640507"), "doi:10.1080/14786447108640507");
  assert.deepEqual(parseSourceId("graph:0f8e6c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b")?.kind, "graph");
  assert.deepEqual(parseSourceId("doi:10.1098/rspl.1868.0033")?.kind, "doi");
  assert.equal(parseSourceId("doi:10.1098/RSPL.1868.0033"), null, "an id must already be in compared form");
  const url = `url:https://example.org/page@${"a".repeat(64)}`;
  assert.deepEqual(parseSourceId(url), { kind: "url", id: url, url: "https://example.org/page", sha256: "a".repeat(64) });
  assert.equal(parseSourceId("url:https://example.org/page@short"), null);
  assert.equal(parseSourceId("url:ftp://example.org/x@" + "a".repeat(64)), null);
  assert.equal(parseSourceId("isbn:123"), null);
});

test("the committed rights policy parses, and a malformed rule fails loudly", () => {
  assert.equal(POLICY.status, "draft");
  const bad = (mutate: (p: RightsPolicy) => void) => {
    const p = JSON.parse(policyText) as RightsPolicy;
    mutate(p);
    return () => parsePolicy(p);
  };
  assert.throws(bad((p) => (p.index[0].evidence = [])), /evidence/);
  assert.throws(bad((p) => (p.index[1].id = p.index[0].id)), /repeated/);
  assert.throws(bad((p) => (p.quote[0].urlPrefix = "http://spaceplace.nasa.gov")), /urlPrefix/);
  assert.throws(bad((p) => (p.index[0].match = { provenanceType: "x", seedFile: "y" })), /match/);
  assert.throws(bad((p) => ((p as unknown as { status: string }).status = "maybe")), /status/);
  assert.throws(bad((p) => (p.index[0].rightsRevision = 0)), /rightsRevision/);
});

test("index rights turn on who wrote the text; quote rights on the page's license", () => {
  const seeds = seedSlugs("why-the-sky-is-blue");
  assert.equal(indexRights(POLICY, { slug: "why-the-sky-is-blue", provenanceType: "reference" }, seeds).status, "allowed");
  assert.equal(indexRights(POLICY, { slug: "other-reference", provenanceType: "reference" }, seeds).status, "unknown");
  assert.equal(indexRights(POLICY, { slug: "a", provenanceType: "academy_atom" }, seeds).status, "allowed");
  const excerpt = indexRights(POLICY, { slug: "b", provenanceType: "source_excerpt" }, seeds);
  assert.equal(excerpt.status, "denied");
  assert.match(excerpt.status === "denied" ? excerpt.reason : "", /third party/);
  assert.equal(indexRights(POLICY, { slug: "c", provenanceType: null }, seeds).status, "unknown");
  assert.equal(quoteRights(POLICY, "https://en.wikipedia.org/wiki/Light").status, "allowed");
  assert.equal(quoteRights(POLICY, "https://www.gutenberg.org/ebooks/24527").status, "allowed");
  assert.equal(quoteRights(POLICY, "https://example.org/blog").status, "unknown");
  assert.equal(quoteRights(POLICY, "https://en.wikipedia.org.evil.example/").status, "unknown", "a prefix ends in a slash");
});

test("the builder admits permitted public nodes and names why the rest stay out", () => {
  const nodes = [
    node(1, { slug: "seeded", provenance: { type: "reference", author: "Wikipedia contributors", year: 2026, title: "Rayleigh scattering" } }),
    node(2),
    node(3, { kind: "excerpt", provenance: { type: "source_excerpt" } }),
    node(4, { visibility: "private" }),
    node(5, { superseded_by: uuid(2) }),
    node(6, { provenance: { type: "canon_paper" } }),
    node(7, { provenance: { type: "mystery" } }),
    node(8, { slug: "unlicensed-quote" }),
  ];
  const passages = { seeded: WIKI, "unlicensed-quote": { ...WIKI, url: "https://example.org/copy" } };
  const { result } = artifactsOf(nodes, passages);
  assert.deepEqual(result.records.map((r) => r.slug).sort(), ["node-2", "seeded", "unlicensed-quote"]);
  const why = (slug: string) => result.rejected.filter((r) => r.slug === slug).map((r) => `${r.scope}: ${r.reason}`);
  assert.match(why("node-3")[0], /index: a source excerpt/);
  assert.match(why("node-4")[0], /visibility is private/);
  assert.match(why("node-5")[0], /superseded by/);
  assert.match(why("node-6")[0], /belongs to its publisher/);
  assert.match(why("node-7")[0], /unknown copying rights for provenance type mystery/);
  assert.match(why("unlicensed-quote")[0], /quote: unknown copying rights for https:\/\/example.org\/copy/);
  const unlicensed = result.records.find((r) => r.slug === "unlicensed-quote")!;
  assert.deepEqual(unlicensed.passageIds, [], "indexed, with no quote");
  assert.equal(result.passages.length, 1);
});

test("a passage's span holds its text, and its quote revision is the one the receipts record", () => {
  const nodes = [node(1, { id: "0f8e6c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b", slug: "seeded", title: "Why the sky is blue", provenance: { type: "textbook", author: "NASA Space Place", year: 2024, title: "Why Is the Sky Blue?" } })];
  const passage: CuratedPassage = {
    text: "Blue light is scattered in all directions by the tiny molecules of air in Earth's atmosphere.",
    locator: "NASA Space Place, “Why Is the Sky Blue?”, body text",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  };
  const { result } = artifactsOf(nodes, { seeded: passage });
  const [r] = result.records;
  const [p] = result.passages;
  assert.equal(byteSlice(r.text, p.start, p.end), passage.text);
  assert.equal(p.passageId, `${r.sourceId}#${passage.locator}`);
  // Computed with curatedSourceRevision on feat/ros-ai-receipts (#196) for this exact input.
  assert.equal(p.quoteRevision, "62853120a5ccdd51ca8cc1479a38b9c7a1f77d016aa28be4f9692b65dc65024a");
  assert.equal(r.citation.label, "NASA Space Place (2024). Why Is the Sky Blue?.");
  assert.equal(
    curatedQuoteRevision({ nodeId: r.nodeId, text: passage.text, locator: passage.locator, citation: r.citation.label }),
    p.quoteRevision,
  );
});

test("text is normalized once and both hashes are kept", () => {
  const { result } = artifactsOf([node(1, { summary: "Ampère\r\nand Poincaré" })], {});
  const [r] = result.records;
  assert.equal(r.text, "Node 1\n\nAmpère\nand Poincaré");
  assert.equal(r.bodyHash, sha256Hex(r.text));
  assert.notEqual(r.originalHash, r.bodyHash);
});

test("a primary source's DOI is its identity; two such nodes on one DOI stop the build", () => {
  const paper = (n: number, doi: string) => node(n, { kind: "primary_source", slug: `paper-${n}`, provenance: { type: "academy_atom", doi } });
  const { result } = (() => {
    const r = buildCorpus({ nodes: [paper(1, "10.1080/ABC"), paper(2, "https://doi.org/10.1080/abc")], passageFor: () => null, policy: POLICY, seedSlugs: seedSlugs() });
    return { result: r };
  })();
  assert.deepEqual(result.conflicts, ["alias doi:10.1080/abc is held by paper-1, paper-2"]);
  assert.throws(
    () => writeArtifacts(result, { createdAt: "x", commit: "t", policy: POLICY, policySha256: POLICY_SHA, limit: 500 }),
    /identity conflicts/,
  );
});

test("a law and a fact citing one paper are two sources", () => {
  const cites = (n: number) => node(n, { kind: "law", slug: `law-${n}`, summary: `Law ${n}.`, provenance: { type: "academy_atom", doi: "10.1080/14786447108640507" } });
  const { result } = artifactsOf([cites(1), cites(2)], {});
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.records.map((r) => r.aliases), [[], []]);
});

test("identical bodies are reported for dedup and both still index", () => {
  const { result, manifest } = artifactsOf([node(1, { title: "Energy", summary: null }), node(2, { title: "Energy", summary: null })], {});
  assert.equal(result.records.length, 2);
  assert.deepEqual(manifest.duplicates, [["node-1", "node-2"]]);
});

test("a capped build keeps quotable sources first, then the policy's rule order", () => {
  const nodes = [node(1, { slug: "aaa" }), node(2, { slug: "zzz-seeded" }), node(3, { slug: "mmm-quoted" })];
  const { result, manifest } = artifactsOf(nodes, { "mmm-quoted": WIKI }, seedSlugs("zzz-seeded", "mmm-quoted"), POLICY, 2);
  assert.deepEqual(result.records.map((r) => r.slug), ["mmm-quoted", "zzz-seeded"]);
  assert.equal(manifest.truncatedFrom, 3);
  assert.equal(manifest.counts.admitted, 2);
});

test("revisions: the same input gives the same corpus; an edit to text or passage moves them", () => {
  const nodes = [node(1, { slug: "seeded" }), node(2)];
  const a = artifactsOf(nodes, { seeded: WIKI });
  const b = artifactsOf(nodes, { seeded: WIKI });
  assert.equal(a.manifest.corpusRevision, b.manifest.corpusRevision);
  assert.equal(a.files["sources.jsonl"], b.files["sources.jsonl"]);
  const edited = artifactsOf([node(1, { slug: "seeded" }), node(2, { summary: "Changed." })], { seeded: WIKI });
  assert.notEqual(edited.manifest.corpusRevision, a.manifest.corpusRevision);
  assert.equal(edited.result.records.find((r) => r.slug === "seeded")!.sourceRevision, a.result.records.find((r) => r.slug === "seeded")!.sourceRevision);
  const moved = artifactsOf(nodes, { seeded: { ...WIKI, locator: "Wikipedia, section 2" } });
  const before = a.result.passages[0];
  const after = moved.result.passages[0];
  assert.notEqual(after.quoteRevision, before.quoteRevision);
  assert.notEqual(moved.result.records[0].sourceRevision, a.result.records[0].sourceRevision);
});

test("the validator accepts sound artifacts and names each kind of tampering", () => {
  const { files, manifest } = artifactsOf([node(1, { slug: "seeded" }), node(2, { summary: "Sky \u{1F324} blue." })], { seeded: WIKI });
  assert.deepEqual(validateCorpus(manifest, files, POLICY, POLICY_SHA), []);

  // Rewrites one file and repins it, so each check is reached on its own.
  const repin = (name: "sources.jsonl" | "passages.jsonl", edit: (rows: Record<string, unknown>[]) => void) => {
    const rows = files[name].split("\n").filter(Boolean).map((l) => JSON.parse(l));
    edit(rows);
    const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const m = JSON.parse(JSON.stringify(manifest));
    m.files[name].sha256 = sha256Hex(text);
    return validateCorpus(m, { ...files, [name]: text }, POLICY, POLICY_SHA).join("\n");
  };

  assert.match(validateCorpus(manifest, { ...files, "sources.jsonl": files["sources.jsonl"] + "{}\n" }, POLICY, POLICY_SHA).join("\n"), /does not match the hash/);
  assert.match(repin("sources.jsonl", (rows) => (rows[1].text = String(rows[1].text) + " extra")), /does not match its bodyHash/);
  assert.match(repin("sources.jsonl", (rows) => (rows[0].citation = { label: "someone else", title: "x" })), /sourceRevision does not match|quoteRevision does not match/);
  assert.match(repin("sources.jsonl", (rows) => (rows[1].rights = { rule: "canon-paper", permission: "x", rightsRevision: 1 })), /no current index permission/);
  assert.match(repin("passages.jsonl", (rows) => (rows[0].start = Number(rows[0].start) + 1)), /span does not hold its text/);
  assert.match(repin("passages.jsonl", (rows) => (rows[0].original = "Invented words.")), /original text does not match/);
  assert.match(repin("sources.jsonl", (rows) => (rows[1].sourceId = "graph:not-a-uuid")), /does not name its node/);
  assert.match(repin("sources.jsonl", (rows) => rows.push({})), /record 3 is missing a required field/);
  assert.match(repin("passages.jsonl", (rows) => delete rows[0].end), /record 1 is missing a required field/);
  assert.match(validateCorpus({ ...manifest, rightsPolicy: { ...manifest.rightsPolicy, sha256: "0".repeat(64) } }, files, POLICY, POLICY_SHA).join("\n"), /rights policy changed/);
  assert.match(validateCorpus({ ...manifest, limit: 1 }, files, POLICY, POLICY_SHA).join("\n"), /exceed the limit/);
  assert.match(validateCorpus(manifest, { ...files, "sources.jsonl": files["sources.jsonl"].slice(0, -1) }, POLICY, POLICY_SHA).join("\n"), /torn/);

  const bumped = JSON.parse(policyText) as RightsPolicy;
  bumped.index.find((r) => r.id === "academy-atom")!.rightsRevision = 2;
  assert.match(validateCorpus(manifest, files, parsePolicy(bumped), POLICY_SHA).join("\n"), /node-2 has no current index permission/);
});

test("a span landing inside the emoji is refused by the validator", () => {
  const nodes = [node(1, { slug: "seeded", summary: "Sky \u{1F324}" })];
  const passage = { ...WIKI, text: "\u{1F324} blue light" };
  const { files, manifest, result } = artifactsOf(nodes, { seeded: passage });
  const p = result.passages[0] as PassageRecord;
  const rows = files["passages.jsonl"].split("\n").filter(Boolean).map((l) => JSON.parse(l));
  rows[0].start = p.start + 1;
  const text = rows.map((r: unknown) => JSON.stringify(r)).join("\n") + "\n";
  const m = JSON.parse(JSON.stringify(manifest));
  m.files["passages.jsonl"].sha256 = sha256Hex(text);
  assert.match(validateCorpus(m, { ...files, "passages.jsonl": text }, POLICY, POLICY_SHA).join("\n"), /falls inside a multibyte character/);
});

test("staleness: an edited, hidden or deleted node is stale; an untouched one is current", () => {
  const nodes = [node(1, { slug: "seeded" }), node(2), node(3), node(4)];
  const { result } = artifactsOf(nodes, { seeded: WIKI });
  const records = result.records as SourceRecord[];
  const live = new Map(nodes.map((n) => [n.id, { ...n }]));
  live.get(uuid(2))!.summary = "Edited.";
  live.get(uuid(3))!.visibility = "private";
  live.delete(uuid(4));
  const stale = staleSources(records, live, (s) => (s === "seeded" ? WIKI : null), POLICY, seedSlugs("seeded"));
  assert.deepEqual(
    stale.map((s) => [s.slug, s.reason]).sort(),
    [
      ["node-2", "the node's text, citation or passage changed"],
      ["node-3", "visibility is private"],
      ["node-4", "the node is gone"],
    ],
  );
  const movedQuote = staleSources(records, new Map(nodes.map((n) => [n.id, n])), (s) => (s === "seeded" ? { ...WIKI, text: WIKI.text + " More." } : null), POLICY, seedSlugs("seeded"));
  assert.deepEqual(movedQuote.map((s) => s.slug), ["seeded"]);
});
