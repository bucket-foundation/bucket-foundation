import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { deckFileName, exportDeck, installDeckFile } from "./deck-file";
import { checkManifest, DECK_MANIFEST, DeckError, decksDir, installDeck, listInstalled, removeDeck, type DeckKind, type DeckManifest } from "./decks";
import { isOffline, LOOPBACK, type Route } from "./serve";

export const CATALOG_FORMAT = "bkt-deck-catalog";
export const CATALOG_FORMAT_VERSION = 1;
export const CATALOG_URL = "https://bucket.foundation/decks/catalog.json";
export const CATALOG_HOST = "bucket.foundation";
export const CATALOG_BYTES = 2 * 1024 * 1024;
export const CATALOG_CACHE = ".catalog.json";
export const IMPORT_BODY_BYTES = 512 * 1024 * 1024;
export const LIBRARY_BODY_BYTES = 256;
export const OFFLINE_NOTE = "Bucket is set to stay offline on this computer, so it did not contact bucket.foundation.";
export const REFRESH_FAILED = "Bucket could not reach the deck catalog. The list below is the one that came with this copy.";
export const NOT_IN_CATALOG = "that deck is not in the catalog";
export const DOWNLOAD_FAILED = "The download did not finish. Try again.";
export const DOWNLOAD_CHANGED = "The downloaded file did not match the catalog, so Bucket did not install it.";

export interface Catalog {
  format: string;
  format_version: number;
  built: string;
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
}

export function catalogChecksum(decks: readonly DeckManifest[], built: string): string {
  return createHash("sha256").update(JSON.stringify({ built, decks })).digest("hex");
}

export function buildCatalog(manifests: readonly unknown[]): Catalog {
  const decks = manifests.map(checkManifest).sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(decks.map((d) => d.id));
  if (ids.size !== decks.length) throw new DeckError("two curated decks share an id");
  const built = decks.map((d) => d.built).sort().at(-1) ?? "1970-01-01";
  return { format: CATALOG_FORMAT, format_version: CATALOG_FORMAT_VERSION, built, decks, sha256: catalogChecksum(decks, built) };
}

export function checkCatalog(raw: unknown): Catalog {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DeckError("the deck catalog is not a JSON object");
  const c = raw as Record<string, unknown>;
  if (c.format !== CATALOG_FORMAT || c.format_version !== CATALOG_FORMAT_VERSION) throw new DeckError("the deck catalog is in a format this Bucket does not read; run bkt update");
  if (!Array.isArray(c.decks) || typeof c.built !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.built)) throw new DeckError("the deck catalog lists no decks");
  const decks = c.decks.map(checkManifest);
  if (new Set(decks.map((d) => d.id)).size !== decks.length) throw new DeckError("the deck catalog lists a deck twice");
  const sum = catalogChecksum(decks, c.built);
  if (sum !== c.sha256) throw new DeckError("the deck catalog does not match its checksum");
  return { format: CATALOG_FORMAT, format_version: CATALOG_FORMAT_VERSION, built: c.built, decks, sha256: sum };
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

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface LibraryOptions {
  home: string;
  bundled: Catalog;
  url?: string;
  fetch?: Fetcher;
  offline?: () => boolean;
  now?: () => number;
  downloads?: () => string;
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

  constructor(private o: LibraryOptions) {
    this.url = allowedCatalogUrl(o.url ?? CATALOG_URL);
    this.fetcher = o.fetch ?? ((url, init) => globalThis.fetch(url, init));
    this.offline = o.offline ?? (() => isOffline());
    this.now = o.now ?? Date.now;
    try {
      const saved = JSON.parse(readFileSync(join(decksDir(o.home), CATALOG_CACHE), "utf8")) as { at?: unknown; catalog?: unknown };
      const catalog = checkCatalog(saved.catalog);
      if (typeof saved.at === "number" && catalog.built >= o.bundled.built) this.refreshed = { catalog, at: saved.at };
    } catch {
      this.refreshed = null;
    }
  }

  catalog(): Catalog {
    return this.refreshed?.catalog ?? this.o.bundled;
  }

  body(): LibraryBody {
    const catalog = this.catalog();
    const installed = new Map(listInstalled(this.o.home).map((d) => [d.manifest.id, d.manifest]));
    const row = (m: DeckManifest, inCatalog: boolean): LibraryRow => {
      const have = installed.get(m.id);
      const job = this.jobs.get(m.id);
      const state: DeckState = job && !job.error ? "downloading" : job?.error ? "failed" : !have ? "available" : inCatalog && have.version !== m.version ? "update" : "installed";
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
    return { decks: [...catalog.decks.map((m) => row(m, true)), ...own.map((m) => row(m, false))], built: catalog.built, refreshedAt: this.refreshed?.at ?? null, offline: this.offline(), from: this.refreshed ? "refreshed" : "bundled" };
  }

  private async get(url: URL): Promise<Response> {
    if (this.offline()) throw new DeckError(OFFLINE_NOTE);
    const r = await this.fetcher(url.href, { redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!r.ok) throw new DeckError(`${url.hostname} answered ${r.status}`);
    return r;
  }

  async refresh(): Promise<LibraryBody> {
    const r = await this.get(this.url);
    const text = await r.text();
    if (text.length > CATALOG_BYTES) throw new DeckError("the deck catalog is too large");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new DeckError("the deck catalog did not read as JSON");
    }
    const catalog = checkCatalog(raw);
    this.refreshed = { catalog, at: this.now() };
    mkdirSync(decksDir(this.o.home), { recursive: true, mode: 0o700 });
    writeFileSync(join(decksDir(this.o.home), CATALOG_CACHE), JSON.stringify({ at: this.refreshed.at, catalog }), { mode: 0o600 });
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
      const r = await this.get(new URL(`${m.id}/${m.file}`, this.url));
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
        throw e instanceof DeckError ? new DeckError(DOWNLOAD_CHANGED) : e;
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

  async export(id: string): Promise<{ name: string; folder: string }> {
    const folder = (this.o.downloads ?? defaultDownloads)();
    const found = listInstalled(this.o.home).find((d) => d.manifest.id === id);
    if (!found) throw new DeckError("that deck is not installed");
    const name = deckFileName(found.manifest);
    await exportDeck(this.o.home, id, join(folder, name));
    return { name, folder };
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

async function idOf(req: Request): Promise<string | null> {
  try {
    const b = JSON.parse((await req.text()).slice(0, LIBRARY_BODY_BYTES)) as { id?: unknown };
    return typeof b.id === "string" ? b.id : null;
  } catch {
    return null;
  }
}

async function guarded(run: () => unknown | Promise<unknown>, onError?: (m: string) => void): Promise<Response> {
  try {
    return json(await run());
  } catch (e) {
    if (e instanceof DeckError) return json({ error: e.message }, 400);
    onError?.((e as Error).message);
    return json({ error: REFRESH_FAILED }, 502);
  }
}

export function libraryRoutes(lib: Library, onError?: (m: string) => void): Record<string, Route> {
  const withId = (run: (id: string) => unknown | Promise<unknown>): Route => async (req) => {
    const id = await idOf(req);
    if (!id) return json({ error: "id required" }, 400);
    return guarded(() => run(id), onError);
  };
  return {
    "GET /local/library": () => json(lib.body()),
    "POST /local/library/refresh": () => guarded(() => lib.refresh(), onError),
    "POST /local/library/install": withId((id) => (lib.forget(id), lib.start(id))),
    "POST /local/library/remove": withId((id) => lib.remove(id)),
    "POST /local/library/export": withId((id) => lib.export(id)),
    "POST /local/library/import": async (req) =>
      guarded(async () => {
        const m = await lib.import(new Uint8Array(await req.arrayBuffer()));
        return { installed: m.title, ...lib.body() };
      }, onError),
  };
}
