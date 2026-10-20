import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { deckFileName, DeckExistsError, exportDeck, installDeckFile } from "./deck-file";
import { checkManifest, DECK_MANIFEST, DeckError, decksDir, installDeck, listInstalled, newerThan, removeDeck, type DeckKind, type DeckManifest } from "./decks";
import { verifySshSig } from "./sshsig";
import { isOffline, LOOPBACK, type Route } from "./serve";

export const CATALOG_FORMAT = "bkt-deck-catalog";
export const CATALOG_FORMAT_VERSION = 1;
export const CATALOG_URL = "https://www.bucket.foundation/decks/catalog.json";
export const CATALOG_HOST = "www.bucket.foundation";
export const DECK_FILE_HOST = "github.com";
export const DECK_FILE_PATH = "/bucket-foundation/bucket-foundation/releases/download/";
export const DECK_FILE_REDIRECT_HOST = "release-assets.githubusercontent.com";
export const DECK_FILE_REFUSED = `Bucket downloads a deck from ${CATALOG_HOST} or from a Bucket release on ${DECK_FILE_HOST} only`;
export const DECK_FILE_MOVED = `${DECK_FILE_HOST} sent the download to a place Bucket does not use`;
export const DECK_FILE_TIMEOUT_MS = 30 * 60_000;
export const CATALOG_BYTES = 2 * 1024 * 1024;
export const CATALOG_SIG_BYTES = 4096;
export const CATALOG_DECKS_MAX = 500;
export const CATALOG_SIG_SUFFIX = ".sig";
export const CATALOG_NAMESPACE = "bucket-deck-catalog";
export const DECK_CATALOG_PUBKEY: string = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAcu4538iYSEP96xmNL2+c0YXymi1YDii/pmooLLb/Ab";
export const UNSIGNED_BUNDLE = "The deck list in this copy of Bucket is not signed yet, so Bucket shows none of it. Adding a deck from a file still works.";
export const UNSIGNED_REFRESH = "The deck list from bucket.foundation did not carry Bucket's signature, so Bucket kept the list it had.";
export const NO_CATALOG_KEY = "This copy of Bucket holds no key to check the deck list with, so it did not ask for one.";
export const CATALOG_CACHE = ".catalog.json";
export const IMPORT_BODY_BYTES = 512 * 1024 * 1024;
export const LIBRARY_BODY_BYTES = 256;
export const OFFLINE_NOTE = "Bucket is set to stay offline on this computer, so it did not contact bucket.foundation.";
export const REFRESH_FAILED = "Bucket could not reach the deck catalog. The list below is the one that came with this copy.";
export const STALE_REFRESH = "The deck list from bucket.foundation is no newer than the one Bucket has, so Bucket kept its own.";
export const NOT_IN_CATALOG = "that deck is not in the catalog";
export const DOWNLOAD_FAILED = "The download did not finish. Try again.";
export const DOWNLOAD_CHANGED = "The downloaded file did not match the catalog, so Bucket did not install it.";

export interface SignedCatalog {
  text: string;
  signature: string;
}

export function verifyCatalog(signed: SignedCatalog, pubkey: string = DECK_CATALOG_PUBKEY): Catalog | null {
  if (!pubkey || !signed.signature || signed.text.length > CATALOG_BYTES || signed.signature.length > CATALOG_SIG_BYTES) return null;
  let ok = false;
  try {
    ok = verifySshSig(signed.text, signed.signature, pubkey, CATALOG_NAMESPACE);
  } catch {
    ok = false;
  }
  if (!ok) return null;
  try {
    return checkCatalog(JSON.parse(signed.text));
  } catch {
    return null;
  }
}

export const NO_CATALOG: Catalog = { format: "bkt-deck-catalog", format_version: 1, built: "1970-01-01", serial: 0, decks: [], sha256: "" };

export interface Catalog {
  format: string;
  format_version: number;
  built: string;
  serial: number;
  decks: DeckManifest[];
  sha256: string;
}

export type DeckState = "available" | "installed" | "update" | "downloading" | "failed";

export interface LibraryRow {
  id: string;
  title: string;
  kind: DeckKind;
  language: string | null;
  cards: number;
  downloadBytes: number;
  installedBytes: number;
  version: string;
  source: string;
  licence: string;
  licenceHref: string | null;
  curator: string;
  built: string;
  state: DeckState;
  inCatalog: boolean;
  received: number;
  error: string | null;
}

export interface LibraryBody {
  decks: LibraryRow[];
  built: string;
  refreshedAt: number | null;
  offline: boolean;
  from: "bundled" | "refreshed";
  signed: boolean;
}

export function catalogChecksum(decks: readonly DeckManifest[], built: string, serial: number): string {
  return createHash("sha256").update(JSON.stringify({ built, serial, decks })).digest("hex");
}

export function buildCatalog(manifests: readonly unknown[], serial = 1): Catalog {
  if (!Number.isSafeInteger(serial) || serial < 1) throw new DeckError("the deck catalog serial is a whole number from 1 up");
  const decks = manifests.map(checkManifest).sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(decks.map((d) => d.id));
  if (ids.size !== decks.length) throw new DeckError("two curated decks share an id");
  decks.forEach(deckFileUrl);
  const built = decks.map((d) => d.built).sort().at(-1) ?? "1970-01-01";
  return { format: CATALOG_FORMAT, format_version: CATALOG_FORMAT_VERSION, built, serial, decks, sha256: catalogChecksum(decks, built, serial) };
}

export function checkCatalog(raw: unknown): Catalog {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DeckError("the deck catalog is not a JSON object");
  const c = raw as Record<string, unknown>;
  if (c.format !== CATALOG_FORMAT || c.format_version !== CATALOG_FORMAT_VERSION) throw new DeckError("the deck catalog is in a format this Bucket does not read; run bkt update");
  if (Array.isArray(c.decks) && c.decks.length > CATALOG_DECKS_MAX) throw new DeckError(`the deck catalog lists more than ${CATALOG_DECKS_MAX} decks`);
  if (!Array.isArray(c.decks) || typeof c.built !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.built)) throw new DeckError("the deck catalog lists no decks");
  const decks = c.decks.map(checkManifest);
  if (new Set(decks.map((d) => d.id)).size !== decks.length) throw new DeckError("the deck catalog lists a deck twice");
  decks.forEach(deckFileUrl);
  if (typeof c.serial !== "number" || !Number.isSafeInteger(c.serial) || c.serial < 1) throw new DeckError("the deck catalog gives no serial");
  const sum = catalogChecksum(decks, c.built, c.serial);
  if (sum !== c.sha256) throw new DeckError("the deck catalog does not match its checksum");
  return { format: CATALOG_FORMAT, format_version: CATALOG_FORMAT_VERSION, built: c.built, serial: c.serial, decks, sha256: sum };
}

export function allowedCatalogUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DeckError("the catalog address is not a link");
  }
  const loopback = LOOPBACK.has(url.hostname) && url.protocol === "http:";
  if (!loopback && !(url.protocol === "https:" && url.hostname === CATALOG_HOST)) throw new DeckError(`Bucket reads the deck catalog from ${CATALOG_HOST} only`);
  return url;
}

export function deckFileUrl(m: Pick<DeckManifest, "file" | "file_url">): URL | null {
  if (m.file_url === null) return null;
  let url: URL;
  try {
    url = new URL(m.file_url);
  } catch {
    throw new DeckError(DECK_FILE_REFUSED);
  }
  const plain = url.protocol === "https:" && url.hostname === DECK_FILE_HOST && url.port === "" && url.username === "" && url.password === "" && url.search === "" && url.hash === "";
  if (!plain || !url.pathname.startsWith(DECK_FILE_PATH) || !url.pathname.endsWith(`/${m.file}`)) throw new DeckError(DECK_FILE_REFUSED);
  return url;
}

export function deckFileRedirect(location: string | null): URL {
  let url: URL;
  try {
    url = new URL(location ?? "");
  } catch {
    throw new DeckError(DECK_FILE_MOVED);
  }
  if (url.protocol !== "https:" || url.hostname !== DECK_FILE_REDIRECT_HOST || url.port !== "") throw new DeckError(DECK_FILE_MOVED);
  return url;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface LibraryOptions {
  home: string;
  bundled: SignedCatalog;
  pubkey?: string;
  url?: string;
  fetch?: Fetcher;
  offline?: () => boolean;
  now?: () => number;
  downloads?: () => string;
  fileTimeoutMs?: number;
  onChange?: () => void;
}

interface Job {
  received: number;
  error: string | null;
  done: Promise<void>;
}

export class Library {
  private jobs = new Map<string, Job>();
  private refreshed: { catalog: Catalog; at: number } | null = null;
  private url: URL;
  private fetcher: Fetcher;
  private offline: () => boolean;
  private now: () => number;
  private pubkey: string;
  private bundled: Catalog | null;

  constructor(private o: LibraryOptions) {
    this.pubkey = o.pubkey ?? DECK_CATALOG_PUBKEY;
    this.bundled = verifyCatalog(o.bundled, this.pubkey);
    this.url = allowedCatalogUrl(o.url ?? CATALOG_URL);
    this.fetcher = o.fetch ?? ((url, init) => globalThis.fetch(url, init));
    this.offline = o.offline ?? (() => isOffline());
    this.now = o.now ?? Date.now;
    try {
      const saved = JSON.parse(readFileSync(join(decksDir(o.home), CATALOG_CACHE), "utf8")) as { at?: unknown; text?: unknown; signature?: unknown };
      const catalog = typeof saved.text === "string" && typeof saved.signature === "string" ? verifyCatalog({ text: saved.text, signature: saved.signature }, this.pubkey) : null;
      if (catalog && typeof saved.at === "number" && catalog.serial >= (this.bundled?.serial ?? 0)) this.refreshed = { catalog, at: saved.at };
    } catch {
      this.refreshed = null;
    }
  }

  catalog(): Catalog {
    return this.refreshed?.catalog ?? this.bundled ?? NO_CATALOG;
  }

  body(): LibraryBody {
    const catalog = this.catalog();
    const installed = new Map(listInstalled(this.o.home).map((d) => [d.manifest.id, d.manifest]));
    const row = (m: DeckManifest, inCatalog: boolean): LibraryRow => {
      const have = installed.get(m.id);
      const job = this.jobs.get(m.id);
      const state: DeckState = job && !job.error ? "downloading" : job?.error ? "failed" : !have ? "available" : inCatalog && have.db_sha256 !== m.db_sha256 && have.kind === m.kind && have.language === m.language && newerThan(m, have) ? "update" : "installed";
      return {
        id: m.id,
        title: m.title,
        kind: m.kind,
        language: m.language,
        cards: m.counts.cards,
        downloadBytes: m.bytes,
        installedBytes: m.db_bytes,
        version: m.version,
        source: m.source,
        licence: m.licence,
        licenceHref: m.licence_url,
        curator: m.curator,
        built: m.built,
        state,
        inCatalog,
        received: job?.received ?? 0,
        error: job?.error ?? null,
      };
    };
    const listed = new Set(catalog.decks.map((d) => d.id));
    const own = Array.from(installed.values()).filter((m) => !listed.has(m.id));
    return { decks: [...catalog.decks.map((m) => row(m, true)), ...own.map((m) => row(m, false))], built: catalog.built, refreshedAt: this.refreshed?.at ?? null, offline: this.offline(), from: this.refreshed ? "refreshed" : "bundled", signed: this.refreshed !== null || this.bundled !== null };
  }

  private async get(url: URL, ms = 30_000): Promise<Response> {
    if (this.offline()) throw new DeckError(OFFLINE_NOTE);
    const r = await this.fetcher(url.href, { redirect: "error", signal: AbortSignal.timeout(ms) });
    if (!r.ok) throw new DeckError(`${url.hostname} answered ${r.status}`);
    return r;
  }

  private async deckFile(m: DeckManifest): Promise<Response> {
    const released = deckFileUrl(m);
    const ms = this.o.fileTimeoutMs ?? DECK_FILE_TIMEOUT_MS;
    if (!released) return this.get(new URL(`${m.id}/${m.file}`, this.url), ms);
    if (this.offline()) throw new DeckError(OFFLINE_NOTE);
    const r = await this.fetcher(released.href, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    if (r.status !== 302) throw new DeckError(r.ok ? DECK_FILE_MOVED : `${released.hostname} answered ${r.status}`);
    return this.get(deckFileRedirect(r.headers.get("location")), ms);
  }

  private async read(url: URL, cap: number, what: string): Promise<string> {
    const r = await this.get(url);
    if (Number(r.headers.get("content-length") ?? "0") > cap) throw new DeckError(`${what} is too large`);
    if (!r.body) return "";
    const parts: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > cap) throw new DeckError(`${what} is too large`);
      parts.push(chunk);
    }
    return Buffer.concat(parts).toString("utf8");
  }

  async refresh(): Promise<LibraryBody> {
    if (this.offline()) throw new DeckError(OFFLINE_NOTE);
    if (!this.pubkey) throw new DeckError(NO_CATALOG_KEY);
    const text = await this.read(this.url, CATALOG_BYTES, "the deck catalog");
    const sigUrl = new URL(this.url.href);
    sigUrl.pathname += CATALOG_SIG_SUFFIX;
    const signature = await this.read(sigUrl, CATALOG_SIG_BYTES, "the deck catalog signature");
    const catalog = verifyCatalog({ text, signature }, this.pubkey);
    if (!catalog) throw new DeckError(UNSIGNED_REFRESH);
    const held = this.refreshed?.catalog ?? this.bundled;
    if (held && catalog.serial === held.serial && catalog.sha256 === held.sha256) return this.body();
    if (held && catalog.serial <= held.serial) throw new DeckError(STALE_REFRESH);
    this.refreshed = { catalog, at: this.now() };
    mkdirSync(decksDir(this.o.home), { recursive: true, mode: 0o700 });
    writeFileSync(join(decksDir(this.o.home), CATALOG_CACHE), JSON.stringify({ at: this.refreshed.at, text, signature }), { mode: 0o600 });
    return this.body();
  }

  start(id: string): LibraryBody {
    const m = this.catalog().decks.find((d) => d.id === id);
    if (!m) throw new DeckError(NOT_IN_CATALOG);
    if (this.offline()) throw new DeckError(OFFLINE_NOTE);
    const running = this.jobs.get(id);
    if (running && !running.error) return this.body();
    const job: Job = { received: 0, error: null, done: Promise.resolve() };
    job.done = this.download(m, job).then(
      () => {
        this.jobs.delete(id);
        this.o.onChange?.();
      },
      (e: unknown) => {
        job.error = e instanceof DeckError ? e.message : DOWNLOAD_FAILED;
      },
    );
    this.jobs.set(id, job);
    return this.body();
  }

  wait(id: string): Promise<void> {
    return this.jobs.get(id)?.done ?? Promise.resolve();
  }

  private async download(m: DeckManifest, job: Job): Promise<void> {
    const tmp = join(decksDir(this.o.home), `.${m.id}.download`);
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true, mode: 0o700 });
    try {
      const r = await this.deckFile(m);
      if (!r.body) throw new DeckError(DOWNLOAD_FAILED);
      const out = createWriteStream(join(tmp, m.file), { mode: 0o600 });
      try {
        for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
          job.received += chunk.length;
          if (job.received > m.bytes) throw new DeckError(DOWNLOAD_CHANGED);
          if (!out.write(chunk)) await new Promise<void>((go) => out.once("drain", () => go()));
        }
      } finally {
        await new Promise<void>((go) => out.end(() => go()));
      }
      writeFileSync(join(tmp, DECK_MANIFEST), JSON.stringify(m));
      try {
        await installDeck(this.o.home, tmp);
      } catch (e) {
        throw e instanceof DeckError ? new DeckError(/newer one|cannot take that name/.test(e.message) ? e.message : DOWNLOAD_CHANGED) : e;
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  forget(id: string): void {
    if (this.jobs.get(id)?.error) this.jobs.delete(id);
  }

  remove(id: string): LibraryBody {
    if (!removeDeck(this.o.home, id)) throw new DeckError("that deck is not installed");
    this.o.onChange?.();
    return this.body();
  }

  async export(id: string, replace = false): Promise<{ name: string; folder: string }> {
    const folder = (this.o.downloads ?? defaultDownloads)();
    const found = listInstalled(this.o.home).find((d) => d.manifest.id === id);
    if (!found) throw new DeckError("that deck is not installed");
    const name = deckFileName(found.manifest);
    await exportDeck(this.o.home, id, join(folder, name), { replace });
    return { name, folder };
  }

  async exportBytes(id: string): Promise<{ name: string; path: string; done: () => void }> {
    const found = listInstalled(this.o.home).find((d) => d.manifest.id === id);
    if (!found) throw new DeckError("that deck is not installed");
    const path = join(decksDir(this.o.home), `.export.${process.pid}.${this.now()}.${id}`);
    await exportDeck(this.o.home, id, path, { replace: true });
    return { name: deckFileName(found.manifest), path, done: () => rmSync(path, { force: true }) };
  }

  async import(bytes: Uint8Array): Promise<DeckManifest> {
    mkdirSync(decksDir(this.o.home), { recursive: true, mode: 0o700 });
    const tmp = join(decksDir(this.o.home), `.upload.${process.pid}.${this.now()}`);
    const part = `${tmp}.part`;
    try {
      writeFileSync(part, bytes, { mode: 0o600 });
      renameSync(part, tmp);
      const m = await installDeckFile(this.o.home, tmp);
      this.o.onChange?.();
      return m;
    } finally {
      rmSync(part, { force: true });
      rmSync(tmp, { force: true });
    }
  }
}

export function defaultDownloads(): string {
  const dir = join(homedir(), "Downloads");
  return existsSync(dir) ? dir : homedir();
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function bodyOf(req: Request): Promise<{ id: string; replace: boolean } | null> {
  try {
    const b = JSON.parse((await req.text()).slice(0, LIBRARY_BODY_BYTES)) as { id?: unknown; replace?: unknown };
    return typeof b.id === "string" ? { id: b.id, replace: b.replace === true } : null;
  } catch {
    return null;
  }
}

async function guarded(run: () => unknown | Promise<unknown>, onError?: (m: string) => void): Promise<Response> {
  try {
    return json(await run());
  } catch (e) {
    if (e instanceof DeckExistsError) return json({ error: "exists" }, 409);
    if (e instanceof DeckError) return json({ error: e.message }, 400);
    onError?.((e as Error).message);
    return json({ error: REFRESH_FAILED }, 502);
  }
}

export function libraryRoutes(lib: Library, onError?: (m: string) => void): Record<string, Route> {
  const withId = (run: (id: string, replace: boolean) => unknown | Promise<unknown>): Route => async (req) => {
    const b = await bodyOf(req);
    if (!b) return json({ error: "id required" }, 400);
    return guarded(() => run(b.id, b.replace), onError);
  };
  return {
    "GET /local/library": () => json(lib.body()),
    "POST /local/library/refresh": () => guarded(() => lib.refresh(), onError),
    "POST /local/library/install": withId((id) => (lib.forget(id), lib.start(id))),
    "POST /local/library/remove": withId((id) => lib.remove(id)),
    "POST /local/library/export": withId((id, replace) => lib.export(id, replace)),
    "GET /local/library/export": async (_req, url) => {
      try {
        const made = await lib.exportBytes(url.searchParams.get("id") ?? "");
        const bytes = await Bun.file(made.path).arrayBuffer();
        made.done();
        return new Response(bytes, { headers: { "content-type": "application/octet-stream", "content-disposition": `attachment; filename="${made.name}"`, "cache-control": "no-store" } });
      } catch (e) {
        if (e instanceof DeckError) return json({ error: e.message }, 400);
        throw e;
      }
    },
    "POST /local/library/import": async (req) =>
      guarded(async () => {
        const m = await lib.import(new Uint8Array(await req.arrayBuffer()));
        return { installed: m.title, ...lib.body() };
      }, onError),
  };
}
