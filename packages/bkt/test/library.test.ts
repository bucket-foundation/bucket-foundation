import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { resolve } from "../src/cli/run";
import { DECK_FILE_EXT, DECK_FILE_MAGIC, exportDeck, installAny, isDeckFile, readDeckFileManifest } from "../src/deck-file";
import { DeckError, decksDir, installDeck, listInstalled } from "../src/decks";
import { allowedCatalogUrl, buildCatalog, CATALOG_URL, checkCatalog, DOWNLOAD_CHANGED, Library, libraryRoutes, NOT_IN_CATALOG, OFFLINE_NOTE, type Catalog, type LibraryBody } from "../src/library";
import { catalogText, curatedCatalog } from "../src/pack/decks";
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
let served: Catalog = CATALOG;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      hits.push(path);
      if (path === "/decks/catalog.json") return new Response(JSON.stringify(served), { headers: { "content-type": "application/json" } });
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
function lib(o: { offline?: boolean; bundled?: Catalog; home?: string; onChange?: () => void } = {}) {
  const home = o.home ?? join(ROOT, `home-${n++}`);
  return { home, lib: new Library({ home, bundled: o.bundled ?? CATALOG, url: base, offline: () => o.offline ?? false, now: () => 1_760_000_000_000, downloads: () => join(home, "out"), onChange: o.onChange }) };
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
    expect(allowedCatalogUrl(CATALOG_URL).hostname).toBe("bucket.foundation");
    expect(allowedCatalogUrl("http://127.0.0.1:9/decks/catalog.json").port).toBe("9");
    for (const bad of ["https://example.com/decks/catalog.json", "http://bucket.foundation/decks/catalog.json", "https://bucket.foundation.evil.test/c.json", "file:///etc/passwd", "nope"]) expect(() => allowedCatalogUrl(bad)).toThrow(DeckError);
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
    served = buildCatalog([DE.manifest, AR.manifest, zh.manifest]);
    const { lib: l, home } = lib();
    const body = await l.refresh();
    expect(hits).toEqual(["/decks/catalog.json"]);
    expect([body.from, body.refreshedAt, body.decks.length]).toEqual(["refreshed", 1_760_000_000_000, 3]);
    expect(lib({ home }).lib.body().decks.map((d) => d.id)).toContain("polingual-zh");
    served = { ...CATALOG, sha256: "f".repeat(64) };
    expect(await refusal(() => l.refresh())).toContain("does not match its checksum");
    expect(l.body().decks.length).toBe(3);
    served = CATALOG;
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
    const old = buildDeck(join(ROOT, "old"), "de", "German", GERMAN.slice(0, 5));
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

describe("deck file", () => {
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
    expect((await call("POST /local/library/refresh")).body.from).toBe("refreshed");
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
    expect(listed.code).toBe(0);
    const lines = listed.out.trimEnd().split("\n");
    expect(lines.length).toBe(36);
    expect(lines.find((l) => l.includes("polingual-es"))).toContain("available  polingual-es      Spanish words, 755,090 words");
    expect(lines.at(-1)).toContain("CC-BY-SA 3.0");
    expect(bkt("decks", "install", AR.dir).code).toBe(0);
    const file = join(ROOT, "cli-share.bktdeck");
    const out = bkt("decks", "export", "Arabic", file);
    expect([out.code, out.err]).toEqual([0, ""]);
    expect(out.out.trim()).toBe(`Wrote Arabic words to ${file}. Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.`);
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
