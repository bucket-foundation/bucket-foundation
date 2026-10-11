import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import {
  BAD_MODE,
  checkLinkUrl,
  EMBED_BUSY,
  EMBED_QUEUE,
  LINK_FILE,
  LinkError,
  linkPlace,
  loadLink,
  LOOPBACK_ONLY,
  NO_SEED,
  NOT_LINKED,
  PolingualLink,
  polingualLinkRoutes,
  saveLink,
  STATEMENT_TIMEOUT_MS,
  UNREACHABLE,
  type LinkDb,
  type LinkMode,
  type LinkRow,
  type LinkSearch,
  type LinkStatus,
} from "../src/polingual-link";

const ROOT = mkdtempSync(join(tmpdir(), "bkt-link-"));
const KEY = newDataKey();
const GOOD = "postgres://bucket:s3cret-pw@127.0.0.1:5433/polingual";
const CREDIT = { text: "Words from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.", licence: "CC-BY-SA 3.0", licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/", href: "https://en.wiktionary.org", sourceHref: "https://kaikki.org" };
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

const ROWS: LinkRow[] = [
  { lang: "es", surface: "agua", ipa: "/ˈaɡwa/", pos: "noun", meaning_en: "water · rain", distance: 0.05 },
  { lang: "ar", surface: "ماء", ipa: "/maːʔ/", pos: "noun", meaning_en: "water", distance: 0.08 },
  { lang: "zh", surface: "水", ipa: null, pos: "noun", meaning_en: "water", distance: 0.1 },
  { lang: "got", surface: "𐍅𐌰𐍄𐍉", ipa: "", pos: "prep_phrase", meaning_en: null, distance: 1.7 },
];

function fake(o: { fail?: boolean; seed?: boolean } = {}) {
  const calls: unknown[][] = [];
  let closed = 0;
  const db: LinkDb = {
    async count() {
      if (o.fail) throw new Error(`connect ECONNREFUSED ${GOOD}`);
      return 6_564_942;
    },
    async seed(word: string, mode: LinkMode) {
      calls.push(["seed", word, mode]);
      if (o.fail) throw new Error("canceling statement due to statement timeout");
      return o.seed === false ? null : { id: "photon:word:nl:water", lang: "nl", surface: "water", meaning_en: "water (H₂O) · body of water" };
    },
    async near(mode, from, lang, limit) {
      calls.push(["near", mode, "id" in from ? from.id : `vector:${from.vector.length}`, lang, limit]);
      return ROWS.slice(0, limit);
    },
    async close() {
      closed++;
    },
  };
  return { db, calls, closed: () => closed };
}

let n = 0;
function link(o: { fail?: boolean; seed?: boolean; embed?: (t: string) => Promise<number[] | null>; url?: string | null } = {}) {
  const dir = join(ROOT, `d${n++}`);
  mkdirSync(dir, { recursive: true });
  if (o.url !== null) saveLink(dir, KEY, o.url ?? GOOD);
  const f = fake(o);
  const urls: string[] = [];
  const errors: string[] = [];
  const l = new PolingualLink({ dir, key: KEY, credit: CREDIT, connect: (u) => (urls.push(u), f.db), embed: o.embed, onError: (m) => errors.push(m) });
  return { l, dir, urls, errors, ...f };
}

const refusal = async (run: () => unknown): Promise<LinkError> => {
  try {
    await run();
  } catch (e) {
    expect(e).toBeInstanceOf(LinkError);
    return e as LinkError;
  }
  throw new Error("nothing was refused");
};

describe("the address", () => {
  test("loopback addresses pass and come back without options", () => {
    expect(checkLinkUrl(` ${GOOD} `)).toBe(GOOD);
    expect(checkLinkUrl("postgresql://u@localhost/db")).toBe("postgres://u@localhost/db");
    expect(checkLinkUrl("postgres://u:p@[::1]:5432/db")).toBe("postgres://u:p@[::1]:5432/db");
    expect(checkLinkUrl("postgres://u:p@LOCALHOST:5433/db")).toBe("postgres://u:p@localhost:5433/db");
    expect(checkLinkUrl("POSTGRES://u:p@LocalHost/db")).toBe("postgres://u:p@localhost/db");
    expect(linkPlace(GOOD)).toBe("127.0.0.1:5433/polingual");
    expect(STATEMENT_TIMEOUT_MS).toBe(5000);
  });

  test("any other host, scheme or shape is refused", () => {
    for (const bad of [
      "postgres://u:p@db.example.com/polingual",
      "postgres://u:p@10.0.0.5:5432/polingual",
      "postgres://u:p@127.0.0.1.evil.test/polingual",
      "postgres://u:p@0.0.0.0/polingual",
      "postgres://u:p@localhost.evil.test/db",
      "postgres://u:p@LOCALHOST.evil.test/db",
      "postgres://u:p@EXAMPLE.COM/db",
      "postgres://u:p@127.0.0.1/db?host=db.example.com",
      "postgres://u:p@127.0.0.1/db?options=-c%20x",
      "postgres://u:p@127.0.0.1/db#x",
      "postgres://127.0.0.1/db",
      "postgres://u:p@127.0.0.1/",
      "postgres://u:p@127.0.0.1/a/b",
      "http://127.0.0.1:5433/polingual",
      "mysql://u:p@127.0.0.1/db",
      "not an address",
      "",
      "x".repeat(2000),
      42,
      null,
    ])
      expect(() => checkLinkUrl(bad)).toThrow(LinkError);
    expect(() => checkLinkUrl("postgres://u:p@example.com/db")).toThrow(LOOPBACK_ONLY);
  });
});

describe("storage", () => {
  test("the address is sealed on disk, private, and opens only with the same key", () => {
    const dir = join(ROOT, "seal");
    mkdirSync(dir);
    saveLink(dir, KEY, GOOD);
    const raw = readFileSync(join(dir, LINK_FILE), "utf8");
    for (const leak of ["s3cret-pw", "bucket", "127.0.0.1", "polingual", "postgres"]) expect(raw).not.toContain(leak);
    expect(statSync(join(dir, LINK_FILE)).mode & 0o077).toBe(0);
    expect(loadLink(dir, KEY)).toBe(GOOD);
    expect(loadLink(dir, newDataKey())).toBeNull();
    saveLink(dir, KEY, null);
    expect(existsSync(join(dir, LINK_FILE))).toBe(false);
    expect(loadLink(dir, KEY)).toBeNull();
    expect(() => saveLink(dir, KEY, "postgres://u:p@example.com/db")).toThrow(LinkError);
    expect(existsSync(join(dir, LINK_FILE))).toBe(false);
  });
});

describe("link", () => {
  test("with no address nothing connects and search says so", async () => {
    const x = link({ url: null });
    expect(await x.l.status()).toEqual({ freeText: false, linked: false, place: null, reachable: false, words: null });
    expect((await refusal(() => x.l.search("water", "meaning", null))).message).toBe(NOT_LINKED);
    expect(x.urls).toEqual([]);
  });

  test("status names the place and the word count and never the password", async () => {
    const x = link();
    const s = await x.l.status();
    expect(s).toEqual({ freeText: false, linked: true, place: "127.0.0.1:5433/polingual", reachable: true, words: 6_564_942 });
    expect(JSON.stringify(s)).not.toContain("s3cret");
    expect(x.urls).toEqual([GOOD]);
  });

  test("a database that does not answer reads as unreachable, and the log line hides the address", async () => {
    const x = link({ fail: true });
    expect(await x.l.status()).toMatchObject({ linked: true, reachable: false, words: null });
    expect(x.closed()).toBe(1);
    const e = await refusal(() => x.l.search("water", "meaning", null));
    expect([e.message, e.status]).toEqual([UNREACHABLE, 502]);
    expect(x.errors.length).toBe(2);
    for (const line of x.errors) expect(line).not.toContain("s3cret");
    expect(x.errors[0]).toContain("the linked database");
  });

  test("meaning search starts from the stored vector of the typed word and returns words in their scripts", async () => {
    const x = link();
    const found = await x.l.search("  water ", "meaning", "es", 3);
    expect(x.calls).toEqual([
      ["seed", "water", "meaning"],
      ["near", "meaning", "photon:word:nl:water", "es", 3],
    ]);
    expect(found.from).toEqual({ lang: "nl", name: "Dutch", word: "water", meaning: "water (H₂O)" });
    expect(found.hits.map((h) => [h.name, h.word, h.dir, h.script, h.ipa, h.pos, h.meaning])).toEqual([
      ["Spanish", "agua", "ltr", "latin", "ˈaɡwa", "noun", "water · rain"],
      ["Arabic", "ماء", "rtl", "arabic", "maːʔ", "noun", "water"],
      ["Chinese", "水", "ltr", "han", "", "noun", "water"],
    ]);
    expect(found.hits[0].closeness).toBeCloseTo(0.95, 5);
    expect(found.hits[0].href).toBe("https://en.wiktionary.org/wiki/agua");
    expect(found.credit.licence).toBe("CC-BY-SA 3.0");
  });

  test("sounds-like uses the phonetic vector, clamps the count, and copes with a language Bucket has no name for", async () => {
    const x = link();
    const found = await x.l.search("water", "sound", null, 999);
    expect(x.calls[0]).toEqual(["seed", "water", "sound"]);
    expect(x.calls[1]).toEqual(["near", "sound", "photon:word:nl:water", null, 40]);
    const got = found.hits[3];
    expect([got.lang, got.name, got.pos, got.meaning, got.closeness]).toEqual(["got", "got", "prep phrase", "", 0]);
  });

  test("a word the table lacks: meaning falls back to local embedding when it is there, sound says what to type", async () => {
    const vector = Array.from({ length: 768 }, () => 0.01);
    const withModel = link({ seed: false, embed: async () => vector });
    const first = await refusal(() => withModel.l.search("a quiet place to read", "meaning", "en"));
    expect([first.message, first.status]).toEqual(["working", 202]);
    await new Promise((r) => setTimeout(r, 0));
    const found = await withModel.l.search("a quiet place to read", "meaning", "en");
    expect(found.from).toBeNull();
    expect(withModel.calls.at(-1)).toEqual(["near", "meaning", "vector:768", "en", 12]);
    expect((await withModel.l.status()).freeText).toBe(true);
    expect((await refusal(() => withModel.l.search("a quiet place", "sound", null))).message).toBe(NO_SEED);
    const noModel = link({ seed: false });
    const e = await refusal(() => noModel.l.search("a quiet place to read", "meaning", null));
    expect([e.message, e.status]).toEqual([NO_SEED, 404]);
    const broken = link({ seed: false, embed: async () => null });
    expect((await refusal(() => broken.l.search("zzz", "meaning", null))).status).toBe(202);
    await new Promise((r) => setTimeout(r, 0));
    expect((await refusal(() => broken.l.search("zzz", "meaning", null))).message).toBe(NO_SEED);
    expect((await refusal(() => noModel.l.search("   ", "meaning", null))).message).toBe("type a word to search for");
  });

  test("one embedding runs at a time, a full queue is refused, and a failed one does not block the next", async () => {
    let running = 0;
    let peak = 0;
    const started: string[] = [];
    const release: (() => void)[] = [];
    const x = link({
      seed: false,
      embed: async (text) => {
        started.push(text);
        running++;
        peak = Math.max(peak, running);
        await new Promise<void>((go) => release.push(go));
        running--;
        if (text === "p1") throw new Error("model crashed");
        return Array.from({ length: 768 }, () => 0.01);
      },
    });
    const ask = (q: string) => refusal(() => x.l.search(q, "meaning", null));
    for (const q of ["p0", "p1", "p2", "p3"]) expect((await ask(q)).status).toBe(202);
    expect((await ask("p0")).status).toBe(202);
    const full = await ask("p4");
    expect([full.status, full.message]).toEqual([429, EMBED_BUSY]);
    expect(started).toEqual(["p0"]);
    for (let i = 0; i < 4; i++) {
      release[i]();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(started).toEqual(["p0", "p1", "p2", "p3"]);
    expect(peak).toBe(1);
    expect((await x.l.search("p0", "meaning", null)).hits.length).toBeGreaterThan(0);
    expect((await ask("p1")).message).toBe(NO_SEED);
    expect((await ask("p4")).status).toBe(202);
    expect(EMBED_QUEUE).toBe(4);
  });

  test("setting an address checks it, seals it and reconnects; clearing it removes the file", async () => {
    const x = link({ url: null });
    expect((await refusal(() => x.l.set("postgres://u:p@example.com/db"))).message).toBe(LOOPBACK_ONLY);
    expect(existsSync(join(x.dir, LINK_FILE))).toBe(false);
    expect(await x.l.set(GOOD)).toMatchObject({ linked: true, reachable: true });
    expect(loadLink(x.dir, KEY)).toBe(GOOD);
    expect(await x.l.set("")).toMatchObject({ linked: false, place: null });
    expect(existsSync(join(x.dir, LINK_FILE))).toBe(false);
    expect(x.closed()).toBe(1);
  });
});

describe("routes", () => {
  test("status, set and search answer in the shapes the window reads and never echo the address", async () => {
    const x = link({ url: null });
    const routes = polingualLinkRoutes(x.l);
    const call = async (key: string, body?: unknown) => {
      const [method, path] = key.split(" ");
      const url = new URL(path, "http://127.0.0.1");
      const r = await routes[`${method} ${url.pathname}`](new Request(url, body === undefined ? { method } : { method, body: JSON.stringify(body) }), url);
      const text = await r.text();
      expect(text).not.toContain("s3cret");
      return { status: r.status, body: JSON.parse(text) as LinkStatus & LinkSearch & { error?: string } };
    };
    expect((await call("GET /local/polingual-link")).body.linked).toBe(false);
    expect((await call("GET /local/polingual-link/search?q=water&mode=meaning")).status).toBe(404);
    expect((await call("POST /local/polingual-link", { url: "postgres://u:p@8.8.8.8/db" })).body.error).toBe(LOOPBACK_ONLY);
    expect((await call("POST /local/polingual-link", {})).status).toBe(400);
    expect((await call("POST /local/polingual-link", { url: GOOD })).body).toMatchObject({ linked: true, place: "127.0.0.1:5433/polingual", words: 6_564_942 });
    const found = await call("GET /local/polingual-link/search?q=water&mode=sound&lang=es&n=2");
    expect([found.status, found.body.mode, found.body.hits.length, found.body.credit.licence]).toEqual([200, "sound", 2, "CC-BY-SA 3.0"]);
    expect(x.calls.at(-1)).toEqual(["near", "sound", "photon:word:nl:water", "es", 2]);
    expect((await call("GET /local/polingual-link/search?q=water&mode=spelling")).body.error).toBe(BAD_MODE);
    await call("GET /local/polingual-link/search?q=water&mode=meaning&lang=es';drop");
    expect(x.calls.at(-1)).toEqual(["near", "meaning", "photon:word:nl:water", null, 12]);
    expect((await call("POST /local/polingual-link", { url: "" })).body.linked).toBe(false);
  });
});
