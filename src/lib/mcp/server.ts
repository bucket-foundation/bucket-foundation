/**
 * bucket.foundation's hosted MCP server: JSON-RPC 2.0 dispatch and the tool
 * registry, pure and testable (`scripts/test-mcp-route.ts`), with the HTTP
 * face in `src/app/api/mcp/route.ts`. Speaks the Streamable HTTP transport
 * in its stateless form: every request is one POST carrying one JSON-RPC
 * message or a batch, every response is `application/json`, no session id,
 * no server-initiated stream, so Claude.ai, Claude Desktop, ChatGPT, and
 * `claude mcp add --transport http` connect with a URL and nothing else.
 *
 * Tools read the canon from the repo's own libraries (`src/lib/canon*.ts`,
 * the same data `/api/canon/search` serves), cite through doi.org, and
 * forward `hypothesize` to the hypothesis engine's `hte-serve` at
 * `HTE_SERVE_URL` (`tools/hypothesis-engine/hte/serve.py`), the seam
 * `tools/hypothesis-engine/hte/mcp_tool.py` names. No tool writes to the
 * database; the write side (productions, canon sign-off) stays behind the
 * signed-in routes until the agent key in `docs/ARCHITECTURE.md`'s account
 * model exists.
 */
import { BRANCHES } from "../canon";
import { getAllBridges, getBridge } from "../canon-bridges";
import { getClaim } from "../canon-claims";
import { getEvidenceFor } from "../canon-evidence";
import { buildIndex, tokenRank } from "../canon-search-index";

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_INFO = { name: "bucket-foundation", version: "0.2.0" };
// The Hobby plan caps a function at 60 s (route.ts maxDuration). The engine
// call gives up at 55 s so the tool returns an error the client can read.
const HTE_TIMEOUT_MS = 55_000;

type Json = Record<string, unknown>;
export type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Json; isError?: boolean };
type ToolHandler = (args: Json) => Promise<Json>;
type ToolSpec = { name: string; description: string; inputSchema: Json; handler: ToolHandler };

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? Math.trunc(v) : parseInt(asString(v, ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

const DOI_RE = /10\.\d{4,9}\/[^\s"<>]+/i;

async function canonSearch(args: Json): Promise<Json> {
  const q = asString(args.q).trim();
  if (!q) return { ok: false, error: "q required" };
  const topK = asInt(args.top_k, 10, 1, 50);
  const branch = asString(args.branch);
  const idx = buildIndex();
  if (!idx.length) return { ok: false, error: "canon search index not built" };
  let results = tokenRank(q, topK * 3);
  if (branch) results = results.filter((r) => r.entry.branch === branch);
  const out = results.slice(0, topK).map((r) => {
    const ev = getEvidenceFor(r.entry.concept, r.entry.slug);
    return {
      claim_id: r.entry.rowid,
      branch: r.entry.branch,
      concept: r.entry.concept,
      slug: r.entry.slug,
      title: r.entry.title,
      score: Number(r.score.toFixed(4)),
      excerpt: r.entry.text.slice(0, 400),
      url: `https://www.bucket.foundation/canon/${r.entry.branch}/${r.entry.concept}/${r.entry.slug}`,
      evidence_count: ev ? (ev as { passages?: unknown[] }).passages?.length ?? null : null,
    };
  });
  return { ok: true, query: q, mode: "lexical", n_results: out.length, results: out };
}

async function canonGetClaim(args: Json): Promise<Json> {
  const concept = asString(args.concept).trim();
  const slug = asString(args.slug).trim();
  if (!concept || !slug) return { ok: false, error: "concept and slug required" };
  const claim = getClaim(concept, slug);
  if (!claim) return { ok: false, error: `no claim ${concept}/${slug}` };
  const evidence = getEvidenceFor(concept, slug);
  return { ok: true, claim, evidence };
}

async function canonListBranches(): Promise<Json> {
  return {
    ok: true,
    branches: BRANCHES.map((b) => ({ slug: b.slug, name: b.name, figures: b.figures?.length ?? 0 })),
  };
}

async function canonListBridges(args: Json): Promise<Json> {
  const slug = asString(args.slug).trim();
  if (slug) {
    const bridge = getBridge(slug);
    return bridge ? { ok: true, bridge } : { ok: false, error: `no bridge ${slug}` };
  }
  const all = getAllBridges();
  return { ok: true, n: all.length, bridges: all.slice(0, asInt(args.limit, 50, 1, 200)) };
}

async function bucketCite(args: Json): Promise<Json> {
  const raw = asString(args.doi_or_url).trim();
  if (!raw) return { ok: false, error: "doi_or_url required" };
  const m = DOI_RE.exec(raw);
  if (!m) return { ok: true, csl_json: { type: "webpage", URL: raw, id: raw }, note: "no DOI detected; minimal webpage CSL stub" };
  const doi = m[0].replace(/[.,;)]+$/, "");
  try {
    const res = await fetch(`https://doi.org/${doi}`, {
      headers: { accept: "application/vnd.citationstyles.csl+json", "user-agent": "bucket-mcp/0.2" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, doi, error: `doi.org returned ${res.status}` };
    return { ok: true, doi, csl_json: await res.json() };
  } catch (err) {
    return { ok: false, doi, error: err instanceof Error ? err.message : String(err) };
  }
}

async function hypothesize(args: Json): Promise<Json> {
  const base = (process.env.HTE_SERVE_URL || "").replace(/\/+$/, "");
  if (!base) {
    return {
      ok: false,
      error: "engine offline: HTE_SERVE_URL is not set on this deployment; run hte-serve and set it, or use the hosted engine when it lands",
    };
  }
  try {
    const res = await fetch(`${base}/hypothesize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(HTE_TIMEOUT_MS),
    });
    const body = (await res.json()) as Json;
    return res.ok ? body : { ok: false, error: `hte-serve returned ${res.status}`, detail: body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const PRODUCTION_RECORD = {
  type: "object",
  description: "One Research OS production (tools/hypothesis-engine/docs/PRODUCTION-SCHEMA.md): claim, evidence, sources, counter-evidence, status.",
};

export const TOOLS: ToolSpec[] = [
  {
    name: "canon_search",
    description: "Search the source excerpts behind the bucket.foundation canon, passages from talks and podcasts with a video and timestamp each, by natural-language query; lexical ranking over title and excerpt, optional branch filter. Returns slug, concept, branch, score, excerpt, and the card URL.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "natural-language query" },
        top_k: { type: "integer", default: 10, minimum: 1, maximum: 50 },
        branch: { type: "string", description: "optional branch slug filter, for example 02-physics" },
      },
      required: ["q"],
    },
    handler: canonSearch,
  },
  {
    name: "canon_get_claim",
    description: "Fetch one source excerpt by concept and slug, with its evidence passages.",
    inputSchema: { type: "object", properties: { concept: { type: "string" }, slug: { type: "string" } }, required: ["concept", "slug"] },
    handler: canonGetClaim,
  },
  {
    name: "canon_list_branches",
    description: "List the canon branches with their figure counts.",
    inputSchema: { type: "object", properties: {} },
    handler: canonListBranches,
  },
  {
    name: "canon_list_bridges",
    description: "List cross-branch bridges (a primitive that appears in more than one branch), or fetch one by slug.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, limit: { type: "integer", default: 50 } } },
    handler: canonListBridges,
  },
  {
    name: "bucket_cite",
    description: "A CSL-JSON citation for a DOI or a URL that contains one, through doi.org content negotiation; a plain URL gets a webpage stub.",
    inputSchema: { type: "object", properties: { doi_or_url: { type: "string" } }, required: ["doi_or_url"] },
    handler: bucketCite,
  },
  {
    name: "hypothesize",
    description: "Run a hypothesis-engine campaign over one or more Research OS productions and return the ranked timeline (lift, posterior, partition shares), gap nodes, coverage, and self-report. Forwards to hte-serve; answers with an error while the engine is offline.",
    inputSchema: {
      type: "object",
      required: ["productions"],
      properties: {
        productions: { oneOf: [PRODUCTION_RECORD, { type: "array", items: PRODUCTION_RECORD, minItems: 1 }] },
        status_min: { type: "string", enum: ["draft", "peer-reviewed", "teacher-reviewed", "accepted"], default: "peer-reviewed" },
        seeds: { type: "integer", minimum: 1, default: 1 },
        max_hypotheses: { type: "integer", minimum: 1, default: 100 },
        llm_mode: { type: "string", enum: ["fake", "claude"] },
        replay_only: { type: "boolean", default: false },
        prior_profile: { type: "string", enum: ["consensus", "skeptic", "fringe", "uniform"], default: "consensus" },
      },
    },
    handler: hypothesize,
  },
];

type RpcRequest = { jsonrpc?: string; id?: unknown; method?: string; params?: Json };
type RpcResponse = { jsonrpc: "2.0"; id: unknown; result?: unknown; error?: { code: number; message: string; data?: unknown } };

function ok(id: unknown, result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id, result };
}
function fail(id: unknown, code: number, message: string, data?: unknown): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

/** One JSON-RPC message in, one response out; `null` for a notification. */
export async function handleMessage(msg: RpcRequest): Promise<RpcResponse | null> {
  const { id, method, params } = msg;
  if (msg.jsonrpc !== "2.0" || typeof method !== "string") return fail(id, -32600, "invalid request");
  if (method.startsWith("notifications/")) return null;
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Bucket Foundation: canon search and source excerpts, DOI citations, and the hypothesis engine's hypothesize tool. Read-only; every excerpt answer carries its canonical URL for citation.",
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const name = asString(params?.name);
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `unknown tool: ${name}`);
      const args = (params?.arguments && typeof params.arguments === "object" ? (params.arguments as Json) : {}) as Json;
      try {
        const result = await tool.handler(args);
        const isError = result.ok === false;
        const payload: ToolResult = { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError };
        return ok(id, payload);
      } catch (err) {
        return fail(id, -32603, err instanceof Error ? err.message : String(err));
      }
    }
    default:
      return fail(id, -32601, `method not found: ${method}`);
  }
}

/** The body of one POST: a single message or a batch; the responses to send, or none for notifications only. */
export async function handleBody(body: unknown): Promise<RpcResponse[] | RpcResponse | null> {
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleMessage(m as RpcRequest)))).filter((r): r is RpcResponse => r !== null);
    return out.length ? out : null;
  }
  if (!body || typeof body !== "object") return fail(null, -32600, "invalid request");
  return handleMessage(body as RpcRequest);
}
