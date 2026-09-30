import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAdvisorReview, parsePrimeDirections, ReviewFileError } from "../../../src/lib/research-os/advisor-review";
import { advisorRoutes, REVIEW_BODY_BYTES } from "../src/advisor";
import { newDataKey } from "../src/crypto";
import { forgetKey, PeopleStore, personMark } from "../src/people";
import { startServe, type Serve } from "../src/serve";
import { LOCAL_ONLY_TABLES, Store, SYNC_TABLES } from "../src/store";

const privateRow = (rank: number, name: string, institution: string) => ({
  rank,
  name,
  score: 1 - rank / 100,
  percentile: 100 - rank,
  id: `${name.toLowerCase().replace(/ /g, ".")}@uni.example`,
  email: `${name.toLowerCase().replace(/ /g, ".")}@uni.example`,
  email_public: true,
  image_url: "https://img.example/p.png",
  tracker_notes: ["asked about funding (high)"],
  institution,
  field: "Biophysics",
  department: `Physics, write to ${name.split(" ")[0].toLowerCase()}@uni.example`,
  h_index: 30 - rank,
  profile_url: "https://uni.example/people/x",
  program_url: "http://uni.example/program",
  research_areas: "membranes; water",
  shared_topics: ["water", "light"],
  star_prime: [0.1, 0.9, 0.5],
  theta: 1.2,
  radius: 0.3,
});

const REVIEW = {
  schema: "bucket.advisor-review/1",
  rows: [privateRow(1, "Avery Stone", "North Institute"), privateRow(2, "Rowan Hale", "Harbor College"), privateRow(3, "Kai Mercer", "East University")],
  context: { key: "abc123", prime_axes: ["water membrane", "light cell", "field"], star_query_prime: [0.5, 0.6, 0.7], summary: "3 of 3 ranked" },
};

const PRIME = {
  schema: "bucket.prime-directions/1",
  corpus: "academy",
  generated_at: "2026-09-30T00:00:00+00:00",
  shape: { docs: 358, terms: 4000 },
  components: [
    { index: 1, angle_deg: 0, variance_ratio: 0.02, top_terms: [{ term: "energy", weight: 0.3 }], bottom_terms: [] },
    { index: 2, angle_deg: 30, variance_ratio: 0.03, top_terms: [{ term: "cell", weight: 0.2 }], bottom_terms: [{ term: "ada@uni.example", weight: -0.1 }] },
  ],
  docs: [{ id: "private-doc", title: "Private title", scores: [1, 2] }],
};

describe("advisor review parsing", () => {
  test("keeps publishable fields and drops every email, id, image and tracker note", () => {
    const r = parseAdvisorReview(REVIEW);
    const text = JSON.stringify(r);
    expect(text).not.toContain("@");
    expect(text).not.toContain("img.example");
    expect(text).not.toContain("funding");
    expect(r.rows[0].fields.department).toBe("Physics, write to ");
    expect(r.rows[0].links).toEqual({ profile_url: "https://uni.example/people/x" });
    expect(r.rows.map((x) => x.name)).toEqual(["Avery Stone", "Rowan Hale", "Kai Mercer"]);
    expect(r.prime_axes).toEqual(["water membrane", "light cell", "field"]);
  });

  test("rejects other files with a message", () => {
    expect(() => parseAdvisorReview({ rows: [] })).toThrow(ReviewFileError);
    expect(() => parseAdvisorReview({ schema: "bucket.advisor-review/1", rows: [] })).toThrow("no rows");
    expect(() => parseAdvisorReview({ schema: "bucket.advisor-review/1", rows: [{ name: "x" }] })).toThrow("no row has");
    expect(() => parsePrimeDirections(REVIEW)).toThrow("prime.json");
  });

  test("prime directions keep components and drop document titles and emails", () => {
    const p = parsePrimeDirections(PRIME);
    expect(p.components.map((c) => c.top_terms)).toEqual([["energy"], ["cell"]]);
    expect(JSON.stringify(p)).not.toContain("Private title");
    expect(JSON.stringify(p)).not.toContain("@");
  });
});

describe("people store", () => {
  let dir: string;
  let store: Store;
  let key: Buffer;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bkt-people-"));
    key = newDataKey();
    store = new Store(join(dir, "bkt.db"), key);
  });
  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("stores no email from a private-build file and writes nothing to the outbox", () => {
    const people = new PeopleStore(store, key);
    expect(people.importReview(parseAdvisorReview(REVIEW), 1)).toEqual({ imported: 3, forgotten: 0 });
    store.db.run("pragma wal_checkpoint(truncate)");
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f)).includes("@uni.example")).toBe(false);
    expect(store.outboxCount()).toBe(0);
    expect(people.review()!.rows).toHaveLength(3);
  });

  test("people tables stay out of hub sync", () => {
    for (const t of LOCAL_ONLY_TABLES) expect((SYNC_TABLES as readonly string[]).includes(t)).toBe(false);
    const tables = store.db.query<{ name: string }, []>("select name from sqlite_master where type = 'table'").all().map((r) => r.name);
    for (const t of LOCAL_ONLY_TABLES) expect(tables).toContain(t);
  });

  test("forget keeps only keyed hashes, and a later import skips those people until confirmed", () => {
    const people = new PeopleStore(store, key);
    people.importReview(parseAdvisorReview(REVIEW), 1);
    expect(people.forget(2)).toBe(3);
    expect(people.review()).toBeNull();
    store.db.run("pragma wal_checkpoint(truncate)");
    const marks = store.db.query<{ mark: string }, []>("select mark from people_forget").all().map((r) => r.mark);
    expect(marks.every((m) => /^[0-9a-f]{64}$/.test(m))).toBe(true);
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f)).includes("Stone")).toBe(false);

    const again = { ...REVIEW, rows: [...REVIEW.rows, privateRow(4, "Lena Brook", "West University")] };
    expect(people.importReview(parseAdvisorReview(again), 3)).toEqual({ imported: 1, forgotten: 3 });
    expect(people.review()!.rows.map((r) => r.name)).toEqual(["Lena Brook"]);
    expect(people.importReview(parseAdvisorReview(again), 4, true)).toEqual({ imported: 4, forgotten: 0 });
    expect(people.forgottenCount()).toBe(0);
  });

  test("marks depend on the device key", () => {
    const row = parseAdvisorReview(REVIEW).rows[0];
    expect(personMark(forgetKey(key), row)).not.toBe(personMark(forgetKey(newDataKey()), row));
    expect(personMark(forgetKey(key), row)).toBe(personMark(forgetKey(key), { ...row, name: "  avery   STONE " }));
  });

  test("prime direction sets replace by corpus", () => {
    const people = new PeopleStore(store, key);
    people.importDirections(parsePrimeDirections(PRIME), 1);
    people.importDirections(parsePrimeDirections({ ...PRIME, components: PRIME.components.slice(0, 1) }), 2);
    expect(people.directions().map((d) => [d.corpus, d.components.length])).toEqual([["academy", 1]]);
  });
});

describe("advisor routes", () => {
  let s: Serve;
  let store: Store;
  let auth: Record<string, string>;
  const req = (path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body, headers: { host: `127.0.0.1:${s.port}`, ...auth, ...init.headers } });

  beforeEach(async () => {
    const key = newDataKey();
    store = new Store(":memory:", key);
    s = startServe({
      uid: 9,
      resolvePeerUid: () => 9,
      routes: advisorRoutes(new PeopleStore(store, key), () => 5),
      routeBodyBytes: { "POST /local/advisor/import": REVIEW_BODY_BYTES, "POST /local/prime-directions/import": REVIEW_BODY_BYTES },
    });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await req("/session", { method: "POST", body: JSON.stringify({ nonce }), headers: { origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
  });
  afterEach(() => {
    s.stop();
    store.close();
  });

  test("import, read, forget and confirmed re-import", async () => {
    const big = { ...REVIEW, rows: Array.from({ length: 1500 }, (_, i) => privateRow(i + 1, `Person ${i}`, "Inst")) };
    expect(JSON.stringify(big).length).toBeGreaterThan(256 * 1024);
    expect(await (await req("/local/advisor/import", { method: "POST", body: JSON.stringify(big) })).json()).toEqual({ imported: 1500, forgotten: 0 });
    const got = await (await req("/local/advisor")).text();
    expect(got).not.toContain("@uni.example");
    expect(JSON.parse(got).review.rows).toHaveLength(1500);
    expect(await (await req("/local/advisor/forget", { method: "POST", body: "{}" })).json()).toEqual({ forgotten: 1500 });
    expect(await (await req("/local/advisor/import", { method: "POST", body: JSON.stringify(big) })).json()).toEqual({ imported: 0, forgotten: 1500 });
    expect(await (await req("/local/advisor/import?force=1", { method: "POST", body: JSON.stringify(big) })).json()).toEqual({ imported: 1500, forgotten: 0 });
  });

  test("bad files get a 400 with a reason", async () => {
    const r = await req("/local/advisor/import", { method: "POST", body: "not json" });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("the file is not valid JSON");
    expect((await req("/local/prime-directions/import", { method: "POST", body: JSON.stringify(REVIEW) })).status).toBe(400);
  });

  test("prime directions import and list", async () => {
    expect(await (await req("/local/prime-directions/import", { method: "POST", body: JSON.stringify(PRIME) })).json()).toEqual({ corpus: "academy", components: 2 });
    const sets = ((await (await req("/local/prime-directions")).json()) as { sets: { corpus: string }[] }).sets;
    expect(sets.map((x) => x.corpus)).toEqual(["academy"]);
  });

  test("the routes need the header token", async () => {
    auth = {};
    expect((await req("/local/advisor")).status).toBe(401);
    expect((await req("/local/advisor/forget", { method: "POST", body: "{}" })).status).toBe(401);
  });
});
