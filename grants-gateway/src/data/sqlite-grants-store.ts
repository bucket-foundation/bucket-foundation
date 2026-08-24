/**
 * SqliteGrantsStore, production-shape backing for the GrantsStore
 * interface. Reads from data/grants.db produced by `scripts/ingest.py`.
 *
 * Schema is owned by ingest/db.py; this module only reads + projects
 * rows back to the Grant interface in ../types.ts. Keep them aligned.
 *
 * Activate via:  GRANTS_STORE=sqlite npm run dev
 * Default is `memory` so existing tests/CI still pass without a DB file.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database, { type Database as DbT } from "better-sqlite3";
import type { Grant, GrantQuery } from "../types.js";
import type { GrantsStore } from "./grants-store.js";

interface Row {
  id: string;
  title: string;
  funder: string;
  source: string;
  summary: string;
  eligibility: string;
  topics_json: string;
  amount_max_usd: number | null;
  amount_min_usd: number | null;
  deadline: string | null;
  rolling: number;
  canonical_url: string;
  last_seen_at: string;
}

function rowToGrant(r: Row): Grant {
  let topics: string[] = [];
  try { topics = JSON.parse(r.topics_json) as string[]; } catch { topics = []; }
  return {
    id: r.id,
    title: r.title,
    funder: r.funder,
    source: r.source,
    summary: r.summary,
    eligibility: r.eligibility,
    topics,
    amount_max_usd: r.amount_max_usd,
    amount_min_usd: r.amount_min_usd,
    deadline: r.deadline,
    rolling: !!r.rolling,
    canonical_url: r.canonical_url,
    last_seen_at: r.last_seen_at,
  };
}

export interface SqliteGrantsStoreOpts {
  /** Path to grants.db. Defaults to <repo>/data/grants.db. */
  path?: string;
  /** Hard cap on rows returned by all(), protects /insight from OOM. */
  insightCap?: number;
}

export class SqliteGrantsStore implements GrantsStore {
  private readonly db: DbT;
  private readonly insightCap: number;

  // Cached prepared statements
  private readonly stmtById;
  private readonly stmtAll;
  private readonly stmtCount;

  constructor(opts: SqliteGrantsStoreOpts = {}) {
    const dbPath = opts.path ?? resolve(process.cwd(), "data", "grants.db");
    if (!existsSync(dbPath)) {
      throw new Error(
        `[SqliteGrantsStore] no DB at ${dbPath}. Run: python3 scripts/ingest.py`,
      );
    }
    this.db = new Database(dbPath, { readonly: true, fileMustExist: true });
    this.db.pragma("journal_mode = WAL");
    this.insightCap = opts.insightCap ?? Number(process.env.GRANTS_INSIGHT_CAP ?? 5_000);

    this.stmtById = this.db.prepare<[string]>("SELECT * FROM grants WHERE id = ?");
    this.stmtAll = this.db.prepare<[number]>(
      "SELECT * FROM grants ORDER BY (amount_max_usd IS NULL), amount_max_usd DESC LIMIT ?",
    );
    this.stmtCount = this.db.prepare("SELECT COUNT(*) as n FROM grants");
  }

  async getById(id: string): Promise<Grant | null> {
    const row = this.stmtById.get(id) as Row | undefined;
    return row ? rowToGrant(row) : null;
  }

  async all(): Promise<Grant[]> {
    const rows = this.stmtAll.all(this.insightCap) as Row[];
    return rows.map(rowToGrant);
  }

  async search(q: GrantQuery): Promise<Grant[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    // FTS5 path when topic is a non-trivial keyword
    let useFts = false;
    if (q.topic && q.topic.trim().length >= 2) {
      useFts = true;
    }

    if (q.funder) {
      where.push("LOWER(funder) LIKE ?");
      params.push(`%${q.funder.toLowerCase()}%`);
    }
    if (q.eligibility) {
      where.push("LOWER(eligibility) LIKE ?");
      params.push(`%${q.eligibility.toLowerCase()}%`);
    }
    if (q.min_amount != null) {
      where.push("(amount_max_usd IS NOT NULL AND amount_max_usd >= ?)");
      params.push(q.min_amount);
    }
    if (q.max_amount != null) {
      where.push("(amount_min_usd IS NULL OR amount_min_usd <= ?)");
      params.push(q.max_amount);
    }
    if (q.deadline_before) {
      where.push("(rolling = 1 OR (deadline IS NOT NULL AND deadline <= ?))");
      params.push(q.deadline_before);
    }

    const limit = Math.max(1, Math.min(q.limit ?? 50, 500));

    let sql: string;
    if (useFts) {
      // Sanitize: FTS5 chokes on punctuation. Fall back to simple AND-of-prefix tokens.
      const tokens = (q.topic as string)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 6)
        .map((t) => `${t}*`);
      const matchExpr = tokens.length ? tokens.join(" ") : "*";
      sql =
        "SELECT g.* FROM grants_fts f JOIN grants g ON g.id = f.id " +
        "WHERE grants_fts MATCH ?" +
        (where.length ? " AND " + where.join(" AND ") : "") +
        " ORDER BY rank LIMIT ?";
      const rows = this.db.prepare(sql).all(matchExpr, ...params, limit) as Row[];
      return rows.map(rowToGrant);
    }

    sql =
      "SELECT * FROM grants" +
      (where.length ? " WHERE " + where.join(" AND ") : "") +
      " ORDER BY (amount_max_usd IS NULL), amount_max_usd DESC LIMIT ?";
    const rows = this.db.prepare(sql).all(...params, limit) as Row[];
    return rows.map(rowToGrant);
  }

  async corpusHash(): Promise<string> {
    // Stable SHA-256 over (id, last_seen_at) sorted by id. Fast for ~150k rows.
    const rows = this.db
      .prepare("SELECT id, last_seen_at FROM grants ORDER BY id")
      .all() as Array<{ id: string; last_seen_at: string }>;
    const h = createHash("sha256");
    for (const r of rows) {
      h.update(r.id);
      h.update("\t");
      h.update(r.last_seen_at);
      h.update("\n");
    }
    return h.digest("hex");
  }

  count(): number {
    const r = this.stmtCount.get() as { n: number };
    return r.n;
  }
}
