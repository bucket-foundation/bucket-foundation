import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { tokenRank, type ClaimIndexEntry } from "../../../src/lib/canon-rank";
import { findKruse, kruseMarkers } from "../scripts/check-no-kruse";
import { assemble, buildCanonPack, CANON_PACK_BUDGET_BYTES, claimMeta, describeCounts, kindOf, readInputs, sourceUrl } from "../src/pack/canon";
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
    expect(c.passages.kept).toBe(3087);
    expect(c.passages.namedInListedFolders + c.passages.namedElsewhere).toBe(126);
    expect(c.vectorRows).toEqual({ total: 599, kept: 364 });
    expect(c.connections.denied).toBe(0);
    const denied = Object.values(c.passages.denied).reduce((a, b) => a + b, 0);
    expect(c.passages.kept + denied + c.passages.droppedWithExcerpt).toBe(c.passages.total);
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
      expect(findKruse([dir], markers).length).toBe(1);
      expect(findKruse([dir], markers, false)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("source paths map to links on known hosts only", () => {
    expect(sourceUrl("pubmed/PMID-38219775-from-conformal/abstract.txt")).toBe("https://pubmed.ncbi.nlm.nih.gov/38219775/");
    expect(sourceUrl("gutenberg/PG-56852-time-and-free-will/text.txt")).toBe("https://www.gutenberg.org/ebooks/56852");
    expect(sourceUrl("arxiv/1103.1984-search/abs.txt")).toBe("https://arxiv.org/abs/1103.1984");
    expect(sourceUrl("arxiv/hep-th_0512172-lectures/abs.txt")).toBe("https://arxiv.org/abs/hep-th/0512172");
    expect(sourceUrl("openalex-fanout/W4243740685-how/x.md")).toBe("https://openalex.org/W4243740685");
    expect(sourceUrl(`yt/${CLEAN_ID}-talk/transcript.txt`)).toBe(`https://www.youtube.com/watch?v=${CLEAN_ID}`);
    expect(sourceUrl("blog/plato-stanford-edu/x.md")).toBeNull();
    expect(kindOf("openalex-citers/W1-x.md")).toBe("openalex");
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
  const index: ClaimIndexEntry[] = pack.excerpts.map((e) => ({ ...e, vec: new Float32Array(0) }));
  const kept = new Set(pack.excerpts.map((e) => e.rowid));

  test("surviving rows keep the website's order and scores for every recorded keyword query", () => {
    let compared = 0;
    let rows = 0;
    for (const [key, want] of Object.entries(fixture["api/canon/search"])) {
      const p = JSON.parse(key) as Record<string, string>;
      if (p.qvec || want.status !== 200 || want.top_k === null || (p.q ?? "").length > 200) continue;
      const survivors = (want.results ?? []).filter(([id]) => kept.has(Number(id.split(":")[0])));
      let got = tokenRank(index, p.q, want.top_k * 3);
      if (p.branch) got = got.filter((r) => r.entry.branch === p.branch);
      const mine = got.slice(0, want.top_k).map((r): Row => [`${r.entry.rowid}:${r.entry.concept}/${r.entry.slug}`, r.score]);
      expect(mine.slice(0, survivors.length)).toEqual(survivors);
      compared++;
      rows += survivors.length;
    }
    expect(compared).toBeGreaterThanOrEqual(60);
    expect(rows).toBeGreaterThan(200);
  });
});
