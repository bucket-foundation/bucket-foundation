import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { newDataKey } from "../src/crypto";
import { canonAdapter, DATA_PAGE, DATA_PAGE_MAX, dataRoutes, exploreAdapter, learningAdapter, ownAdapter, type DataRecord, type DatasetInfo, type ExplorePackLike } from "../src/data";
import type { Item } from "../src/grade";
import { NotesStore } from "../src/notes";
import { buildCanonPack } from "../src/pack/canon";
import { DENIED_NAME } from "../src/pack/rights";
import { startServe, type Serve } from "../src/serve";
import { MIGRATIONS, Store } from "../src/store";

const canon = buildCanonPack(resolve(import.meta.dir, "../../.."));

const items: Item[] = ["heat", "entropy"].map((id) => ({ id: `phys/${id}/0`, atomId: id, branch: "phys", title: `About ${id}`, level: "recall", prompt: `What is ${id}?`, answer: `The answer on ${id}` }));
const learning = {
  version: "v1",
  items,
  decks: [{ id: "phys", source: "phys", title: "Physics", atoms: 2 }],
  atoms: { phys: [{ id: "heat", title: "Heat", shell: "prereq", requires: [], summary: "Energy in transit." }, { id: "entropy", title: "Entropy", shell: "nucleus", requires: ["heat"], summary: "Disorder counted.", lesson: "A long lesson." }] },
};

const BIG = 11_000;
const explore: ExplorePackLike = {
  version: "e1",
  sha256: "f".repeat(64),
  sources: Array.from({ length: BIG }, (_, i) => [i % 2 ? "p" : "a", String(1000 + i), `Paper ${String(i).padStart(5, "0")} on ${i % 7 === 0 ? "entropy" : "water"}`, i % 5 === 0 ? null : 1900 + (i % 120), i % 3 === 0 ? "" : `Writer ${i % 40}`]),
  licences: [
    { kind: "a", name: "arXiv", terms: "Titles from arxiv.org.", url: "https://arxiv.org", works: BIG / 2 },
    { kind: "p", name: "PubMed", terms: "Titles from PubMed.", url: "https://pubmed.ncbi.nlm.nih.gov", works: BIG / 2 },
  ],
  counts: { sources: { total: BIG + 40, kept: BIG } },
};

const SECRET_TITLE = "Private reading list";
const SECRET_BODY = "Nobody else reads this line.";
const SECRET_ANSWER = "my typed answer";

let store: Store;
let s: Serve;
let auth: Record<string, string>;

function req(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", headers: { host: `127.0.0.1:${s.port}`, ...init.headers } });
}

async function get<T>(path: string): Promise<T> {
  const r = await req(path, { headers: auth });
  expect(r.status).toBe(200);
  return (await r.json()) as T;
}

interface Page {
  total: number;
  offset: number;
  limit: number;
  records: (DataRecord & { kindLabel: string; openable: boolean })[];
}

beforeEach(async () => {
  const key = newDataKey();
  store = new Store(":memory:", key);
  store.importPack("v1", items);
  new NotesStore(store, key).save({ title: SECRET_TITLE, body: SECRET_BODY, pinned: false }, 1);
  store.recordAttempt({ itemId: items[0].id, mode: "quiz", response: SECRET_ANSWER, correct: true, rating: 3, elapsedMs: 10, at: 2 });
  const data = dataRoutes([learningAdapter(learning as never), canonAdapter(canon), exploreAdapter(explore), ownAdapter(store, { analyses: () => 4 })]);
  const uid = 7;
  s = startServe({ uid, resolvePeerUid: () => uid, routes: data.routes, match: data.match });
  const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
});

afterEach(() => {
  s.stop();
  store.close();
});

const PATHS = ["/local/data", "/local/data/canon/records", "/local/data/canon/records/excerpt%2F2", "/local/data/yours/records"];

describe("data routes: access", () => {
  test("every route needs the window's token", async () => {
    for (const path of PATHS) {
      expect((await req(path)).status).toBe(401);
      expect((await req(path, { headers: { authorization: `Bucket ${"A".repeat(43)}` } })).status).toBe(401);
    }
  });

  test("a request from another site or another host name is refused", async () => {
    for (const path of PATHS) {
      expect((await req(path, { headers: { ...auth, origin: "https://example.org" } })).status).toBe(403);
      expect((await req(path, { headers: { ...auth, host: "example.org" } })).status).toBe(403);
    }
  });

  test("only reads are served", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) expect((await req("/local/data/canon/records", { method, headers: { ...auth, "content-length": "0" } })).status).toBe(404);
  });
});

describe("data routes: the listing", () => {
  test("names each dataset with its version, checksum, counts, parts and what was left out", async () => {
    const { datasets } = await get<{ datasets: DatasetInfo[] }>("/local/data");
    expect(datasets.map((d) => d.id)).toEqual(["learning", "canon", "explore", "yours"]);
    const [l, c, e] = datasets;
    expect(l.counts.map((x) => [x.label, x.n])).toEqual([["decks", 1], ["lessons", 2], ["questions", 2]]);
    expect(l.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(l.parts).toEqual([{ name: "Physics", count: 2, unit: "lessons", terms: null, link: null, openable: false }]);
    expect(l.leftOut).toBeNull();
    expect(c.version).toBe(canon.version);
    expect(c.checksum).toBe(canon.sha256);
    expect(c.counts.map((x) => x.n)).toEqual([canon.counts.excerpts.kept, canon.counts.passages.kept]);
    expect(c.leftOut!.count).toBe(canon.counts.excerpts.total - canon.counts.excerpts.kept + canon.counts.passages.total - canon.counts.passages.kept);
    expect(c.parts.length).toBe(canon.licences.length - 1);
    expect(c.parts.every((p) => p.terms && p.count >= 0)).toBe(true);
    expect(e.leftOut).toEqual({ count: 40, reason: "Left out because the author has not agreed to sharing." });
    expect(datasets.every((d) => d.builtAt === null)).toBe(true);
  });

  test("the learning checksum starts with the version the pack builder wrote", async () => {
    const { buildPack } = await import("../src/pack/export");
    const pack = buildPack(resolve(import.meta.dir, "../../../learning/app/corpus"));
    expect(learningAdapter(pack).info().checksum!.slice(0, 12)).toBe(pack.version);
  });

  test("says what was left out as a count and a reason, with no removed item and no name from the filter", async () => {
    const text = await (await req("/local/data", { headers: auth })).text();
    expect(DENIED_NAME.test(text)).toBe(false);
    for (const word of ["videoIds", "deniedFiles", "prefix", "namedElsewhere", "_intake", "bucket-canon/"]) expect(text).not.toContain(word);
  });

  test("your own work is counts and how each is stored, never its contents", async () => {
    const res = await req("/local/data", { headers: auth });
    const text = await res.text();
    const yours = (JSON.parse(text) as { datasets: DatasetInfo[] }).datasets[3];
    expect(yours.browsable).toBe(false);
    expect(Object.fromEntries(yours.counts.map((x) => [x.kind, [x.n, x.stored]]))).toEqual({
      note: [1, "encrypted"],
      answer: [1, "partly"],
      "work-answer": [0, "plain"],
      daily: [0, "encrypted"],
      started: [0, "plain"],
      analysis: [4, "plain"],
      history: [0, "encrypted"],
    });
    for (const secret of [SECRET_TITLE, SECRET_BODY, SECRET_ANSWER]) expect(text).not.toContain(secret);
    const tables = MIGRATIONS.filter((m): m is string => typeof m === "string").flatMap((m) => [...m.matchAll(/create table (\w+)/g)].map((x) => x[1]));
    expect(tables).toContain("history_snapshot");
    for (const t of [...tables, "learn_cards"].filter((t) => t.includes("_"))) expect(text).not.toContain(t);
  });

  test("a sealed table is never listed as records", async () => {
    for (const path of ["/local/data/yours/records", "/local/data/yours/records/note", "/local/data/notes/records", "/local/data/attempts/records", "/local/data/nope/records"]) {
      const r = await req(path, { headers: auth });
      expect(r.status).toBe(404);
      expect(await r.text()).not.toContain(SECRET_TITLE);
    }
  });
});

describe("data routes: records", () => {
  test("pages through 11,000 rows without gaps or repeats", async () => {
    const first = await get<Page>("/local/data/explore/records");
    expect([first.total, first.offset, first.limit, first.records.length]).toEqual([BIG, 0, DATA_PAGE, DATA_PAGE]);
    const seen = new Set<string>();
    for (let offset = 0; offset < BIG; offset += DATA_PAGE_MAX) {
      const page = await get<Page>(`/local/data/explore/records?sort=title&limit=${DATA_PAGE_MAX}&offset=${offset}`);
      for (const r of page.records) seen.add(r.id);
    }
    expect(seen.size).toBe(BIG);
    const past = await get<Page>(`/local/data/explore/records?offset=${BIG}`);
    expect([past.total, past.records.length]).toEqual([BIG, 0]);
    expect((await get<Page>("/local/data/explore/records?limit=100000")).limit).toBe(DATA_PAGE_MAX);
    for (const bad of ["limit=-1", "limit=x", "offset=-5", "offset=1.5"]) expect((await get<Page>(`/local/data/explore/records?${bad}`)).records.length).toBe(DATA_PAGE);
  });

  test("returns the fields a person reads", async () => {
    const page = await get<Page>("/local/data/explore/records?limit=2");
    expect(page.records[1]).toEqual({ id: "source/p/1001", title: "Paper 00001 on water", creators: "Writer 1", year: 1901, kind: "p", kindLabel: "PubMed", source: "https://pubmed.ncbi.nlm.nih.gov/1001/", openable: true });
    expect(page.records[0].creators).toBeNull();
    expect(page.records[0].year).toBeNull();
  });

  test("filters by text across title, creators and year, and by kind", async () => {
    const entropy = await get<Page>("/local/data/explore/records?q=ENTROPY");
    expect(entropy.total).toBe(Math.ceil(BIG / 7));
    expect(entropy.records.every((r) => r.title.includes("entropy"))).toBe(true);
    const both = await get<Page>(`/local/data/explore/records?q=${encodeURIComponent("entropy writer")}`);
    expect(both.total).toBeGreaterThan(0);
    expect(both.total).toBeLessThan(entropy.total);
    expect(both.records.every((r) => r.title.includes("entropy") && r.creators!.includes("Writer"))).toBe(true);
    const kind = await get<Page>("/local/data/explore/records?kind=a");
    expect(kind.total).toBe(BIG / 2);
    expect((await get<Page>("/local/data/explore/records?kind=zz")).total).toBe(0);
    expect((await get<Page>("/local/data/explore/records?q=nothinglikethis")).records).toEqual([]);
    const lessons = await get<Page>("/local/data/learning/records?kind=lesson");
    expect(lessons.records.map((r) => r.title)).toEqual(["Heat", "Entropy"]);
  });

  test("sorts each column both ways, blanks last when ascending", async () => {
    const up = await get<Page>("/local/data/explore/records?sort=year&limit=3");
    expect(up.records.map((r) => r.year)).toEqual([1901, 1901, 1901]);
    const down = await get<Page>("/local/data/explore/records?sort=year&dir=desc&limit=1");
    expect(down.records[0].year).toBeNull();
    const by = await get<Page>("/local/data/explore/records?sort=creators&limit=1");
    expect(by.records[0].creators).toBe("Writer 0");
    const title = await get<Page>("/local/data/explore/records?sort=title&dir=desc&limit=1");
    expect(title.records[0].title).toBe(`Paper ${BIG - 1} on water`);
    expect((await get<Page>("/local/data/explore/records?sort=drop%20table")).records[0].id).toBe("source/a/1000");
  });

  test("one record comes with all its readable fields and no path", async () => {
    const e = canon.excerpts[0];
    const got = await get<{ record: Page["records"][number]; fields: { label: string; value: string }[] }>(`/local/data/canon/records/${encodeURIComponent(`excerpt/${e.rowid}`)}`);
    expect(got.record.source).toBe(e.source.url);
    expect(got.fields.map((f) => f.label)).toEqual(expect.arrayContaining(["Branch", "Topic", "Text", "Taken from"]));
    const text = JSON.stringify(got);
    expect(text).not.toContain(e.path);
    expect(text).not.toContain(e.slug);
    const passage = await get<{ fields: { label: string; value: string }[] }>(`/local/data/canon/records/${encodeURIComponent(`passage/${e.rowid}/0`)}`);
    expect(JSON.stringify(passage)).not.toContain(canon.evidence[String(e.rowid)][0].source_path);
    const lesson = await get<{ fields: { label: string; value: string }[] }>(`/local/data/learning/records/${encodeURIComponent("lesson/phys/entropy")}`);
    expect(lesson.fields).toContainEqual({ label: "Builds on", value: "Heat" });
    const question = await get<{ fields: { label: string; value: string }[] }>(`/local/data/learning/records/${encodeURIComponent("question/phys/heat/0")}`);
    expect(question.fields).toContainEqual({ label: "Answer", value: "The answer on heat" });
  });

  test("an unknown record, a broken address and a deeper address answer 404", async () => {
    for (const path of ["/local/data/canon/records/excerpt%2F999999", "/local/data/canon/records/%E0%A4%A", "/local/data/canon/records/a/b", "/local/data/CANON/records", "/local/data/canon"]) expect((await req(path, { headers: auth })).status).toBe(404);
  });

  test("no canon record names the denied author", async () => {
    const all = await get<Page>(`/local/data/canon/records?limit=${DATA_PAGE_MAX}`);
    expect(all.total).toBe(canon.counts.excerpts.kept + canon.counts.passages.kept);
    expect(canonAdapter(canon).records().some((r) => DENIED_NAME.test(JSON.stringify(r)))).toBe(false);
  });
});
