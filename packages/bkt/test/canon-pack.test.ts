import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseCanonSearchParams } from "../../../src/lib/canon-rank";
import { CANON_DEFAULT_TOP_K } from "../src/canon";
import { packCanon, searchCanon } from "../src/core/search";
import { findKruse, kruseMarkers } from "../scripts/check-no-kruse";
import { assemble, buildCanonPack, CANON_PACK_BUDGET_BYTES, claimMeta, describeCounts, keepGraph, kindOf, LICENCES, QUOTATION_NOTICE, readInputs, sourceMeta } from "../src/pack/canon";
import { buildDenylist, deniedVideoIds, denyRef, denyRow, keepConnections, keepVectorRows, residual, videoIdsIn, withDeniedFiles, type Denylist } from "../src/pack/rights";

const REPO = resolve(import.meta.dir, "../../..");
const DENIED_ID = "AAAAAAAAAAA";
const CLEAN_ID = "BBBBBBBBBBB";
const OWNER = ["Kr", "use"].join("");
const deny: Denylist = { videoIds: new Set([DENIED_ID]), prefixes: [`_intake/${OWNER.toLowerCase()}-blog-corpus`], files: new Set(["_intake/mixed.md"]), unreadable: new Set() };

const pack = buildCanonPack(REPO);

describe("rights filter", () => {
  test("denies by path prefix, video id, path name and listed file, and never by title", () => {
    expect(denyRef(deny, `_intake/${OWNER.toLowerCase()}-blog-corpus/articles/a.md`)).toBe("prefix");
    expect(denyRef(deny, `/srv/checkout/bucket-foundation/_intake/${OWNER.toLowerCase()}-blog-corpus/a.md`)).toBe("prefix");
    expect(denyRef(deny, `yt/${DENIED_ID}-some-talk/transcript.txt`)).toBe("video");
    expect(denyRef(deny, `https://www.youtube.com/watch?v=${DENIED_ID}&t=12`)).toBe("video");
    expect(denyRef(deny, `https://youtu.be/${DENIED_ID}`)).toBe("video");
    expect(denyRef(deny, `${DENIED_ID}-some-talk`)).toBe("video");
    expect(denyRef(deny, `blog/dr-${OWNER.toLowerCase()}-site/post.md`)).toBe("path");
    expect(denyRef(deny, "_intake/mixed.md")).toBe("file");
    expect(denyRef(deny, `yt/${CLEAN_ID}-other-talk/transcript.txt`)).toBeNull();
    expect(denyRow(deny, [`yt/${CLEAN_ID}-other-talk/transcript.txt`], "a passage about light")).toBeNull();
    expect(denyRow(deny, ["pubmed/PMID-1-x"], `as ${OWNER} said`)).toBe("text");
    expect(videoIdsIn(`https://www.youtube.com/embed/${CLEAN_ID}?x=1`)).toEqual([CLEAN_ID]);
  });

  test("vector rows keep the row index of the excerpts that survive", () => {
    const m = new Float32Array([0, 0, 1, 1, 2, 2, 3, 3]);
    expect([...keepVectorRows(m, 2, [1, 3])]).toEqual([1, 1, 3, 3]);
    expect(() => keepVectorRows(m, 2, [4])).toThrow();
  });

  test("connections lose a denied node and every edge that touches it", () => {
    const g = { nodes: [{ id: "a" }, { id: "b", url: `https://youtu.be/${DENIED_ID}` }, { id: "c" }], edges: [{ source: "a", target: "b" }, { source: "a", target: "c" }] };
    const kept = keepConnections(deny, g);
    expect(kept.denied).toBe(1);
    expect(kept.graph.nodes.map((n) => n.id)).toEqual(["a", "c"]);
    expect(kept.graph.edges).toEqual([{ source: "a", target: "c" }]);
  });

  test("an aggregate file is denied when it cites a denied video or cannot be read", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-rights-"));
    try {
      mkdirSync(join(dir, "_intake"), { recursive: true });
      writeFileSync(join(dir, "_intake/cites.md"), `see https://www.youtube.com/watch?v=${DENIED_ID}`);
      writeFileSync(join(dir, "_intake/clean.md"), "nothing here");
      const d = withDeniedFiles(dir, { ...deny, files: new Set() }, ["_intake/cites.md", "_intake/clean.md", "_intake/gone.md", "pubmed/PMID-1-x"]);
      expect([...d.files].sort()).toEqual(["_intake/cites.md", "_intake/gone.md"]);
      expect([...d.unreadable]).toEqual(["_intake/gone.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a yt tree with no denied video stops the build", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-rights-"));
    try {
      mkdirSync(join(dir, `yt/${CLEAN_ID}-other-talk`), { recursive: true });
      writeFileSync(join(dir, `yt/${CLEAN_ID}-other-talk/info.md`), "# A talk");
      expect(() => deniedVideoIds(dir)).toThrow(/no denied video/);
      expect(() => deniedVideoIds(join(dir, "missing"))).toThrow(/missing/);
      mkdirSync(join(dir, `yt/${DENIED_ID}-a-talk`), { recursive: true });
      writeFileSync(join(dir, `yt/${DENIED_ID}-a-talk/info.md`), "# A talk");
      writeFileSync(join(dir, `yt/${DENIED_ID}-a-talk/metadata.json`), JSON.stringify({ channel: `Dr. ${OWNER}` }));
      expect(() => deniedVideoIds(dir)).toThrow(/disagree/);
      writeFileSync(join(dir, `yt/${DENIED_ID}-a-talk/info.md`), `# A talk with ${OWNER}`);
      expect([...deniedVideoIds(dir)]).toEqual([DENIED_ID]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("canon pack counts", () => {
  test("the filter's counts on this repo", () => {
    for (const l of describeCounts(pack.counts)) console.log(l);
    const c = pack.counts;
    expect(c.videoIds).toBe(167);
    expect(c.excerpts).toEqual({ total: 599, kept: 364, denied: { prefix: 0, video: 235, path: 0, file: 0, text: 0 } });
    expect(c.passages.total).toBe(5990);
    expect(c.passages.denied).toEqual({ prefix: 1165, video: 519, path: 0, file: 692, text: 0 });
    expect(c.passages.droppedWithExcerpt).toBe(527);
    expect(c.passages.kept).toBe(2104);
    expect(c.passages.dropped).toEqual({ licence: { blog: 930, archive: 28, wikisource: 23 }, noSource: { pubmed: 2 } });
    expect(c.passages.namedInListedFolders + c.passages.namedElsewhere).toBe(126);
    expect(c.vectorRows).toEqual({ total: 599, kept: 364 });
    expect(c.connections.denied).toBe(0);
    const denied = Object.values(c.passages.denied).reduce((a, b) => a + b, 0);
    const dropped = Object.values(c.passages.dropped).flatMap((d) => Object.values(d)).reduce((a, b) => a + b, 0);
    expect(c.passages.kept + denied + c.passages.droppedWithExcerpt + dropped).toBe(c.passages.total);
  });

  test("directory names alone miss videos that the description files find", () => {
    const named = readdirSync(join(REPO, "yt")).filter((d) => d.toLowerCase().includes(OWNER.toLowerCase())).length;
    expect(named).toBe(124);
    expect(buildDenylist(REPO).videoIds.size).toBe(167);
  });

  test("the pack carries a version, a matching digest, licences and stays in budget", () => {
    expect(pack.version).toBe(pack.sha256.slice(0, 12));
    expect(pack.sha256).toMatch(/^[0-9a-f]{64}$/);
    const kinds = new Set(Object.values(pack.evidence).flatMap((ps) => ps.map((p) => p.kind)));
    for (const k of kinds) expect(pack.licences.map((l) => l.kind)).toContain(k);
    expect(Buffer.byteLength(JSON.stringify(pack))).toBeLessThan(CANON_PACK_BUDGET_BYTES);
    expect(buildCanonPack(REPO).sha256).toBe(pack.sha256);
  });

  test("the built pack, scanned as the release check scans it, is clean", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-scan-"));
    try {
      const markers = kruseMarkers(REPO);
      writeFileSync(join(dir, "canon.json"), JSON.stringify(pack));
      expect(findKruse([dir], markers)).toEqual([]);
      writeFileSync(join(dir, "leak.bin"), `xx${[...buildDenylist(REPO).videoIds][0]}xx`);
      expect(findKruse([dir], markers).map((h) => h.file)).toEqual([join(dir, "leak.bin")]);
      writeFileSync(join(dir, "leak.bin"), `by ${OWNER.toUpperCase()} himself`);
      expect(findKruse([dir], markers).map((h) => h.marker)).toEqual(["the denied name"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("every kept passage names its source, and no passage ships from a source that forbids redistribution", () => {
    const passages = Object.values(pack.evidence).flat();
    expect(passages.filter((p) => !p.title)).toEqual([]);
    expect(passages.filter((p) => p.kind !== "_intake" && !/^https:\/\//.test(p.url ?? ""))).toEqual([]);
    expect(passages.filter((p) => p.kind === "blog")).toEqual([]);
    expect(passages.filter((p) => p.kind === "wikisource")).toEqual([]);
    expect(pack.licences.find((l) => l.kind === "wikisource")).toBeUndefined();
    expect(LICENCES.find((l) => l.kind === "wikisource")!.terms).toContain("as marked on the Wikisource page");
    expect(LICENCES.find((l) => l.kind === "wikisource")!.terms).toContain("same licence");
    expect(LICENCES.find((l) => l.kind === "arxiv")!.terms).toContain("see the arXiv record for its licence");
    expect(pack.licences.at(-1)).toMatchObject({ kind: "notice", terms: QUOTATION_NOTICE });
    expect(readFileSync(join(REPO, "packages/bkt/README.md"), "utf8")).toContain(QUOTATION_NOTICE);
    expect(pack.licences.every((l) => l.works > 0)).toBe(true);
  });

  test("source files give a title, link and author, and say whether the text may ship", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-src-"));
    const put = (p: string, body: string) => {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    };
    try {
      put("wikisource/a-page/info.md", "# A Page\n\n- **Wikisource**: https://en.wikisource.org/wiki/A_Page\n");
      put("blog/plato-stanford-edu/chaos.md", "# Chaos\n\n- **URL**: https://plato.stanford.edu/entries/chaos/\n");
      put("gutenberg/PG-1-free/info.md", "# Free\n\n- **URL**: https://www.gutenberg.org/ebooks/1\n- **Authors**: Someone, A.\n- **Copyright**: False\n");
      put("gutenberg/PG-2-held/info.md", "# Held\n\n- **URL**: https://www.gutenberg.org/ebooks/2\n- **Copyright**: True\n");
      put("archive/open-item/info.md", "# Open item\n\n- **URL**: https://archive.org/details/open-item\n- **Creator**: A. Writer\n");
      put("archive/open-item/metadata.json", JSON.stringify({ licenseurl: "http://creativecommons.org/publicdomain/mark/1.0/" }));
      put("archive/held-item/info.md", "# Held item\n\n- **URL**: https://archive.org/details/held-item\n");
      put("archive/held-item/metadata.json", JSON.stringify({ licenseurl: "https://creativecommons.org/licenses/by-nc-nd/4.0/" }));
      put("pubmed/PMID-1-x/info.md", "no heading here");
      put("_intake/NOTES.md", "# Notes\n");
      put("wikisource/a-page/metadata.json", JSON.stringify({ title: "A Page", pageid: 1 }));
      expect(sourceMeta(dir, "wikisource/a-page/page.txt")).toEqual({ title: "A Page", url: "https://en.wikisource.org/wiki/A_Page", author: null, permitted: false });
      put("wikisource/a-page/metadata.json", JSON.stringify({ title: "A Page", author_death_year: 1943 }));
      expect(sourceMeta(dir, "wikisource/a-page/page.txt")?.permitted).toBe(true);
      put("wikisource/a-page/metadata.json", JSON.stringify({ title: "A Page", author_death_year: 2000 }));
      expect(sourceMeta(dir, "wikisource/a-page/page.txt")?.permitted).toBe(false);
      put("wikisource/a-page/metadata.json", JSON.stringify({ title: "A Page", license: "Public domain" }));
      expect(sourceMeta(dir, "wikisource/a-page/page.txt")?.permitted).toBe(true);
      expect(sourceMeta(dir, "blog/plato-stanford-edu/chaos.md")?.permitted).toBe(false);
      expect(sourceMeta(dir, "gutenberg/PG-1-free/PG-1.txt")).toEqual({ title: "Free", url: "https://www.gutenberg.org/ebooks/1", author: "Someone, A.", permitted: true });
      expect(sourceMeta(dir, "gutenberg/PG-2-held/PG-2.txt")?.permitted).toBe(false);
      expect(sourceMeta(dir, "archive/open-item/a_djvu.txt")).toEqual({ title: "Open item", url: "https://archive.org/details/open-item", author: "A. Writer", permitted: true });
      expect(sourceMeta(dir, "archive/held-item/a_djvu.txt")?.permitted).toBe(false);
      expect(sourceMeta(dir, "pubmed/PMID-1-x/info.md")).toBeNull();
      expect(sourceMeta(dir, "pubmed/PMID-9-gone/info.md")).toBeNull();
      expect(sourceMeta(dir, "_intake/NOTES.md")).toEqual({ title: "Notes", url: null, author: null, permitted: true });
      expect(kindOf("openalex-citers/W1-x.md")).toBe("openalex");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function claimFile(title: string, sourceTitle: string, id: string, body: string): string {
  return `# ${title}\n\n- **Concept**: \`light\`\n- **Source**: [${sourceTitle}](https://www.youtube.com/watch?v=${id}&t=10)\n- **Timestamp**: \`00:00:10.000\` (~10s)\n\n## Excerpt\n\n> ${body}\n\n## Provenance\n\n- Video slug: \`${id}-a-talk\`\n- Local path: \`yt/${id}-a-talk/transcript.clean.json\`\n- Original URL: https://www.youtube.com/watch?v=${id}\n`;
}

function plantRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "bkt-plant-"));
  const base: Record<string, string> = {
    [`yt/${DENIED_ID}-a-talk/info.md`]: `# A talk with Dr. ${OWNER}`,
    [`yt/${CLEAN_ID}-a-talk/info.md`]: "# A talk about light",
    "_intake/embeddings/claim-evidence.jsonl": "",
    "_intake/connections/graph.json": JSON.stringify({ nodes: [], edges: [] }),
    "bucket-canon/02-physics/sub-claims/light/001-clean.md": claimFile("Claim one", "A talk about light", CLEAN_ID, "light travels at one speed in vacuum for every observer who measures it"),
  };
  for (const [p, body] of Object.entries({ ...base, ...files })) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
}

describe("planted rows", () => {
  test("a clean repo builds and a row from a denied video is dropped", () => {
    const dir = plantRepo({
      "bucket-canon/02-physics/sub-claims/light/002-denied.md": claimFile("Claim two", "A talk", DENIED_ID, "this passage comes from the denied video and must never ship anywhere"),
    });
    try {
      const built = buildCanonPack(dir);
      expect(built.excerpts.map((e) => e.slug)).toEqual(["001-clean"]);
      expect(built.excerpts[0].rowid).toBe(0);
      expect(built.counts.excerpts.denied.video).toBe(1);
      expect(residual(buildDenylist(dir), built)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a row the filter cannot place fails the build", () => {
    const dir = plantRepo({
      "bucket-canon/02-physics/sub-claims/light/003-planted.md": claimFile("Claim three", `Dr. ${OWNER} on light`, CLEAN_ID, "a planted passage with a clean path and video but a denied source title"),
    });
    try {
      expect(() => buildCanonPack(dir)).toThrow(/denied rows left in the canon pack/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a kept row that quotes a denied row fails the build", () => {
    const quote = "this passage comes from the denied video and must never ship anywhere";
    const dir = plantRepo({
      "bucket-canon/02-physics/sub-claims/light/002-denied.md": claimFile("Claim two", "A talk", DENIED_ID, quote),
      "_intake/embeddings/claim-evidence.jsonl": `${JSON.stringify({ concept: "light", slug: "001-clean", evidence: [{ score: 0.9, source_path: "pubmed/PMID-1-x/abstract.txt", text: `someone wrote: ${quote}` }] })}\n`,
      "pubmed/PMID-1-x/info.md": "# A paper\n\n- **URL**: https://pubmed.ncbi.nlm.nih.gov/1/\n",
    });
    try {
      expect(() => buildCanonPack(dir)).toThrow(/quotes a denied row/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a pack edited after the filter is caught by the residual scan", () => {
    const inputs = readInputs(REPO);
    const full = buildDenylist(REPO);
    const id = [...full.videoIds][0];
    const tampered = structuredClone(pack);
    tampered.excerpts[0].source.url = `https://www.youtube.com/watch?v=${id}`;
    expect(residual(full, tampered).length).toBe(1);
    expect(() => assemble(inputs, { ...full, videoIds: new Set([DENIED_ID]) })).toThrow();
  });

  test("claim files give up their source, time and references", () => {
    const m = claimMeta(claimFile("T", "A talk", CLEAN_ID, "x"));
    expect(m.source).toEqual({ title: "A talk", url: `https://www.youtube.com/watch?v=${CLEAN_ID}&t=10`, timestamp: "00:00:10.000" });
    expect(m.refs).toContain(`yt/${CLEAN_ID}-a-talk/transcript.clean.json`);
  });
});

describe("parity with the website fixture", () => {
  type Row = [string, number];
  const fixture = JSON.parse(readFileSync(join(REPO, "scripts/fixtures/canon-search-parity.json"), "utf8")) as Record<string, Record<string, { status: number; top_k: number | null; results?: Row[] }>>;
  const shipped = packCanon(pack);
  const kept = new Set(pack.excerpts.map((e) => e.rowid));

  test("surviving rows keep the website's order and scores for every recorded keyword query", () => {
    let compared = 0;
    let rows = 0;
    for (const [key, want] of Object.entries(fixture["api/canon/search"])) {
      const p = JSON.parse(key) as Record<string, string>;
      if (p.qvec || want.status !== 200 || want.top_k === null || (p.q ?? "").length > 200) continue;
      const survivors = (want.results ?? []).filter(([id]) => kept.has(Number(id.split(":")[0])));
      const url = new URL(`http://127.0.0.1/local/canon/search?${new URLSearchParams(p)}`);
      const got = searchCanon(shipped, parseCanonSearchParams(url, CANON_DEFAULT_TOP_K));
      if (!got.ok) throw new Error(`${key}: ${got.message}`);
      const mine = got.results.map((r): Row => [`${r.id}:${r.concept}/${r.slug}`, r.score]);
      expect(mine.slice(0, survivors.length)).toEqual(survivors);
      compared++;
      rows += survivors.length;
    }
    expect(compared).toBeGreaterThanOrEqual(60);
    expect(rows).toBeGreaterThan(200);
  });
});

describe("knowledge graph in the pack", () => {
  test("ships every connected author with centrality for kept ids only", () => {
    expect(pack.graph.graph.nodes.length).toBe(pack.counts.connections.nodes - pack.counts.connections.denied);
    expect(pack.graph.graph.edges.length).toBeGreaterThan(300);
    const ids = new Set(pack.graph.graph.nodes.map((n) => n.id));
    expect(Object.keys(pack.graph.centrality.weighted).every((k) => ids.has(k))).toBe(true);
    expect(residual(buildDenylist(REPO), pack.graph)).toEqual([]);
  });

  test("a node naming the denied author drops with its edges and centrality", () => {
    const raw = {
      nodes: [
        { id: "A1", name: "Ada Lovelace", group: "author" },
        { id: "A2", name: `Jack ${OWNER}`, group: "author" },
        { id: "A3", name: "Charles Babbage", group: "author" },
      ],
      edges: [
        { source: "A1", target: "A2", weight: 2 },
        { source: "A1", target: "A3", weight: 5 },
      ],
    };
    const kept = keepGraph(deny, raw, { degree: { A1: 2, A2: 1, A3: 1 }, weighted: { A1: 7, A2: 2, A3: 5 } });
    expect(kept.denied).toBe(1);
    expect(kept.graph.graph.nodes.map((n) => n.id)).toEqual(["A1", "A3"]);
    expect(kept.graph.graph.edges).toEqual([{ source: "A1", target: "A3", weight: 5 }]);
    expect(kept.graph.centrality).toEqual({ degree: { A1: 2, A3: 1 }, weighted: { A1: 7, A3: 5 } });
    expect(residual(deny, kept.graph)).toEqual([]);
  });

  test("a graph edited after the filter fails the build", () => {
    const inputs = readInputs(REPO);
    const full = buildDenylist(REPO);
    const leaky = { ...inputs, graph: { ...inputs.graph, nodes: inputs.graph.nodes.map((n, i) => (i === 0 ? { ...n, name: `${n.name} ${OWNER}` } : n)) } };
    const kept = assemble(leaky, full);
    expect(kept.graph.graph.nodes.length).toBe(inputs.graph.nodes.length - 1);
    const tampered = structuredClone(kept);
    tampered.graph.graph.nodes[0].name = OWNER;
    expect(residual(full, tampered).length).toBeGreaterThan(0);
  });
});

describe("excerpts by author id", () => {
  test("every author id maps to kept excerpts that name the author", () => {
    const ids = new Set(pack.graph.graph.nodes.map((n) => n.id));
    const rows = new Map(pack.excerpts.map((e) => [e.rowid, e]));
    const entries = Object.entries(pack.graph.excerpts);
    expect(entries.length).toBeGreaterThan(10);
    for (const [id, list] of entries) {
      expect(ids.has(id)).toBe(true);
      const fold = (t: string) => ` ${t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
      const surname = fold(pack.graph.graph.nodes.find((n) => n.id === id)!.name.split(/\s+/).pop()!);
      for (const r of list) {
        const e = rows.get(r)!;
        const said = fold([e.text, ...(pack.evidence[String(r)] ?? []).map((p) => p.author ?? "")].join(" "));
        expect(said).toContain(surname);
      }
    }
  });
});
