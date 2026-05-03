/**
 * bkt-ibj — local feed402 server backed by the local DuckDB patent index.
 *
 * Mounts the same /patents/* routes as the public bucket.foundation deployment
 * so the chat UI can swap between local and public via FEED402_BASE_URL alone.
 *
 * BUCKET_LOCAL_MODE=true skips x402 payment verification (free locally).
 *
 * Run:
 *   bun run scripts/05-serve.ts            # listens on :8402
 *
 * Requires: bun, duckdb-node-api, hono. Install once with:
 *   bun add hono @duckdb/node-api
 */
import { Hono } from "hono";
import { DuckDBInstance } from "@duckdb/node-api";
import { mountPatents, type PatentsRepo, type PatentGrant } from "../../../../feed402/routes/patents.ts";

const PORT = Number(process.env.BUCKET_LOCAL_PORT ?? 8402);
const DB_PATH = process.env.BUCKET_LOCAL_DB ?? `${import.meta.dir}/../data/patents.duckdb`;
const LOCAL_MODE = process.env.BUCKET_LOCAL_MODE === "true";

const instance = await DuckDBInstance.create(DB_PATH, { access_mode: "READ_ONLY" });
const conn = await instance.connect();
await conn.run("LOAD fts; LOAD vss;");

/**
 * DuckDB-backed PatentsRepo. Mirrors the MockPatentsRepo shape from
 * feed402/routes/patents.ts but reads from the local DuckDB.
 */
const repo: PatentsRepo = {
  async search(filters) {
    const limit = filters.limit ?? 20;
    const params: unknown[] = [];
    let where = "1=1";
    if (filters.q) {
      params.push(filters.q);
      where += ` AND fts_main_patent_fts_doc.match_bm25(patent_id, $${params.length}) IS NOT NULL`;
    }
    if (filters.from) {
      params.push(filters.from);
      where += ` AND grant_date >= $${params.length}`;
    }
    if (filters.to) {
      params.push(filters.to);
      where += ` AND grant_date <= $${params.length}`;
    }
    const sql = `
      SELECT patent_id, patent_title, patent_abstract, grant_date
      FROM patent_fts_doc JOIN patent USING (patent_id)
      WHERE ${where}
      LIMIT ${limit};
    `;
    const reader = await conn.runAndReadAll(sql, params);
    return reader.getRowObjectsJson().map(rowToGrant);
  },
  async getById(id) {
    const reader = await conn.runAndReadAll(
      "SELECT * FROM patent WHERE patent_id = $1 LIMIT 1",
      [id],
    );
    const rows = reader.getRowObjectsJson();
    if (rows.length === 0) return null;
    return { grant: rowToGrant(rows[0]), claims: [], citations_backward: [], inventors: [], assignees: [], locations: [] };
  },
  async byCoord(_filters) {
    // TODO bkt-ibj+1: PostGIS-style geo join via lat/lng table; v1 returns []
    return [];
  },
  async family(_id) {
    // USPTO-only local index has no DOCDB family yet; v1 returns []
    return [];
  },
  async citations(_id, _direction) {
    // citation table is optional in 02-ingest.py; v1 returns []
    return [];
  },
  async insightSearch(question, k) {
    // Pure FTS for v1 insight; dense path lives in 04-search.py CLI
    const reader = await conn.runAndReadAll(
      `SELECT patent_id, fts_main_patent_fts_doc.match_bm25(patent_id, $1) AS score
       FROM patent_fts_doc WHERE score IS NOT NULL
       ORDER BY score DESC LIMIT ${k};`,
      [question],
    );
    const out: Array<{ grant: PatentGrant; score: number }> = [];
    for (const row of reader.getRowObjectsJson()) {
      const g = await this.getById(String(row.patent_id));
      if (g) out.push({ grant: g.grant, score: Number(row.score) });
    }
    return out;
  },
  async getByCanonicalUrl(url) {
    const m = url.match(/US(\d+)/);
    if (!m) return null;
    const found = await this.getById(m[1]);
    return found?.grant ?? null;
  },
};

function rowToGrant(r: Record<string, unknown>): PatentGrant {
  return {
    patent_id: String(r.patent_id),
    patent_kind: "B2",
    patent_type: String(r.patent_type ?? "utility"),
    patent_title: r.patent_title ? String(r.patent_title) : null,
    patent_abstract: r.patent_abstract ? String(r.patent_abstract) : null,
    application_id: null,
    filing_date: null,
    grant_date: r.grant_date ? String(r.grant_date) : null,
    publication_date: null,
    priority_date: null,
    jurisdiction: "US",
    num_claims: typeof r.num_claims === "number" ? r.num_claims : null,
  } as PatentGrant;
}

const app = new Hono();

app.get("/", (c) =>
  c.json({
    name: "bucket-foundation-local-patents",
    spec: "feed402/0.3",
    local_mode: LOCAL_MODE,
    db: DB_PATH,
  }),
);

mountPatents(app, repo, {
  // In LOCAL_MODE skip the x402 challenge — just stamp a dummy receipt.
  guard: () =>
    LOCAL_MODE
      ? { ok: true, tx: "local-mode-no-payment" }
      : { ok: false, respond: () => new Response("x402 required", { status: 402 }) },
});

console.log(`==> bkt-ibj local feed402 listening on :${PORT}  (local_mode=${LOCAL_MODE})`);
export default { port: PORT, fetch: app.fetch };
