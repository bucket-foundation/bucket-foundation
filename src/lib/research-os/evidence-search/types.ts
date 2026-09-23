export const SCHEMA_VERSION = 1;
export const MAX_QUERY_CODE_POINTS = 512;
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_CARDS = 5;
export const BRANCH = /^\d{2}-[a-z][a-z-]*$/;

export type SearchMode = "hybrid" | "lexical";
export type SearchStatus = "ok" | "no_match" | "degraded";
export type CardKind = "summary" | "passage";

export interface EvidenceSearchRequest {
  schemaVersion: typeof SCHEMA_VERSION;
  query: string;
  branch: string;
  targetNodeId: string | null;
  limit: number;
}

export interface EvidenceCard {
  nodeId: string;
  slug: string;
  sourceId: string;
  sourceRevision: string;
  title: string;
  citation: string;
  kind: CardKind;
  excerpt: string;
  locator: string | null;
  sourceUrl: string | null;
  quoteAvailable: boolean;
}

export interface EvidenceSearchResponse {
  schemaVersion: typeof SCHEMA_VERSION;
  requestId: string;
  mode: SearchMode;
  status: SearchStatus;
  corpusRevision: string;
  modelRevision: string | null;
  cards: EvidenceCard[];
}

const FIELDS = new Set(["schemaVersion", "query", "branch", "targetNodeId", "limit"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ParsedRequest = { ok: true; value: EvidenceSearchRequest } | { ok: false; status: 400; message: string };

export function parseSearchRequest(body: unknown): ParsedRequest {
  const bad = (message: string): ParsedRequest => ({ ok: false, status: 400, message });
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("the body is a JSON object");
  const b = body as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => !FIELDS.has(k));
  if (extra.length) return bad(`unsupported fields: ${extra.sort().join(", ")}`);
  if (b.schemaVersion !== SCHEMA_VERSION) return bad(`schemaVersion ${SCHEMA_VERSION} is the only version this route answers`);
  if (typeof b.query !== "string") return bad("query is text");
  const query = b.query.trim();
  if (!query || Array.from(query).length > MAX_QUERY_CODE_POINTS) return bad(`query is 1 to ${MAX_QUERY_CODE_POINTS} characters`);
  if (typeof b.branch !== "string" || !BRANCH.test(b.branch)) return bad("branch is a canon branch, such as 02-physics");
  const target = b.targetNodeId ?? null;
  if (target !== null && (typeof target !== "string" || !UUID.test(target))) return bad("targetNodeId is a node id");
  const limit = b.limit ?? MAX_CARDS;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_CARDS) return bad(`limit is 1 to ${MAX_CARDS}`);
  return { ok: true, value: { schemaVersion: SCHEMA_VERSION, query, branch: b.branch, targetNodeId: target, limit } };
}

export function isSearchResponse(value: unknown): value is EvidenceSearchResponse {
  const r = value as EvidenceSearchResponse;
  return Boolean(
    r &&
      typeof r === "object" &&
      r.schemaVersion === SCHEMA_VERSION &&
      typeof r.requestId === "string" &&
      (r.mode === "hybrid" || r.mode === "lexical") &&
      (r.status === "ok" || r.status === "no_match" || r.status === "degraded") &&
      typeof r.corpusRevision === "string" &&
      Array.isArray(r.cards) &&
      r.cards.every(
        (c) =>
          c &&
          typeof c.slug === "string" &&
          typeof c.title === "string" &&
          typeof c.excerpt === "string" &&
          (c.kind === "summary" || c.kind === "passage") &&
          (c.kind === "passage" || (c.locator === null && c.quoteAvailable === false)),
      ),
  );
}
