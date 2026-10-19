import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { CANON_META_KEY, CanonStore, syncCanon } from "../src/canon";
import { CANON_TOOLS, canonChat, runCanonTool, sendable, WITHHELD } from "../src/llm/canon-tools";
import { OpenAiProvider } from "../src/llm/openai";
import type { Provider } from "../src/llm/types";
import { buildCanonPack, CANON_SCHEMA, excerptLicenceKind, isPrivate, licenceKind, LICENCES, type CanonPack, type PackPassage } from "../src/pack/canon";

const SECRET = {
  unmapped: "UNMAPPED-PASSAGE-7731 resonance of the cell membrane",
  kruse: "KRUSE-PASSAGE-4410 light water mitochondria",
  tierB: "TIERB-PASSAGE-9902 a gated sacred history edition",
  closed: "CLOSED-PASSAGE-1188 a publisher abstract on water",
  closedExcerpt: "CLOSED-EXCERPT-5521 transcript line about water structure",
  privateExcerpt: "PRIVATE-EXCERPT-6630 water as a battery",
};
const OPEN = { cc0: "OPEN-CC0-3301 water forms an exclusion zone", pd: "OPEN-PD-3302 water expands when it freezes", excerpt: "OPEN-EXCERPT-3303 the water claim" };

const passage = (text: string, source_path: string, licence_kind: string | null, title: string): PackPassage => ({
  score: 1,
  kind: source_path.split("/")[0],
  source_path,
  text,
  url: `https://openalex.org/${title.replace(/\W+/g, "")}`,
  title,
  author: null,
  licence_kind,
});

function fixturePack(version = "fixture-v2"): CanonPack {
  const ex = (rowid: number, title: string, text: string, licence_kind: string | null) => ({
    rowid,
    branch: "05-biophysics",
    concept: "water",
    slug: `claim-${rowid}`,
    title,
    text,
    path: `bucket-canon/05-biophysics/water/claim-${rowid}.md`,
    source: { title: "talk", url: null, timestamp: null },
    licence_kind,
  });
  return {
    version,
    schema: CANON_SCHEMA,
    sha256: version,
    source: "fixture",
    excerpts: [ex(0, "Water mixed claim", OPEN.excerpt, "cc0"), ex(1, "Water closed claim", SECRET.closedExcerpt, "closed"), ex(2, "Water private claim", SECRET.privateExcerpt, "private"), ex(3, "Water unmapped claim", "UNMAPPED-EXCERPT-8812 water", null)],
    evidence: {
      "0": [
        passage(OPEN.cc0, "openalex/W1/info.md", "cc0", "OpenAlex work"),
        passage(SECRET.unmapped, "newsource/x/info.md", null, "Unmapped work"),
        passage(SECRET.kruse, "_intake/kruse-blog-corpus/post-1.md", "private", "Kruse post"),
        passage(SECRET.tierB, "_intake/sacred-history-corpus/work/ed-1.md", "private", "Tier B edition"),
        passage(SECRET.closed, "pubmed/123/info.md", "closed", "PubMed paper"),
        passage(OPEN.pd, "gutenberg/42/info.md", "public-domain", "Gutenberg book"),
        passage("ODD-KIND-4455 water", "odd/x/info.md", "made-up", "Odd kind"),
      ],
      "1": [],
      "2": [],
      "3": [],
    },
    licences: LICENCES.map((l) => ({ ...l, works: 1 })),
    graph: { graph: { nodes: [], edges: [] } as never, centrality: { degree: {}, weighted: {} }, excerpts: {} },
    counts: {} as never,
  };
}

function storeFor(pack = fixturePack()) {
  const db = new Database(":memory:");
  db.run("create table meta (k text primary key, v text not null)");
  syncCanon(db, pack);
  return { db, store: new CanonStore(db) };
}

function sse(chunks: unknown[]): Response {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const toolCallChunk = (name: string, args: unknown) => ({ choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: "tool_calls" }] });
const textChunk = (text: string) => ({ choices: [{ delta: { content: text }, finish_reason: "stop" }] });

async function capture(local: boolean, calls: [string, unknown][]) {
  const bodies: string[] = [];
  let turn = 0;
  const fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(String(init?.body));
    const next = calls[turn++];
    return sse(next ? [toolCallChunk(next[0], next[1])] : [textChunk("done [empirical: Water mixed claim]")]);
  };
  const provider = new OpenAiProvider({ name: local ? "ollama" : "hosted", baseUrl: "http://fixture.invalid/v1", model: "m", local, key: async () => null, fetch });
  const { store } = storeFor();
  const out = await canonChat(provider, store, [{ role: "user", content: "what does the canon say about water?" }]);
  return { bodies, out, all: bodies.join("\n") };
}

const PRIVATE_OR_CLOSED = [SECRET.unmapped, SECRET.kruse, SECRET.tierB, SECRET.closed, SECRET.closedExcerpt, SECRET.privateExcerpt, "ODD-KIND-4455", "UNMAPPED-EXCERPT-8812"];

describe("licence_kind at pack time", () => {
  test("Kruse and Tier-B paths resolve to private", () => {
    expect(isPrivate("_intake/kruse-blog-corpus/a.md")).toBe(true);
    expect(isPrivate("/home/x/agfarms/bucket-foundation/_intake/kruse-references-mined/a.md")).toBe(true);
    expect(isPrivate("_intake/sacred-history-corpus/work/ed/a.md")).toBe(true);
    expect(isPrivate("_intake/tier-b/a.md")).toBe(true);
    expect(licenceKind("_intake/kruse-blog-corpus/a.md")).toBe("private");
    expect(licenceKind("_intake/sacred-history-corpus/work/a.md")).toBe("private");
  });

  test("kinds map through the licence table and unknown kinds stay null", () => {
    expect(licenceKind("openalex/W1/info.md")).toBe("cc0");
    expect(licenceKind("openalex-fanout/W1/info.md")).toBe("cc0");
    expect(licenceKind("gutenberg/1/info.md")).toBe("public-domain");
    expect(licenceKind("wikisource/p/info.md")).toBe("cc-by-sa");
    expect(licenceKind("pubmed/1/info.md")).toBe("closed");
    expect(licenceKind("unheard-of/1/info.md")).toBeNull();
    expect(excerptLicenceKind(["bucket-canon/x.md", "yt/abc"])).toBe("closed");
    expect(excerptLicenceKind(["bucket-canon/x.md", "_intake/kruse-blog-corpus/p.md"])).toBe("private");
  });

  test("the built pack carries licence_kind on every excerpt and passage", () => {
    const pack = buildCanonPack(resolve(import.meta.dir, "../../.."));
    expect(pack.schema).toBe(CANON_SCHEMA);
    expect(pack.excerpts.every((e) => typeof e.licence_kind === "string")).toBe(true);
    const passages = Object.values(pack.evidence).flat();
    expect(passages.every((p) => typeof p.licence_kind === "string")).toBe(true);
    expect(passages.filter((p) => isPrivate(p.source_path)).every((p) => p.licence_kind === "private")).toBe(true);
    expect(pack.licences.every((l) => typeof l.licence === "string")).toBe(true);
  });
});

describe("syncCanon migration", () => {
  test("a schema 1 database is rebuilt with licence_kind and the version bumps", () => {
    const db = new Database(":memory:");
    db.run("create table meta (k text primary key, v text not null)");
    db.run(`create table canon_excerpts (id integer primary key, branch text not null, concept text not null, slug text not null, title text not null, text text not null, path text not null, source text not null);
      create table canon_evidence (excerpt integer not null, n integer not null, score real not null, kind text not null, source_path text not null, text text not null, url text, title text not null, author text, primary key (excerpt, n));
      create table canon_licences (n integer primary key, kind text not null, name text not null, terms text not null, url text, works integer not null);`);
    db.run("insert into canon_excerpts values (0, 'b', 'c', 's', 't', 'old text', 'p', '{}')");
    db.query("insert into meta (k, v) values (?, ?)").run(CANON_META_KEY, "fixture-v2");
    expect(syncCanon(db, fixturePack("fixture-v2"))).toBe(true);
    const cols = db.query<{ name: string }, []>("select name from pragma_table_info('canon_evidence')").all().map((c) => c.name);
    expect(cols).toContain("licence_kind");
    expect(new CanonStore(db).excerptLicence(1)).toBe("closed");
    expect(syncCanon(db, fixturePack("fixture-v2"))).toBe(false);
    expect(syncCanon(db, fixturePack("fixture-v3"))).toBe(true);
    expect(new CanonStore(db).version()).toBe("fixture-v3");
  });

  test("rows with a null licence_kind stay withheld from a hosted provider", () => {
    const { db, store } = storeFor();
    db.run("update canon_evidence set licence_kind = null where excerpt = 0 and n = 0");
    db.run("update canon_excerpts set licence_kind = null where id = 0");
    const out = runCanonTool(store, { id: "x", name: "canon_get_claim", input: { claim_id: 0 } }, false);
    expect(out).not.toContain(OPEN.cc0);
    expect(out).not.toContain(OPEN.excerpt);
    expect(runCanonTool(store, { id: "x", name: "canon_get_claim", input: { claim_id: 0 } }, true)).toContain(OPEN.cc0);
  });
});

describe("egress filter", () => {
  test("only open kinds pass to hosted providers, everything passes locally", () => {
    for (const k of ["cc0", "cc-by", "cc-by-sa", "public-domain"]) expect(sendable(k, false)).toBe(true);
    for (const k of ["closed", "private", "made-up", null, undefined]) expect(sendable(k, false)).toBe(false);
    for (const k of ["closed", "private", null]) expect(sendable(k, true)).toBe(true);
  });

  test("hosted request body: unmapped passage is withheld", async () => {
    const { bodies } = await capture(false, [["canon_get_claim", { claim_id: 0 }]]);
    expect(bodies[1]).toContain("Unmapped work");
    expect(bodies[1]).not.toContain(SECRET.unmapped);
  });

  test("hosted request body: Kruse passage is withheld", async () => {
    const { bodies } = await capture(false, [["canon_get_claim", { claim_id: 0 }]]);
    expect(bodies[1]).toContain("Kruse post");
    expect(bodies[1]).not.toContain(SECRET.kruse);
  });

  test("hosted request body: Tier-B passage is withheld", async () => {
    const { bodies } = await capture(false, [["canon_get_claim", { claim_id: 0 }]]);
    expect(bodies[1]).toContain("Tier B edition");
    expect(bodies[1]).not.toContain(SECRET.tierB);
  });

  test("hosted request body: canon_get_claim over mixed rows sends open text and withholds the rest", async () => {
    const { bodies, all } = await capture(false, [["canon_get_claim", { claim_id: 0 }], ["canon_get_claim", { claim_id: 1 }], ["canon_get_claim", { claim_id: 2 }]]);
    expect(bodies[1]).toContain(OPEN.cc0);
    expect(bodies[1]).toContain(OPEN.pd);
    expect(bodies[1]).toContain(OPEN.excerpt);
    expect(bodies[1]).toContain(JSON.stringify(WITHHELD).slice(1, -1));
    for (const s of PRIVATE_OR_CLOSED) expect(all).not.toContain(s);
  });

  test("hosted request body: canon_excerpts.text is withheld when closed or private", async () => {
    const { all } = await capture(false, [["canon_search", { query: "water" }], ["canon_get_claim", { claim_id: 1 }], ["canon_get_claim", { claim_id: 3 }]]);
    expect(all).toContain("Water closed claim");
    expect(all).toContain(OPEN.excerpt);
    expect(all).not.toContain(SECRET.closedExcerpt);
    expect(all).not.toContain(SECRET.privateExcerpt);
    expect(all).not.toContain("UNMAPPED-EXCERPT-8812");
  });

  test("local request body carries the full text", async () => {
    const { all } = await capture(true, [["canon_get_claim", { claim_id: 0 }], ["canon_search", { query: "water" }]]);
    for (const s of [SECRET.unmapped, SECRET.kruse, SECRET.tierB, SECRET.closed, SECRET.closedExcerpt, SECRET.privateExcerpt]) expect(all).toContain(s);
  });
});

describe("canon tools over the packed canon", () => {
  const pack = buildCanonPack(resolve(import.meta.dir, "../../.."));
  const { store } = storeFor(pack);
  const first = pack.excerpts[0];

  test("tool definitions name the three tools", () => {
    expect(CANON_TOOLS.map((t) => t.name)).toEqual(["canon_search", "canon_get_claim", "cite"]);
  });

  test("canon_search finds a packed claim by its title words", () => {
    const words = first.title.split(/\s+/).filter((w) => w.length > 4).slice(0, 3).join(" ");
    const out = JSON.parse(runCanonTool(store, { id: "1", name: "canon_search", input: { query: words, limit: 5 } }, true)) as { results: { claim_id: number; url: string }[] };
    expect(out.results.length).toBeGreaterThan(0);
    expect(out.results.length).toBeLessThanOrEqual(5);
    expect(out.results.every((r) => r.url.startsWith("https://bucket.foundation/excerpts/"))).toBe(true);
  });

  test("canon_get_claim and cite return the claim, its sources and a Math Contract tag", () => {
    const claim = JSON.parse(runCanonTool(store, { id: "2", name: "canon_get_claim", input: { claim_id: first.rowid } }, false)) as { title: string; text: string; evidence: { text: string; licence_kind: string }[] };
    expect(claim.title).toBe(first.title);
    expect(claim.text).toBe(WITHHELD);
    for (const p of claim.evidence) expect(p.text === WITHHELD || sendable(p.licence_kind, false)).toBe(true);
    const cite = JSON.parse(runCanonTool(store, { id: "3", name: "cite", input: { claim_id: String(first.rowid) } }, false)) as { tag: string; citation: string };
    expect(cite.citation).toContain(first.title);
    expect(cite.tag).toMatch(/^\[empirical: .+, canon [0-9a-f]{12}, bkt canon show \d+\]$/);
  });

  test("string limits and unknown branches from small models are tolerated", () => {
    const words = first.title.split(/\s+/).filter((w) => w.length > 4).slice(0, 3).join(" ");
    const out = JSON.parse(runCanonTool(store, { id: "7", name: "canon_search", input: { query: words, limit: "2", branch: "{}" } }, true)) as { results: unknown[] };
    expect(out.results.length).toBeGreaterThan(0);
    expect(out.results.length).toBeLessThanOrEqual(2);
  });

  test("bad input returns an error result", () => {
    expect(runCanonTool(store, { id: "4", name: "canon_get_claim", input: { claim_id: -1 } }, true)).toContain("error");
    expect(runCanonTool(store, { id: "5", name: "canon_search", input: {} }, true)).toContain("error");
    expect(runCanonTool(store, { id: "6", name: "rm", input: {} }, true)).toContain("no tool named rm");
  });

  test.skipIf(!process.env.BKT_E2E_OLLAMA)("end to end against the local Ollama", async () => {
    const model = process.env.BKT_E2E_OLLAMA!;
    const provider: Provider = new OpenAiProvider({ name: "ollama", baseUrl: "http://127.0.0.1:11434/v1", model, local: true, key: async () => null });
    const out = await canonChat(provider, store, [{ role: "user", content: `Use canon_search to find what the Bucket canon says about "${first.title}", then cite one claim.` }]);
    console.log(JSON.stringify({ model, calls: out.calls.map((c) => ({ name: c.name, input: c.input })), answer: out.text }, null, 1));
    expect(out.calls.length).toBeGreaterThan(0);
  }, 600_000);
});
