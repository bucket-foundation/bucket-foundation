import { SQL } from "bun";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGE_NAMES, languageDir, textDir, type Dir } from "../../../src/lib/research-os/work-quiz/languages";
import { scriptOf, type Script } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { deckIpa } from "./core/word-decks";
import { POS_NAMES, type WordCredit } from "./core/words";
import { open, seal } from "./crypto";
import { LOOPBACK, type Route } from "./serve";

export const LINK_FILE = "polingual-link.sealed";
export const LINK_AAD = "polingual_link";
export const LINK_TABLE = "photons_full";
export const STATEMENT_TIMEOUT_MS = 5000;
export const LINK_BODY_BYTES = 2048;
export const NEIGHBOURS = 12;
export const EF_SEARCH = 200;
export const NEIGHBOURS_MAX = 40;
export const EMBED_TIMEOUT_MS = 90_000;
export const EMBED_MODEL = "sentence-transformers/LaBSE";
export const VECTOR_DIMS = 768;
export const LOOPBACK_ONLY = "Bucket links only to a database on this computer. Use an address that starts with postgres://, on 127.0.0.1 or localhost.";
export const NOT_LINKED = "no word database is linked";
export const UNREACHABLE = "The word database did not answer. Check that it is running.";
export const EMBED_WORKING = "working";
export const EMBED_KEPT = 16;
export const EMBED_QUEUE = 4;
export const EMBED_BUSY = "The word database is busy with earlier searches. Try again in a moment.";
export const NO_SEED = "That word is not in the word database. Try one word, as it is spelled.";
export const BAD_MODE = "mode is meaning or sound";

export type LinkMode = "meaning" | "sound";

export class LinkError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function checkLinkUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 1024) throw new LinkError(LOOPBACK_ONLY);
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new LinkError(LOOPBACK_ONLY);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new LinkError(LOOPBACK_ONLY);
  const host = url.hostname.toLowerCase();
  if (!LOOPBACK.has(host)) throw new LinkError(LOOPBACK_ONLY);
  if (url.search || url.hash) throw new LinkError("Leave options off the address; Bucket sets its own.");
  if (!url.username || url.pathname.length < 2 || !/^\/[A-Za-z0-9_.-]+$/.test(url.pathname)) throw new LinkError("The address needs a user and a database name, such as postgres://user:password@127.0.0.1:5433/polingual");
  if (url.port && !/^\d{1,5}$/.test(url.port)) throw new LinkError(LOOPBACK_ONLY);
  return `postgres://${url.username}${url.password ? `:${url.password}` : ""}@${host}${url.port ? `:${url.port}` : ""}${url.pathname}`;
}

export function linkPlace(url: string): string {
  const u = new URL(url);
  return `${u.host}${u.pathname}`;
}

export function saveLink(dir: string, key: Buffer, url: string | null): void {
  const file = join(dir, LINK_FILE);
  if (url === null) return rmSync(file, { force: true });
  writeFileSync(file, seal(key, checkLinkUrl(url), LINK_AAD), { mode: 0o600 });
}

export function loadLink(dir: string, key: Buffer): string | null {
  const file = join(dir, LINK_FILE);
  if (!existsSync(file)) return null;
  try {
    return checkLinkUrl(open(key, readFileSync(file, "utf8"), LINK_AAD));
  } catch {
    return null;
  }
}

export interface LinkRow {
  lang: string;
  surface: string;
  ipa: string | null;
  pos: string | null;
  meaning_en: string | null;
  distance: number;
}

export interface LinkSeed {
  id: string;
  lang: string;
  surface: string;
  meaning_en: string | null;
}

export interface LinkDb {
  count(): Promise<number>;
  seed(word: string, mode: LinkMode): Promise<LinkSeed | null>;
  near(mode: LinkMode, from: { id: string } | { vector: number[] }, lang: string | null, limit: number): Promise<LinkRow[]>;
  close(): Promise<void>;
}

const COLUMN: Record<LinkMode, string> = { meaning: "embedding", sound: "phonetic" };

export function pgLinkDb(url: string): LinkDb {
  const sql = new SQL({ url: checkLinkUrl(url), max: 2, idleTimeout: 30, connectionTimeout: 5, connection: { statement_timeout: String(STATEMENT_TIMEOUT_MS), default_transaction_read_only: "on", application_name: "bkt-polingual-link" } });
  return {
    async count() {
      const [r] = (await sql.unsafe(`select reltuples::bigint as n from pg_class where relname = $1`, [LINK_TABLE])) as { n: string | number }[];
      return Number(r?.n ?? 0);
    },
    async seed(word, mode) {
      const col = COLUMN[mode];
      const rows = (await sql.unsafe(`select id, lang, surface, meaning_en from ${LINK_TABLE} where lower(surface) = lower($1) and ${col} is not null order by (surface = $1) desc, (lang = 'en') desc, lang limit 1`, [word])) as LinkSeed[];
      return rows[0] ?? null;
    },
    async near(mode, from, lang, limit) {
      const col = COLUMN[mode];
      const byId = "id" in from;
      const target = byId ? `(select ${col} from ${LINK_TABLE} where id = $1)` : `$1::vector`;
      const first = byId ? from.id : `[${from.vector.join(",")}]`;
      return (await sql.begin(async (tx) => {
        await tx.unsafe("set local hnsw.iterative_scan = relaxed_order");
        await tx.unsafe(`set local hnsw.ef_search = ${EF_SEARCH}`);
        return tx.unsafe(
          `select lang, surface, ipa, pos, meaning_en, (${col} <=> ${target})::float8 as distance from ${LINK_TABLE} where ${col} is not null and ($2::text is null or lang = $2) and ($3::text is null or id <> $3) order by ${col} <=> ${target} limit $4`,
          [first, lang, byId ? from.id : null, limit],
        );
      })) as LinkRow[];
    },
    close: () => sql.close(),
  };
}

export type Embedder = (text: string) => Promise<number[] | null>;

const EMBED_SCRIPT = [
  "import json, sys",
  "from sentence_transformers import SentenceTransformer",
  `m = SentenceTransformer(${JSON.stringify(EMBED_MODEL)}, device="cpu")`,
  "v = m.encode([sys.stdin.read()], normalize_embeddings=True)[0]",
  "print(json.dumps([float(x) for x in v]))",
].join("\n");

export function pythonEmbedder(python: string, env: Record<string, string | undefined> = process.env): Embedder {
  let missing = false;
  return async (text) => {
    if (missing) return null;
    try {
      const p = Bun.spawn([python, "-c", EMBED_SCRIPT], { stdin: new TextEncoder().encode(text), stdout: "pipe", stderr: "ignore", env: { ...env, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", TOKENIZERS_PARALLELISM: "false" }, timeout: EMBED_TIMEOUT_MS });
      const out = await new Response(p.stdout).text();
      if ((await p.exited) !== 0) {
        missing = true;
        return null;
      }
      const v = JSON.parse(out.trim().split("\n").at(-1) ?? "null") as unknown;
      return Array.isArray(v) && v.length === VECTOR_DIMS && v.every((x) => typeof x === "number" && Number.isFinite(x)) ? (v as number[]) : null;
    } catch {
      missing = true;
      return null;
    }
  };
}

export interface LinkHit {
  lang: string;
  name: string;
  dir: Dir;
  script: Script;
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
  href: string;
  closeness: number;
}

export interface LinkSearch {
  query: string;
  mode: LinkMode;
  from: { lang: string; name: string; word: string; meaning: string } | null;
  hits: LinkHit[];
  credit: WordCredit;
}

export interface LinkStatus {
  freeText: boolean;
  linked: boolean;
  place: string | null;
  reachable: boolean;
  words: number | null;
}

const nameOf = (lang: string) => LANGUAGE_NAMES[lang] ?? lang;

export class PolingualLink {
  private db: LinkDb | null = null;
  private vectors = new Map<string, number[] | null | "working">();
  private waiting: string[] = [];
  private embedding = false;
  private url: string | null;

  constructor(
    private o: { dir: string; key: Buffer; credit: WordCredit; connect?: (url: string) => LinkDb; embed?: Embedder; onError?: (m: string) => void },
  ) {
    this.url = loadLink(o.dir, o.key);
  }

  private report(e: unknown): void {
    const text = e instanceof Error ? e.message : String(e);
    this.o.onError?.((this.url ? text.replaceAll(this.url, "the linked database").replaceAll(new URL(this.url).password || "\u0000", "***") : text).split("\n")[0].slice(0, 200));
  }

  private vectorFor(text: string): number[] | null | "working" {
    const held = this.vectors.get(text);
    if (held !== undefined) return held;
    if (this.waiting.length >= EMBED_QUEUE) throw new LinkError(EMBED_BUSY, 429);
    this.vectors.set(text, "working");
    for (const [k, v] of this.vectors) {
      if (this.vectors.size <= EMBED_KEPT) break;
      if (v !== "working") this.vectors.delete(k);
    }
    this.waiting.push(text);
    void this.pump();
    return "working";
  }

  private async pump(): Promise<void> {
    if (this.embedding) return;
    this.embedding = true;
    try {
      for (let text = this.waiting[0]; text !== undefined; text = this.waiting[0]) {
        let v: number[] | null = null;
        try {
          v = await this.o.embed!(text);
        } catch {
          v = null;
        }
        this.vectors.set(text, v);
        this.waiting.shift();
      }
    } finally {
      this.embedding = false;
    }
  }

  private handle(): LinkDb {
    if (!this.url) throw new LinkError(NOT_LINKED, 404);
    this.db ??= (this.o.connect ?? pgLinkDb)(this.url);
    return this.db;
  }

  private async drop(): Promise<void> {
    const db = this.db;
    this.db = null;
    await db?.close().catch(() => undefined);
  }

  async set(raw: unknown): Promise<LinkStatus> {
    const url = raw === "" || raw === null ? null : checkLinkUrl(raw);
    await this.drop();
    saveLink(this.o.dir, this.o.key, url);
    this.url = url;
    return this.status();
  }

  async status(): Promise<LinkStatus> {
    const freeText = this.o.embed !== undefined;
    if (!this.url) return { freeText, linked: false, place: null, reachable: false, words: null };
    try {
      return { freeText, linked: true, place: linkPlace(this.url), reachable: true, words: await this.handle().count() };
    } catch (e) {
      this.report(e);
      await this.drop();
      return { freeText, linked: true, place: linkPlace(this.url), reachable: false, words: null };
    }
  }

  async search(rawQuery: string, mode: LinkMode, lang: string | null, limit = NEIGHBOURS): Promise<LinkSearch> {
    const query = rawQuery.trim().slice(0, 80);
    if (!query) throw new LinkError("type a word to search for");
    const db = this.handle();
    const n = Math.min(Math.max(1, limit), NEIGHBOURS_MAX);
    let rows: LinkRow[];
    let from: LinkSearch["from"] = null;
    try {
      const seed = await db.seed(query, mode);
      if (seed) {
        from = { lang: seed.lang, name: nameOf(seed.lang), word: seed.surface, meaning: (seed.meaning_en ?? "").split(" \u00b7 ")[0] };
        rows = await db.near(mode, { id: seed.id }, lang, n);
      } else {
        const vector = mode === "meaning" && this.o.embed ? this.vectorFor(query) : null;
        if (vector === "working") throw new LinkError(EMBED_WORKING, 202);
        if (!vector) throw new LinkError(NO_SEED, 404);
        rows = await db.near("meaning", { vector }, lang, n);
      }
    } catch (e) {
      if (e instanceof LinkError) throw e;
      this.report(e);
      await this.drop();
      throw new LinkError(UNREACHABLE, 502);
    }
    const hits = rows.map((r): LinkHit => ({
      lang: r.lang,
      name: nameOf(r.lang),
      dir: LANGUAGE_NAMES[r.lang] ? languageDir(r.lang) : textDir(r.surface),
      script: scriptOf(r.surface),
      word: r.surface,
      ipa: deckIpa(r.ipa ?? ""),
      pos: POS_NAMES[r.pos ?? ""] ?? (r.pos ?? "").replace(/_/g, " "),
      meaning: r.meaning_en ?? "",
      href: `${this.o.credit.href}/wiki/${encodeURIComponent(r.surface)}`,
      closeness: Math.max(0, Math.min(1, 1 - Number(r.distance))),
    }));
    return { query, mode, from, hits, credit: this.o.credit };
  }

  close(): Promise<void> {
    return this.drop();
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function polingualLinkRoutes(link: PolingualLink): Record<string, Route> {
  const guarded = async (run: () => Promise<unknown>) => {
    try {
      return json(await run());
    } catch (e) {
      if (e instanceof LinkError) return json({ error: e.message }, e.status);
      throw e;
    }
  };
  return {
    "GET /local/polingual-link": () => guarded(() => link.status()),
    "POST /local/polingual-link": async (req) => {
      let url: unknown;
      try {
        url = (JSON.parse((await req.text()).slice(0, LINK_BODY_BYTES)) as { url?: unknown }).url;
      } catch {
        url = undefined;
      }
      if (typeof url !== "string") return json({ error: LOOPBACK_ONLY }, 400);
      return guarded(() => link.set(url));
    },
    "GET /local/polingual-link/search": (_req, url) => {
      const mode = url.searchParams.get("mode");
      if (mode !== "meaning" && mode !== "sound") return json({ error: BAD_MODE }, 400);
      const lang = url.searchParams.get("lang");
      const raw = url.searchParams.get("n");
      return guarded(() => link.search(url.searchParams.get("q") ?? "", mode, lang && /^[a-z]{2,3}$/.test(lang) ? lang : null, raw && /^\d{1,2}$/.test(raw) ? Number(raw) : NEIGHBOURS));
    },
  };
}
