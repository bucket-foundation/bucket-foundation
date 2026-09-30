# MCP

bucket.foundation serves a hosted MCP endpoint at `https://www.bucket.foundation/api/mcp`: Streamable HTTP in its stateless form (one POST per JSON-RPC message or batch, JSON responses, no session, no server-initiated stream), no authentication, read-only. The tools live in `src/lib/mcp/server.ts`, the route is `src/app/api/mcp/route.ts`, and `npm run test:mcp` runs `scripts/test-mcp-route.ts` against the surface. Research OS, the application these tools read from, is described in `docs/RESEARCH-OS-APP.md`; start at `/research-os` on the site.

## Connect

| Client | Steps |
|---|---|
| Claude.ai | Settings, Connectors, Add custom connector; name `Bucket`, URL `https://www.bucket.foundation/api/mcp`, no OAuth fields; enable it in a chat's tools menu |
| Claude Desktop | Same connector, under Settings, Connectors |
| ChatGPT | Settings, Apps & Connectors, Advanced, enable Developer mode, Create; MCP server URL `https://www.bucket.foundation/api/mcp`, authentication None |
| Claude Code | `claude mcp add --transport http bucket https://www.bucket.foundation/api/mcp` |
| Offline | `mcp-server/bucket-mcp.py` over stdio, per `public/.well-known/mcp.json` |

The endpoint answers from the deployment it runs on, so a Vercel preview URL tests a branch, subject to that deployment's protection settings.

## Tools

The hosted endpoint lists seven tools.

| Tool | Reads | Returns |
|---|---|---|
| `canon_search` | the source-excerpt index, lexical ranking, optional `branch` filter, `top_k` 1 to 50 | claim id, branch, concept, slug, title, score, excerpt, card URL, evidence count |
| `canon_get_claim` | one claim by `concept` and `slug` | the claim and its evidence passages |
| `canon_list_branches` | `BRANCHES` | slug, name, figure count |
| `canon_list_bridges` | cross-branch bridges, or one by `slug`; `limit` up to 200 | bridge entries |
| `bucket_cite` | doi.org content negotiation | CSL-JSON for a DOI; a plain URL gets a webpage stub |
| `hypothesize` | `hte-serve` at `HTE_SERVE_URL` | ranked timeline, gap nodes, coverage and self-report for the supplied productions |
| `bucketmath_lookup` | `lean/manifest.json`, the BucketMath Lean library | name, kind, status, type, source line, and the tag to cite it with |

`hypothesize` takes `productions` (one record or an array), plus `status_min`, `seeds`, `max_hypotheses`, `llm_mode`, `replay_only` and `prior_profile`. Without `HTE_SERVE_URL` the tool returns `engine offline`. A local run answers through the `hte-serve.service` user unit.

Every result is returned twice, as `structuredContent` and as JSON text in `content`, and `isError` is true when the tool's own `ok` is false.

The stdio server in `mcp-server/bucket-mcp.py` has its own tool set, including `bucket_research` and `canon_get_bridge`.

## Citation envelopes

Tool results carry the canonical URL of each excerpt, and `bucket_cite` returns CSL-JSON, so a caller has what it needs to cite. The feed402 envelope lives on `/api/research`: data, citation, and a receipt with tier, status and `price_usd`. Canon answers return `price_usd: 0` and the caller owes nothing. The author fee rail is x402 on Base. Server-side signing is not implemented (`src/lib/x402-pay.ts`), so no fee settles today. The discovery manifest is `public/.well-known/feed402.json`, and the model is described at `/cite-forever/v0.1`.

## Scope

No tool writes. Productions, canon sign-off and anything scoped to a person stay behind the signed-in routes. `hypothesize` forwards the productions the caller supplies and returns the run without storing it. Signed-in Research OS routes accept a Bearer token; see `docs/AUTH.md`.

## Protocol notes

`initialize` reports protocol version `2025-06-18`; clients negotiating `2024-11-05` receive the same tools. GET and DELETE answer 405; OPTIONS answers CORS preflight with `*`. Errors follow JSON-RPC: `-32700` parse, `-32600` invalid request, `-32601` method not found, `-32602` unknown tool, `-32603` tool exception.
