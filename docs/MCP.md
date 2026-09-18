# MCP

bucket.foundation serves a hosted MCP endpoint at `https://www.bucket.foundation/api/mcp`: Streamable HTTP in its stateless form (one POST per JSON-RPC message or batch, JSON responses, no session, no server-initiated stream), no authentication, read-only. The dispatch and the tools live in `src/lib/mcp/server.ts`; the route is `src/app/api/mcp/route.ts`; `scripts/test-mcp-route.ts` covers the surface with `npm run test:mcp`.

## Connect

| Client | Steps |
|---|---|
| Claude.ai | Settings, Connectors, Add custom connector; name `Bucket`, URL `https://www.bucket.foundation/api/mcp`, no OAuth fields; enable it in a chat's tools menu |
| Claude Desktop | Same connector, under Settings, Connectors |
| ChatGPT | Settings, Apps & Connectors, Advanced, enable Developer mode, Create; MCP server URL `https://www.bucket.foundation/api/mcp`, authentication None |
| Claude Code | `claude mcp add --transport http bucket https://www.bucket.foundation/api/mcp` |
| Offline | `mcp-server/bucket-mcp.py` over stdio, per `public/.well-known/mcp.json` |

The endpoint answers from the deployment it runs on, so a Vercel preview URL works the same way for testing a branch, subject to that deployment's protection settings.

## Tools

| Tool | Reads | Returns |
|---|---|---|
| `canon_search` | the claim-card index, lexical ranking, optional branch filter | slug, concept, branch, score, excerpt, card URL, evidence count |
| `canon_get_claim` | one claim card | the card and its evidence passages |
| `canon_list_branches` | `BRANCHES` | slug, name, figure count |
| `canon_list_bridges` | cross-branch bridges, or one by slug | bridge entries |
| `bucket_cite` | doi.org content negotiation | CSL-JSON, or a webpage stub for a plain URL |
| `hypothesize` | `hte-serve` at `HTE_SERVE_URL` | the engine's ranked timeline, gap nodes, coverage, self-report. Answers on a local run through the `hte-serve.service` user unit; the hosted endpoint returns `engine offline` until the engine has a public host |

Every tool result is returned twice, as `structuredContent` and as JSON text in `content`, with `isError` set when the tool's own `ok` is false.

## What it does not do

No tool writes. Productions, canon sign-off, the prior ledger, and anything scoped to a person stay behind the signed-in routes until the agent key in `docs/ARCHITECTURE.md`'s account model exists; at that point the same endpoint gains OAuth (Claude.ai and ChatGPT connectors support it) and the write-side tools from the Research OS plan (`project.*`, `evidence.*`, scoped `hypothesize`). `hypothesize` today forwards whatever productions the caller supplies inline and returns the run without storing it.

## Protocol notes

`initialize` reports protocol version `2025-06-18`; older clients negotiating `2024-11-05` receive the same tool surface. GET and DELETE answer 405; OPTIONS answers CORS preflight with `*`. Errors follow JSON-RPC: `-32700` parse, `-32600` invalid request, `-32601` method not found, `-32602` unknown tool, `-32603` tool exception.
