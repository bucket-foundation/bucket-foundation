import type { Database } from "bun:sqlite";
import { spawn } from "node:child_process";
import { parseCanonSearchParams, rankCanon, type ClaimIndexEntry } from "../../../src/lib/canon-rank";
import type { CanonPack, Licence, PackPassage, PackSource } from "./pack/canon";
import type { Route } from "./serve";

export const CANON_META_KEY = "canon_pack_version";
export const CANON_DEFAULT_TOP_K = 20;
export const OPEN_BODY_BYTES = 4096;
export const OPEN_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "www.gutenberg.org",
  "openalex.org",
  "archive.org",
  "en.wikisource.org",
  "en.wikipedia.org",
  "whc.unesco.org",
  "doi.org",
  "creativecommons.org",
  "bucket.foundation",
  "www.bucket.foundation",
];

const NO_VEC = new Float32Array(0);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const meta = (db: Database) => db.query<{ v: string }, [string]>("select v from meta where k = ?").get(CANON_META_KEY)?.v ?? null;

export function syncCanon(db: Database, pack: CanonPack): boolean {
  if (meta(db) === pack.version) return false;
  db.transaction(() => {
    db.run(`drop table if exists canon_fts; drop table if exists canon_evidence; drop table if exists canon_excerpts; drop table if exists canon_licences;
      create table canon_excerpts (id integer primary key, branch text not null, concept text not null, slug text not null, title text not null,
        text text not null, path text not null, source text not null);
      create table canon_evidence (excerpt integer not null references canon_excerpts(id), n integer not null, score real not null, kind text not null,
        source_path text not null, text text not null, url text, primary key (excerpt, n));
      create table canon_licences (n integer primary key, kind text not null, name text not null, terms text not null, url text);
      create virtual table canon_fts using fts5(title, text, tokenize = 'unicode61');`);
    const ex = db.query("insert into canon_excerpts (id, branch, concept, slug, title, text, path, source) values (?, ?, ?, ?, ?, ?, ?, ?)");
    const fts = db.query("insert into canon_fts (rowid, title, text) values (?, ?, ?)");
    const ev = db.query("insert into canon_evidence (excerpt, n, score, kind, source_path, text, url) values (?, ?, ?, ?, ?, ?, ?)");
    for (const e of pack.excerpts) {
      ex.run(e.rowid, e.branch, e.concept, e.slug, e.title, e.text, e.path, JSON.stringify(e.source));
      fts.run(e.rowid, e.title, e.text);
      (pack.evidence[String(e.rowid)] ?? []).forEach((p, n) => ev.run(e.rowid, n, p.score, p.kind, p.source_path, p.text, p.url));
    }
    const lic = db.query("insert into canon_licences (n, kind, name, terms, url) values (?, ?, ?, ?, ?)");
    pack.licences.forEach((l, n) => lic.run(n, l.kind, l.name, l.terms, l.url));
    db.query("insert into meta (k, v) values (?, ?) on conflict (k) do update set v = excluded.v").run(CANON_META_KEY, pack.version);
  })();
  return true;
}

type ExcerptRow = { id: number; branch: string; concept: string; slug: string; title: string; text: string; path: string; source: string };

export class CanonStore {
  private cached: ClaimIndexEntry[] | null = null;

  constructor(private db: Database) {}

  version(): string | null {
    return meta(this.db);
  }

  index(): ClaimIndexEntry[] {
    if (!this.cached) {
      if (!this.version()) return [];
      this.cached = this.db
        .query<ExcerptRow, []>("select id, branch, concept, slug, title, text, path, source from canon_excerpts order by id")
        .all()
        .map((r) => ({ rowid: r.id, branch: r.branch, concept: r.concept, slug: r.slug, title: r.title, text: r.text, path: r.path, vec: NO_VEC }));
    }
    return this.cached;
  }

  evidenceCount(id: number): number {
    return this.db.query<{ n: number }, [number]>("select count(*) as n from canon_evidence where excerpt = ?").get(id)!.n;
  }

  excerpt(id: number): (Omit<ExcerptRow, "source"> & { source: PackSource; evidence: PackPassage[] }) | null {
    if (!this.version() || !Number.isInteger(id)) return null;
    const r = this.db.query<ExcerptRow, [number]>("select id, branch, concept, slug, title, text, path, source from canon_excerpts where id = ?").get(id);
    if (!r) return null;
    const evidence = this.db.query<PackPassage, [number]>("select score, kind, source_path, text, url from canon_evidence where excerpt = ? order by n").all(r.id);
    return { ...r, source: JSON.parse(r.source) as PackSource, evidence };
  }

  licences(): Licence[] {
    if (!this.version()) return [];
    return this.db.query<Licence, []>("select kind, name, terms, url from canon_licences order by n").all();
  }

  branches(): string[] {
    if (!this.version()) return [];
    return this.db.query<{ branch: string }, []>("select distinct branch from canon_excerpts order by branch").all().map((r) => r.branch);
  }

  matches(query: string): number[] {
    const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    if (!terms.length || !this.version()) return [];
    return this.db
      .query<{ rowid: number }, [string]>("select rowid from canon_fts where canon_fts match ? order by rowid")
      .all(terms.map((t) => `"${t}"`).join(" OR "))
      .map((r) => r.rowid);
  }
}

export function openable(raw: unknown, hosts: readonly string[] = OPEN_HOSTS): URL | null {
  if (typeof raw !== "string" || raw.length > 2048 || /[\s\\]/.test(raw)) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password || raw.slice(raw.indexOf("//") + 2).split(/[/?#]/)[0].includes("@")) return null;
  if (u.port || !hosts.includes(u.hostname)) return null;
  return u;
}

export function browserCommand(url: string, os: NodeJS.Platform = process.platform): string[] {
  if (os === "darwin") return ["open", url];
  if (os === "win32") return ["rundll32", "url.dll,FileProtocolHandler", url];
  return ["xdg-open", url];
}

export function openInBrowser(url: string): void {
  const [cmd, ...args] = browserCommand(url);
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.on("error", (e) => console.error(`could not open ${url}: ${e.message}`));
  child.unref();
}

export interface CanonRouteOptions {
  open?: (url: string) => void;
  hosts?: readonly string[];
}

export function canonRoutes(canon: CanonStore, opts: CanonRouteOptions = {}): Record<string, Route> {
  const open = opts.open ?? openInBrowser;
  return {
    "GET /local/canon/search": (_req, url) => {
      const params = parseCanonSearchParams(url, CANON_DEFAULT_TOP_K);
      const found = rankCanon({ loadIndex: () => canon.index(), decodeQVec: () => null }, { ...params, qvec: null });
      if (!found.ok) return json({ error: found.message, code: found.code }, found.status);
      const results = found.results.map((r) => ({
        claim_id: r.entry.rowid,
        branch: r.entry.branch,
        concept: r.entry.concept,
        slug: r.entry.slug,
        title: r.entry.title,
        score: r.score,
        excerpt: r.entry.text.slice(0, 400),
        evidence_count: canon.evidenceCount(r.entry.rowid),
      }));
      return json({ query: params.q, top_k: params.topK, mode: found.mode, n_results: results.length, results });
    },
    "GET /local/canon/excerpt": (_req, url) => {
      const raw = url.searchParams.get("id") ?? "";
      const found = /^\d{1,9}$/.test(raw) ? canon.excerpt(Number(raw)) : null;
      return found ? json(found) : json({ error: "no such excerpt" }, 404);
    },
    "GET /local/canon/licences": () => json({ version: canon.version(), excerpts: canon.index().length, branches: canon.branches(), licences: canon.licences() }),
    "POST /local/open": async (req) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return json({ error: "expected { url }" }, 400);
      }
      const u = openable((body as { url?: unknown } | null)?.url, opts.hosts ?? OPEN_HOSTS);
      if (!u) return json({ error: "that link is outside the allowed sites" }, 400);
      open(u.toString());
      return json({ opened: u.toString() });
    },
  };
}
