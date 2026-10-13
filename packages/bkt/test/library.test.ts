import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { resolve } from "../src/cli/run";
import { DECK_FILE_EXT, DECK_FILE_MAGIC, DeckExistsError, exportDeck, installAny, isDeckFile, readDeckFileManifest } from "../src/deck-file";
import { DeckError, decksDir, installDeck, listInstalled } from "../src/decks";
import { allowedCatalogUrl, buildCatalog, CATALOG_BYTES, DECK_FILE_MOVED, DECK_FILE_PATH, DECK_FILE_REFUSED, DECK_FILE_TIMEOUT_MS, deckFileRedirect, deckFileUrl, CATALOG_DECKS_MAX, CATALOG_NAMESPACE, CATALOG_URL, checkCatalog, DECK_CATALOG_PUBKEY, DOWNLOAD_CHANGED, DOWNLOAD_FAILED, Library, libraryRoutes, NO_CATALOG_KEY, NOT_IN_CATALOG, OFFLINE_NOTE, STALE_REFRESH, UNSIGNED_REFRESH, verifyCatalog, type Catalog, type LibraryBody, type SignedCatalog } from "../src/library";
import { bundledCatalog, catalogText, curatedCatalog } from "../src/pack/decks";
import { ARABIC, buildDeck, CHINESE, FIXTURE_LICENCE, GERMAN } from "./fixtures/deck";

const REPO = resolvePath(import.meta.dir, "../../..");
const ROOT = mkdtempSync(join(tmpdir(), "bkt-library-"));
const SITE = join(ROOT, "site");
const DE = buildDeck(SITE, "de", "German", GERMAN);
const AR = buildDeck(SITE, "ar", "Arabic", ARABIC);
const CATALOG = buildCatalog([DE.manifest, AR.manifest]);
let server: ReturnType<typeof Bun.serve>;
let base = "";
let hits: string[] = [];
let slow = false;
let swap: Uint8Array | null = null;
function keyPair(name: string): { key: string; pub: string } {
  const key = join(ROOT, name);
  Bun.spawnSync(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", name, "-f", key]);
  return { key, pub: readFileSync(`${key}.pub`, "utf8").trim() };
}
const KEY = keyPair("catalog-key");
const OTHER_KEY = keyPair("other-key");
let signCount = 0;
function sign(text: string, key = KEY.key, namespace = CATALOG_NAMESPACE): string {
  const file = join(ROOT, `to-sign-${signCount++}`);
  writeFileSync(file, text);
  const r = Bun.spawnSync(["ssh-keygen", "-q", "-Y", "sign", "-f", key, "-n", namespace, file]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return readFileSync(`${file}.sig`, "utf8");
}
const signed = (c: Catalog): SignedCatalog => {
  const text = catalogText(c);
  return { text, signature: sign(text) };
};
let served: SignedCatalog = signed(CATALOG);
let redirect: string | null = null;
let bare = false;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      hits.push(path);
      if (redirect && path === "/decks/catalog.json") return Response.redirect(redirect, 302);
      if (path === "/decks/catalog.json") return bare ? new Response(new ReadableStream({ start: (c) => (c.enqueue(new TextEncoder().encode(served.text)), c.close()) })) : new Response(served.text, { headers: { "content-type": "application/json" } });
      if (path === "/decks/catalog.json.sig") return served.signature ? new Response(served.signature) : new Response("no", { status: 404 });
      const m = /^\/decks\/polingual-([a-z]+)\/(polingual-[a-z]+\.sqlite\.zst)$/.exec(path);
      if (!m || !existsSync(join(SITE, m[1], m[2]))) return new Response("no", { status: 404 });
      const bytes = swap ?? new Uint8Array(readFileSync(join(SITE, m[1], m[2])));
      if (!slow) return new Response(new Blob([bytes as BlobPart]));
      const step = Math.ceil(bytes.length / 4);
      return new Response(
        new ReadableStream({
          async start(c) {
            for (let at = 0; at < bytes.length; at += step) {
              c.enqueue(bytes.subarray(at, at + step));
              await new Promise((r) => setTimeout(r, 40));
            }
            c.close();
          },
        }),
      );
    },
  });
  base = `http://127.0.0.1:${server.port}/decks/catalog.json`;
});

afterAll(() => {
  server.stop(true);
  rmSync(ROOT, { recursive: true, force: true });
});

let n = 0;
function lib(o: { offline?: boolean; bundled?: Catalog; bundle?: SignedCatalog; pubkey?: string; home?: string; onChange?: () => void } = {}) {
  const home = o.home ?? join(ROOT, `home-${n++}`);
  return { home, lib: new Library({ home, bundled: o.bundle ?? signed(o.bundled ?? CATALOG), pubkey: o.pubkey ?? KEY.pub, url: base, offline: () => o.offline ?? false, now: () => 1_760_000_000_000, downloads: () => join(home, "out"), onChange: o.onChange }) };
}

const refusal = async (run: () => unknown): Promise<string> => {
  try {
    await run();
  } catch (e) {
    expect(e).toBeInstanceOf(DeckError);
    return (e as Error).message;
  }
  throw new Error("nothing was refused");
};

describe("catalog", () => {
  test("the committed catalog matches the curated manifests, one folder per deck, each with licence and curator", () => {
    const built = curatedCatalog(REPO);
    expect(readFileSync(join(REPO, "decks/catalog.json"), "utf8")).toBe(catalogText(built));
    expect(checkCatalog(JSON.parse(readFileSync(join(REPO, "decks/catalog.json"), "utf8"))).sha256).toBe(built.sha256);
    const folders = readdirSync(join(REPO, "decks"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(built.decks.map((d) => d.id)).toEqual(folders.sort());
    expect(built.decks.length).toBeGreaterThanOrEqual(35);
    for (const d of built.decks) {
      expect([d.licence, d.curator, d.source.length > 0, /^[0-9a-f]{64}$/.test(d.sha256), d.counts.cards > 0, d.bytes > 0]).toEqual(["CC-BY-SA 3.0", "Bucket Foundation", true, true, true, true]);
      expect(JSON.stringify(d)).not.toContain("/home/");
    }
    expect(built.decks.reduce((sum, d) => sum + d.counts.cards, 0)).toBe(6_564_942);
    expect(built.serial).toBeGreaterThanOrEqual(1);
    expect(curatedCatalog(REPO, { publish: true }).serial).toBe(built.serial);
    const bundle = bundledCatalog(REPO);
    expect(bundle.text).toBe(catalogText(built));
    if (DECK_CATALOG_PUBKEY) expect(verifyCatalog(bundle)?.sha256).toBe(built.sha256);
    else expect(verifyCatalog(bundle)).toBeNull();
    for (const file of readdirSync(join(REPO, "decks"))) expect(/key|\.pem$|ed25519/i.test(file)).toBe(false);
  });

  test("publishing raises the serial when the decks change and holds it when they do not", () => {
    const repo = join(ROOT, "publish");
    const put = (m: { id: string }) => {
      mkdirSync(join(repo, "decks", m.id), { recursive: true });
      writeFileSync(join(repo, "decks", m.id, "manifest.json"), JSON.stringify(m));
    };
    const publish = () => {
      const c = curatedCatalog(repo, { publish: true });
      writeFileSync(join(repo, "decks", "catalog.json"), catalogText(c));
      return c;
    };
    put(DE.manifest);
    expect([publish().serial, publish().serial]).toEqual([1, 1]);
    put(AR.manifest);
    expect(catalogText(curatedCatalog(repo))).not.toBe(readFileSync(join(repo, "decks", "catalog.json"), "utf8"));
    expect([publish().serial, publish().serial, curatedCatalog(repo).decks.length]).toEqual([2, 2, 2]);
  });

  test("a catalog with a changed entry, a repeated deck or a deck with no licence is refused", () => {
    expect(checkCatalog(JSON.parse(JSON.stringify(CATALOG))).decks.length).toBe(2);
    const edited = JSON.parse(JSON.stringify(CATALOG)) as Catalog;
    edited.decks[0].sha256 = "0".repeat(64);
    expect(() => checkCatalog(edited)).toThrow("does not match its checksum");
    expect(() => buildCatalog([DE.manifest, DE.manifest])).toThrow("share an id");
    const { licence: _l, ...bare } = DE.manifest;
    expect(() => buildCatalog([bare])).toThrow("names no licence");
    expect(() => checkCatalog({ ...CATALOG, format_version: 9 })).toThrow("run bkt update");
    expect(() => checkCatalog(null)).toThrow(DeckError);
  });

  test("the catalog address is bucket.foundation over https, or loopback in tests", () => {
    expect(allowedCatalogUrl(CATALOG_URL).href).toBe("https://www.bucket.foundation/decks/catalog.json");
    expect(allowedCatalogUrl("http://127.0.0.1:9/decks/catalog.json").port).toBe("9");
    for (const bad of ["https://example.com/decks/catalog.json", "https://bucket.foundation/decks/catalog.json", "http://www.bucket.foundation/decks/catalog.json", "https://www.bucket.foundation.evil.test/c.json", "https://bucket.foundation.evil.test/c.json", "file:///etc/passwd", "nope"]) expect(() => allowedCatalogUrl(bad)).toThrow(DeckError);
  });
});

describe("library", () => {
  test("opens on the bundled catalog and contacts nothing until asked", () => {
    hits = [];
    const { lib: l } = lib();
    const body = l.body();
    expect([body.from, body.refreshedAt, body.offline, body.built]).toEqual(["bundled", null, false, "2026-10-11"]);
    expect(body.decks.map((d) => [d.id, d.state, d.cards, d.licence, d.curator, d.downloadBytes])).toEqual([
      ["polingual-ar", "available", ARABIC.length, FIXTURE_LICENCE, "Bucket Foundation", AR.manifest.bytes],
      ["polingual-de", "available", GERMAN.length, FIXTURE_LICENCE, "Bucket Foundation", DE.manifest.bytes],
    ]);
    expect(hits).toEqual([]);
  });

  test("offline, refresh and download are refused in a sentence and nothing is contacted", async () => {
    hits = [];
    const { lib: l, home } = lib({ offline: true });
    expect(l.body().offline).toBe(true);
    expect(await refusal(() => l.refresh())).toBe(OFFLINE_NOTE);
    expect(await refusal(() => l.start("polingual-de"))).toBe(OFFLINE_NOTE);
    expect(hits).toEqual([]);
    expect(listInstalled(home)).toEqual([]);
  });

  test("refresh reads the catalog once, keeps it for the next start, and lists a new deck", async () => {
    hits = [];
    const zh = buildDeck(SITE, "zh", "Chinese", CHINESE);
    served = signed(buildCatalog([DE.manifest, AR.manifest, zh.manifest], 2));
    const { lib: l, home } = lib();
    const body = await l.refresh();
    expect(hits).toEqual(["/decks/catalog.json", "/decks/catalog.json.sig"]);
    expect([body.from, body.refreshedAt, body.decks.length]).toEqual(["refreshed", 1_760_000_000_000, 3]);
    expect(lib({ home }).lib.body().decks.map((d) => d.id)).toContain("polingual-zh");
    const edited = catalogText({ ...CATALOG, sha256: "f".repeat(64) });
    served = { text: edited, signature: sign(edited) };
    expect(await refusal(() => l.refresh())).toBe(UNSIGNED_REFRESH);
    expect(l.body().decks.length).toBe(3);
    served = signed(CATALOG);
  });

  test("a download reports progress, verifies, installs and tells the app", async () => {
    slow = true;
    let changed = 0;
    const { lib: l, home } = lib({ onChange: () => changed++ });
    const started = l.start("polingual-de").decks.find((d) => d.id === "polingual-de")!;
    expect([started.state, started.received]).toEqual(["downloading", 0]);
    const seen = new Set<number>();
    const watch = setInterval(() => seen.add(l.body().decks.find((d) => d.id === "polingual-de")!.received), 15);
    expect(l.start("polingual-de").decks.find((d) => d.id === "polingual-de")!.state).toBe("downloading");
    await l.wait("polingual-de");
    clearInterval(watch);
    slow = false;
    expect([...seen].some((r) => r > 0 && r < DE.manifest.bytes)).toBe(true);
    const done = l.body().decks.find((d) => d.id === "polingual-de")!;
    expect([done.state, done.error, done.installedBytes]).toEqual(["installed", null, DE.manifest.db_bytes]);
    expect(listInstalled(home).map((d) => d.manifest.id)).toEqual(["polingual-de"]);
    expect(changed).toBe(1);
    expect(readdirSync(decksDir(home)).filter((f) => f.startsWith("."))).toEqual([]);
  });

  test("a download that differs from the catalog is refused, leaves nothing, and can be tried again", async () => {
    const { lib: l, home } = lib();
    swap = new Uint8Array(readFileSync(DE.packed));
    swap[30] ^= 0xff;
    l.start("polingual-de");
    await l.wait("polingual-de");
    const failed = l.body().decks.find((d) => d.id === "polingual-de")!;
    expect([failed.state, failed.error]).toEqual(["failed", DOWNLOAD_CHANGED]);
    expect(listInstalled(home)).toEqual([]);
    swap = new Uint8Array(DE.manifest.bytes + 10);
    l.forget("polingual-de");
    l.start("polingual-de");
    await l.wait("polingual-de");
    expect(l.body().decks.find((d) => d.id === "polingual-de")!.error).toBe(DOWNLOAD_CHANGED);
    swap = null;
    l.forget("polingual-de");
    l.start("polingual-de");
    await l.wait("polingual-de");
    expect(l.body().decks.find((d) => d.id === "polingual-de")!.state).toBe("installed");
    expect(readdirSync(decksDir(home)).filter((f) => f.startsWith("."))).toEqual([]);
    expect(await refusal(() => l.start("polingual-xx"))).toBe(NOT_IN_CATALOG);
  });

  test("a deck the server lacks fails in a sentence", async () => {
    const ghost = { ...DE.manifest, id: "polingual-qq", file: "polingual-qq.sqlite.zst" };
    const { lib: l } = lib({ bundled: buildCatalog([ghost]) });
    l.start("polingual-qq");
    await l.wait("polingual-qq");
    expect(l.body().decks[0].error).toBe("127.0.0.1 answered 404");
  });

  test("a newer catalog version shows as an update, installs over the old deck, and remove takes it away", async () => {
    const { lib: l, home } = lib();
    const old = buildDeck(join(ROOT, "old"), "de", "German", GERMAN.slice(0, 5), { built: "2026-09-01" });
    await installDeck(home, old.dir);
    expect(l.body().decks.find((d) => d.id === "polingual-de")!.state).toBe("update");
    l.start("polingual-de");
    await l.wait("polingual-de");
    expect(l.body().decks.find((d) => d.id === "polingual-de")!.state).toBe("installed");
    expect(listInstalled(home)[0].manifest.version).toBe(DE.manifest.version);
    expect(l.remove("polingual-de").decks.find((d) => d.id === "polingual-de")!.state).toBe("available");
    expect(await refusal(() => l.remove("polingual-de"))).toBe("that deck is not installed");
  });

  test("a deck from outside the catalog is listed as installed with its own licence", async () => {
    const { lib: l, home } = lib();
    const own = buildDeck(join(ROOT, "own"), "fr", "French", [["maison", "", "noun", "house"]], { id: "my-french" });
    await installDeck(home, own.dir);
    const row = l.body().decks.find((d) => d.id === "my-french")!;
    expect([row.state, row.inCatalog, row.licence]).toEqual(["installed", false, FIXTURE_LICENCE]);
  });
});

describe("updates", () => {
  test("an older deck never replaces a newer one, from a folder, a file or the catalog", async () => {
    const newer = buildDeck(join(ROOT, "newer"), "de", "German", GERMAN.slice(0, 9), { built: "2026-12-01" });
    const { lib: l, home } = lib();
    await installDeck(home, newer.dir);
    expect(await refusal(() => installDeck(home, DE.dir))).toContain("Bucket replaces a deck only with a newer one");
    expect(l.body().decks.find((d) => d.id === "polingual-de")!.state).toBe("installed");
    l.start("polingual-de");
    await l.wait("polingual-de");
    const row = l.body().decks.find((d) => d.id === "polingual-de")!;
    expect(row.state).toBe("failed");
    expect(row.error).toContain("Bucket replaces a deck only with a newer one");
    expect(listInstalled(home)[0].manifest.version).toBe(newer.manifest.version);
    const sameDay = buildDeck(join(ROOT, "same-day"), "de", "German", GERMAN.slice(0, 4), { built: "2026-12-01" });
    expect(await refusal(() => installDeck(home, sameDay.dir))).toContain("only with a newer one");
    expect((await installDeck(home, newer.dir)).version).toBe(newer.manifest.version);
    const file = join(ROOT, "older.bktdeck");
    const elsewhere = join(ROOT, "h-older");
    await installDeck(elsewhere, DE.dir);
    await exportDeck(elsewhere, "de", file);
    expect(await refusal(() => l.import(new Uint8Array(readFileSync(file))))).toContain("only with a newer one");
    expect(listInstalled(home)[0].manifest.version).toBe(newer.manifest.version);
  });

  test("a deck cannot take the id of an installed deck of another language or kind", async () => {
    const { home } = lib();
    await installDeck(home, DE.dir);
    const reuse = buildDeck(join(ROOT, "reuse"), "fr", "French", [["maison", "", "noun", "house"]], { id: "polingual-de", built: "2027-01-01" });
    expect(await refusal(() => installDeck(home, reuse.dir))).toContain("another deck cannot take that name");
    expect(listInstalled(home)[0].manifest.language).toBe("de");
  });
});

describe("release downloads", () => {
  const RELEASE = `https://github.com${DECK_FILE_PATH}decks-2026-10-11/`;
  const STORE = "https://release-assets.githubusercontent.com/github-production-release-asset/1/de?sig=1";
  const released = { ...DE.manifest, file_url: `${RELEASE}${DE.manifest.file}` };
  const from = (answers: Record<string, () => Response>) => {
    const asked: [string, RequestRedirect | undefined][] = [];
    const home = join(ROOT, `home-${n++}`);
    const l = new Library({
      home,
      bundled: signed(buildCatalog([released])),
      pubkey: KEY.pub,
      url: base,
      offline: () => false,
      fetch: async (url, init) => {
        asked.push([url, init?.redirect]);
        return answers[url]?.() ?? new Response("no", { status: 404 });
      },
    });
    return { l, home, asked };
  };
  const moved = (to: string) => () => new Response(null, { status: 302, headers: { location: to } });
  const bytes = (edit?: (b: Uint8Array) => void) => () => {
    const b = new Uint8Array(readFileSync(DE.packed));
    edit?.(b);
    return new Response(new Blob([b as BlobPart]));
  };

  test("every committed deck names its file in the Bucket release on github.com", () => {
    for (const d of curatedCatalog(REPO).decks) expect(deckFileUrl(d)?.href).toBe(`${RELEASE}${d.file}`);
    expect(deckFileUrl(CATALOG.decks[0])).toBeNull();
  });

  test("a catalog whose deck link leaves the Bucket release path is refused whole", () => {
    expect(checkCatalog(JSON.parse(JSON.stringify(buildCatalog([released])))).decks[0].file_url).toBe(released.file_url);
    const elsewhere = [
      `https://example.com${DECK_FILE_PATH}decks-2026-10-11/${DE.manifest.file}`,
      `https://github.com.evil.test${DECK_FILE_PATH}decks-2026-10-11/${DE.manifest.file}`,
      `https://github.com/someone/else/releases/download/decks-2026-10-11/${DE.manifest.file}`,
      `https://github.com${DECK_FILE_PATH}decks-2026-10-11/../../../../../someone/else/${DE.manifest.file}`,
      `https://github.com${DECK_FILE_PATH}decks-2026-10-11/polingual-ar.sqlite.zst`,
      `https://github.com:8443${DECK_FILE_PATH}decks-2026-10-11/${DE.manifest.file}`,
      `https://user@github.com${DECK_FILE_PATH}decks-2026-10-11/${DE.manifest.file}`,
      `${RELEASE}${DE.manifest.file}?x=/${DE.manifest.file}`,
    ];
    for (const file_url of elsewhere) {
      expect(() => buildCatalog([{ ...DE.manifest, file_url }])).toThrow(DECK_FILE_REFUSED);
      const decks = [{ ...DE.manifest, file_url }];
      expect(() => checkCatalog({ ...CATALOG, decks })).toThrow(DECK_FILE_REFUSED);
    }
    expect(() => buildCatalog([{ ...DE.manifest, file_url: `http://github.com${DECK_FILE_PATH}x/${DE.manifest.file}` }])).toThrow("no https link");
    for (const to of [null, "nope", "/relative", "http://release-assets.githubusercontent.com/a", "https://release-assets.githubusercontent.com.evil.test/a", "https://example.com/a", "https://release-assets.githubusercontent.com:444/a"]) expect(() => deckFileRedirect(to)).toThrow(DECK_FILE_MOVED);
  });

  test("a released deck follows one redirect to the release store, is checked against the catalog, and installs", async () => {
    const { l, home, asked } = from({ [released.file_url]: moved(STORE), [STORE]: bytes() });
    l.start("polingual-de");
    await l.wait("polingual-de");
    expect(l.body().decks[0].state).toBe("installed");
    expect(asked).toEqual([[released.file_url, "manual"], [STORE, "error"]]);
    expect(listInstalled(home)[0].manifest.sha256).toBe(DE.manifest.sha256);
  });

  test("a deck file gets thirty minutes to arrive, and a download that outlasts its limit fails and installs nothing", async () => {
    expect(DECK_FILE_TIMEOUT_MS).toBe(30 * 60_000);
    const home = join(ROOT, `home-${n++}`);
    const l = new Library({ home, bundled: signed(CATALOG), pubkey: KEY.pub, url: base, offline: () => false, fileTimeoutMs: 50 });
    slow = true;
    l.start("polingual-de");
    await l.wait("polingual-de");
    slow = false;
    expect([l.body().decks.find((d) => d.id === "polingual-de")!.state, l.body().decks.find((d) => d.id === "polingual-de")!.error]).toEqual(["failed", DOWNLOAD_FAILED]);
    expect(listInstalled(home)).toEqual([]);
  });

  test("a redirect to another host, a release that answers without one, a missing file and changed bytes all fail and install nothing", async () => {
    const cases: [Record<string, () => Response>, string][] = [
      [{ [released.file_url]: moved("https://example.com/de"), "https://example.com/de": bytes() }, DECK_FILE_MOVED],
      [{ [released.file_url]: bytes() }, DECK_FILE_MOVED],
      [{}, "github.com answered 404"],
      [{ [released.file_url]: moved(STORE) }, "release-assets.githubusercontent.com answered 404"],
      [{ [released.file_url]: moved(STORE), [STORE]: bytes((b) => (b[30] ^= 0xff)) }, DOWNLOAD_CHANGED],
    ];
    for (const [answers, error] of cases) {
      const { l, home, asked } = from(answers);
      l.start("polingual-de");
      await l.wait("polingual-de");
      expect([l.body().decks[0].state, l.body().decks[0].error]).toEqual(["failed", error]);
      expect(listInstalled(home)).toEqual([]);
      expect(asked.some(([url]) => url.startsWith("https://example.com"))).toBe(false);
    }
  });
});

describe("hostile catalogs", () => {
  test("a list with no signature, another key, another namespace or a changed byte is refused and nothing is shown from it", async () => {
    const zh = buildDeck(join(ROOT, "hz"), "zh", "Chinese", CHINESE);
    const text = catalogText(buildCatalog([DE.manifest, AR.manifest, zh.manifest]));
    const { lib: l, home } = lib();
    for (const bad of [
      { text, signature: "" },
      { text, signature: sign(text, OTHER_KEY.key) },
      { text, signature: sign(text, KEY.key, "bucket-release") },
      { text: text.replace("Chinese words", "Chinese wordz"), signature: sign(text) },
      { text, signature: "-----BEGIN SSH SIGNATURE-----\nAAAA\n-----END SSH SIGNATURE-----\n" },
      { text: "not json", signature: sign("not json") },
    ]) {
      served = bad;
      expect(await refusal(() => l.refresh())).toBe(bad.signature ? UNSIGNED_REFRESH : "127.0.0.1 answered 404");
      expect(l.body().decks.map((d) => d.id)).toEqual(["polingual-ar", "polingual-de"]);
      expect(l.body().from).toBe("bundled");
    }
    expect(existsSync(join(decksDir(home), ".catalog.json"))).toBe(false);
    served = signed(CATALOG);
  });

  test("an unsigned bundled list shows no catalog deck, and a copy with no key asks for nothing", async () => {
    hits = [];
    const unsigned = lib({ bundle: { text: catalogText(CATALOG), signature: "" } });
    expect(unsigned.lib.body()).toMatchObject({ decks: [], signed: false });
    expect(await refusal(() => unsigned.lib.start("polingual-de"))).toBe(NOT_IN_CATALOG);
    const wrong = lib({ bundle: { text: catalogText(CATALOG), signature: sign(catalogText(CATALOG), OTHER_KEY.key) } });
    expect(wrong.lib.body().decks).toEqual([]);
    const keyless = lib({ pubkey: "" });
    expect(keyless.lib.body()).toMatchObject({ decks: [], signed: false });
    expect(await refusal(() => keyless.lib.refresh())).toBe(NO_CATALOG_KEY);
    expect(hits).toEqual([]);
    await installDeck(unsigned.home, AR.dir);
    expect(unsigned.lib.body().decks.map((d) => [d.id, d.state, d.inCatalog])).toEqual([["polingual-ar", "installed", false]]);
  });

  test("an oversized list, too many decks, a repeated deck and a deck file outside its folder are refused", async () => {
    const { lib: l } = lib();
    const huge = `${" ".repeat(CATALOG_BYTES + 10)}{}`;
    for (const stream of [false, true]) {
      bare = stream;
      served = { text: huge, signature: sign("x") };
      expect(await refusal(() => l.refresh())).toBe("the deck catalog is too large");
    }
    bare = false;
    const many = Array.from({ length: CATALOG_DECKS_MAX + 1 }, (_, i) => ({ ...DE.manifest, id: `d${i}`, file: `d${i}.zst` }));
    expect(() => checkCatalog({ ...CATALOG, decks: many })).toThrow(`more than ${CATALOG_DECKS_MAX} decks`);
    expect(() => checkCatalog({ ...CATALOG, decks: [DE.manifest, DE.manifest] })).toThrow(DeckError);
    for (const file of ["../../etc/passwd", "a/b.zst", "/abs.zst", ".hidden"]) expect(() => checkCatalog({ ...CATALOG, decks: [{ ...DE.manifest, file }] })).toThrow(DeckError);
    for (const id of ["../x", "a/b", "", "UPPER"]) expect(() => checkCatalog({ ...CATALOG, decks: [{ ...DE.manifest, id }] })).toThrow(DeckError);
    expect(() => buildCatalog([{ ...DE.manifest, bytes: 2 ** 40 }])).toThrow("Bucket takes deck files up to");
    served = signed(CATALOG);
  });

  test("a redirect to another place is refused, and a tampered saved copy is dropped", async () => {
    const { lib: l, home } = lib();
    redirect = "http://127.0.0.1:1/decks/catalog.json";
    await refusal(() => l.refresh()).catch(() => undefined);
    expect(l.body().from).toBe("bundled");
    redirect = null;
    served = signed(buildCatalog([DE.manifest, AR.manifest], 2));
    await l.refresh();
    served = signed(CATALOG);
    const cache = join(decksDir(home), ".catalog.json");
    const saved = JSON.parse(readFileSync(cache, "utf8")) as { at: number; text: string; signature: string };
    writeFileSync(cache, JSON.stringify({ ...saved, text: saved.text.replace("German words", "German w0rds") }));
    expect(lib({ home }).lib.body().from).toBe("bundled");
    writeFileSync(cache, JSON.stringify(saved));
    expect(lib({ home }).lib.body().from).toBe("refreshed");
  });

  test("refresh takes a signed list only when its serial is higher than the one held, so an old signed list cannot be replayed", async () => {
    const zh = buildDeck(join(ROOT, "replay"), "zh", "Chinese", CHINESE);
    const held = buildCatalog([DE.manifest, AR.manifest], 5);
    const { lib: l, home } = lib({ bundled: held });
    const cache = join(decksDir(home), ".catalog.json");
    const ids = () => l.body().decks.map((d) => d.id);
    for (const serial of [1, 4, 5]) {
      served = signed(buildCatalog([zh.manifest], serial));
      expect(await refusal(() => l.refresh())).toBe(STALE_REFRESH);
      expect([l.body().from, ids(), existsSync(cache)]).toEqual(["bundled", ["polingual-ar", "polingual-de"], false]);
    }
    served = signed(held);
    expect([(await l.refresh()).from, existsSync(cache)]).toEqual(["bundled", false]);
    served = signed(buildCatalog([DE.manifest, AR.manifest, zh.manifest], 6));
    expect((await l.refresh()).from).toBe("refreshed");
    const kept = readFileSync(cache, "utf8");
    for (const replayed of [held, buildCatalog([DE.manifest], 6), buildCatalog([DE.manifest], 3)]) {
      served = signed(replayed);
      expect(await refusal(() => l.refresh())).toBe(STALE_REFRESH);
      expect([ids().length, readFileSync(cache, "utf8") === kept]).toEqual([3, true]);
    }
    expect(lib({ home, bundled: buildCatalog([DE.manifest], 7) }).lib.body().from).toBe("bundled");
    expect(lib({ home, bundled: held }).lib.body().from).toBe("refreshed");
    for (const serial of [0, -1, 1.5, "2", undefined]) expect(() => checkCatalog({ ...CATALOG, serial })).toThrow("gives no serial");
    expect(() => checkCatalog({ ...CATALOG, serial: 2 })).toThrow("does not match its checksum");
    expect(() => buildCatalog([DE.manifest], 0)).toThrow(DeckError);
    served = signed(CATALOG);
  });
});

describe("signing script", () => {
  const script = join(REPO, "scripts/release/sign-deck-catalog.sh");
  const run = (...args: string[]) => {
    const r = Bun.spawnSync(["bash", script, ...args], { env: { PATH: process.env.PATH ?? "", HOME: join(ROOT, "signer-home") }, stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
  };

  test("signs a catalog with a key from outside the repo, and the app verifies the result with the public half", () => {
    const file = join(ROOT, "to-publish.json");
    writeFileSync(file, catalogText(CATALOG));
    const made = run("--allow-unencrypted", file, KEY.key);
    expect(made.code).toBe(0);
    expect(made.out.trim()).toBe(`${file}.sig`);
    expect(made.err).toContain(KEY.pub.split(" ")[1]);
    expect(verifyCatalog({ text: readFileSync(file, "utf8"), signature: readFileSync(`${file}.sig`, "utf8") }, KEY.pub)?.sha256).toBe(CATALOG.sha256);
    expect(verifyCatalog({ text: readFileSync(file, "utf8"), signature: readFileSync(`${file}.sig`, "utf8") }, OTHER_KEY.pub)).toBeNull();
  });

  test("refuses a key with no passphrase by default, a missing key, and a key kept inside the repo", () => {
    const file = join(ROOT, "to-publish-2.json");
    writeFileSync(file, catalogText(CATALOG));
    expect(run(file, KEY.key).err).toContain("private key has no passphrase");
    const none = run(file, join(ROOT, "no-such-key"));
    expect(none.code).toBe(1);
    expect(none.err).toContain("ssh-keygen -t ed25519 -C deck-catalog@bucket.foundation");
    const inside = join(REPO, "decks", "catalog.json");
    expect(run("--allow-unencrypted", file, inside).err).toContain("refusing a private key inside the repo");
    expect(existsSync(`${file}.sig`)).toBe(false);
    expect(existsSync(`${inside}.sig`)).toBe(DECK_CATALOG_PUBKEY !== "");
  });
});

describe("deck file", () => {
  test("export never replaces a file unless told to", async () => {
    const { lib: l, home } = lib();
    await installDeck(home, AR.dir);
    const first = await l.export("polingual-ar");
    const file = join(first.folder, first.name);
    const before = readFileSync(file);
    writeFileSync(file, "mine");
    try {
      await l.export("polingual-ar");
      throw new Error("the file was replaced");
    } catch (e) {
      expect(e).toBeInstanceOf(DeckExistsError);
    }
    expect(readFileSync(file, "utf8")).toBe("mine");
    await l.export("polingual-ar", true);
    expect(readFileSync(file).length).toBe(before.length);
    expect(readdirSync(first.folder)).toEqual([first.name]);
    const routes = libraryRoutes(l);
    const post = async (body: unknown) => {
      const url = new URL("/local/library/export", "http://127.0.0.1");
      return routes["POST /local/library/export"](new Request(url, { method: "POST", body: JSON.stringify(body) }), url);
    };
    expect((await post({ id: "polingual-ar" })).status).toBe(409);
    expect((await post({ id: "polingual-ar", replace: true })).status).toBe(200);
    const get = new URL("/local/library/export?id=polingual-ar", "http://127.0.0.1");
    const stream = await routes["GET /local/library/export"](new Request(get), get);
    expect(stream.headers.get("content-disposition")).toBe('attachment; filename="polingual-ar.bktdeck"');
    const other = lib();
    expect((await other.lib.import(new Uint8Array(await stream.arrayBuffer()))).id).toBe("polingual-ar");
    expect(readdirSync(decksDir(home)).filter((f) => f.startsWith(".")).sort()).toEqual([]);
    const missing = new URL("/local/library/export?id=nope", "http://127.0.0.1");
    expect((await routes["GET /local/library/export"](new Request(missing), missing)).status).toBe(400);
  });

  test("export writes one file that installs elsewhere with the same words and licence", async () => {
    const { lib: l, home } = lib();
    await installDeck(home, AR.dir);
    const made = await l.export("polingual-ar");
    expect(made).toEqual({ name: `polingual-ar${DECK_FILE_EXT}`, folder: join(home, "out") });
    const file = join(made.folder, made.name);
    expect(isDeckFile(file)).toBe(true);
    expect(readFileSync(file).subarray(0, DECK_FILE_MAGIC.length).toString()).toBe(DECK_FILE_MAGIC);
    const inside = readDeckFileManifest(file).manifest;
    expect([inside.id, inside.licence, inside.source, inside.db_sha256]).toEqual(["polingual-ar", FIXTURE_LICENCE, AR.manifest.source, AR.manifest.db_sha256]);
    const other = lib();
    const m = await other.lib.import(new Uint8Array(readFileSync(file)));
    expect(m.id).toBe("polingual-ar");
    expect(statSync(listInstalled(other.home)[0].db).size).toBe(AR.manifest.db_bytes);
    expect(readdirSync(decksDir(other.home)).filter((f) => f.startsWith("."))).toEqual([]);
    expect((await installAny(join(ROOT, "any"), file)).id).toBe("polingual-ar");
    expect((await installAny(join(ROOT, "any"), DE.dir)).id).toBe("polingual-de");
    expect(await refusal(() => l.export("polingual-zz"))).toBe("that deck is not installed");
  });

  test("a changed, cut or foreign file is refused on import", async () => {
    const home = join(ROOT, "h-file");
    await installDeck(home, AR.dir);
    const file = join(ROOT, "share.bktdeck");
    await exportDeck(home, "ar", file);
    const good = readFileSync(file);
    const { lib: l, home: fresh } = lib();
    const flipped = new Uint8Array(good);
    flipped[flipped.length - 5] ^= 0xff;
    expect(await refusal(() => l.import(flipped))).toContain("The file was changed");
    expect(await refusal(() => l.import(new Uint8Array(good.subarray(0, good.length - 40))))).toContain("cut short");
    expect(await refusal(() => l.import(new TextEncoder().encode("hello there, not a deck")))).toContain("is not a Bucket deck file");
    const noLicence = Buffer.from(good);
    const size = noLicence.readUInt32BE(DECK_FILE_MAGIC.length);
    const manifest = JSON.parse(noLicence.subarray(DECK_FILE_MAGIC.length + 4, DECK_FILE_MAGIC.length + 4 + size).toString()) as Record<string, unknown>;
    const body = Buffer.from(JSON.stringify({ ...manifest, licence: "" }));
    const head = Buffer.alloc(DECK_FILE_MAGIC.length + 4);
    head.write(DECK_FILE_MAGIC, "latin1");
    head.writeUInt32BE(body.length, DECK_FILE_MAGIC.length);
    expect(await refusal(() => l.import(new Uint8Array(Buffer.concat([head, body, noLicence.subarray(DECK_FILE_MAGIC.length + 4 + size)]))))).toContain("names no licence");
    expect(listInstalled(fresh)).toEqual([]);
    expect(existsSync(decksDir(fresh)) ? readdirSync(decksDir(fresh)) : []).toEqual([]);
  });
});

describe("library routes", () => {
  test("list, install, remove, export and import answer in the shapes the window reads", async () => {
    const { lib: l, home } = lib();
    const routes = libraryRoutes(l);
    const call = async (key: string, body?: unknown) => {
      const [method, path] = key.split(" ");
      const url = new URL(path, "http://127.0.0.1");
      const init = body === undefined ? { method } : { method, body: body instanceof Uint8Array ? new Blob([body as BlobPart]) : JSON.stringify(body) };
      const r = await routes[key](new Request(url, init), url);
      return { status: r.status, body: (await r.json()) as LibraryBody & { error?: string; name?: string; installed?: string } };
    };
    expect((await call("GET /local/library")).body.decks.length).toBe(2);
    served = signed(buildCatalog([DE.manifest, AR.manifest], 2));
    expect((await call("POST /local/library/refresh")).body.from).toBe("refreshed");
    served = signed(CATALOG);
    expect((await call("POST /local/library/install", {})).status).toBe(400);
    expect((await call("POST /local/library/install", { id: "nope" })).body.error).toBe(NOT_IN_CATALOG);
    expect((await call("POST /local/library/install", { id: "polingual-ar" })).body.decks[0].state).toBe("downloading");
    await l.wait("polingual-ar");
    expect((await call("GET /local/library")).body.decks[0].state).toBe("installed");
    const out = await call("POST /local/library/export", { id: "polingual-ar" });
    expect(out.body.name).toBe("polingual-ar.bktdeck");
    expect((await call("POST /local/library/remove", { id: "polingual-ar" })).body.decks[0].state).toBe("available");
    const back = await call("POST /local/library/import", new Uint8Array(readFileSync(join(home, "out", "polingual-ar.bktdeck"))));
    expect([back.status, back.body.installed, back.body.decks[0].state]).toEqual([200, "Arabic words", "installed"]);
    expect((await call("POST /local/library/import", new TextEncoder().encode("junk"))).status).toBe(400);
  });
});

describe("through the command line", () => {
  const CLI = join(import.meta.dir, "../src/cli.tsx");
  const home = join(ROOT, "h-cli");
  const env = { PATH: process.env.PATH ?? "", HOME: join(ROOT, "user"), BKT_HOME: home, XDG_RUNTIME_DIR: join(ROOT, "run"), TMPDIR: ROOT, NO_COLOR: "1", BKT_OFFLINE: "1" };
  const bkt = (...args: string[]) => {
    const r = Bun.spawnSync([process.execPath, CLI, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
  };

  test("list --catalog names the curated decks; export and install carry one deck file between folders", () => {
    const listed = bkt("decks", "list", "--catalog");
    if (DECK_CATALOG_PUBKEY) expect(listed.out).toContain("available  polingual-es");
    else {
      expect([listed.code, listed.out]).toEqual([3, ""]);
      expect(listed.err).toContain("is not signed yet, so Bucket shows none of it");
    }
    expect(bkt("decks", "install", AR.dir).code).toBe(0);
    const file = join(ROOT, "cli-share.bktdeck");
    const out = bkt("decks", "export", "Arabic", file);
    expect([out.code, out.err]).toEqual([0, ""]);
    expect(out.out.trim()).toBe(`Wrote Arabic words to ${file}. Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.`);
    const again = bkt("decks", "export", "Arabic", file);
    expect(again.code).toBe(1);
    expect(again.err).toContain("already exists; Bucket did not replace it");
    expect(bkt("decks", "export", "Arabic", file, "--replace").code).toBe(0);
    expect(bkt("decks", "remove", "ar").code).toBe(0);
    const back = bkt("words", "install", file);
    expect(back.code).toBe(0);
    expect(back.out).toContain("Installed Arabic words");
    expect(bkt("decks", "export", "klingon", file).err).toContain("no installed deck matches klingon");
  }, 120_000);
});

describe("commands", () => {
  test("decks export takes a deck and a file", () => {
    const run = resolve(["decks", "export", "de", "/tmp/de.bktdeck"]);
    expect(run.kind === "run" && [run.command.name, run.positionals]).toEqual(["decks export", ["de", "/tmp/de.bktdeck"]]);
    expect(() => resolve(["decks", "export", "de"])).toThrow("decks export needs <deck> <file>");
    const listed = resolve(["decks", "list", "--catalog"]);
    expect(listed.kind === "run" && listed.values.catalog).toBe(true);
    mkdirSync(join(ROOT, "x"), { recursive: true });
    writeFileSync(join(ROOT, "x", "plain.txt"), "x");
    expect(isDeckFile(join(ROOT, "x", "plain.txt"))).toBe(false);
    expect(isDeckFile(join(ROOT, "x"))).toBe(false);
  });
});
