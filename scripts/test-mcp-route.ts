/**
 * Unit test for `src/lib/mcp/server.ts`: the JSON-RPC surface Claude.ai,
 * Claude Desktop, ChatGPT, and `claude mcp add --transport http` speak,
 * against the repo's own canon data, no network (the DOI path is exercised
 * with a plain URL, the engine path with HTE_SERVE_URL unset). node:test
 * plus node:assert, per every other scripts/test-*.ts here.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-mcp-route.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { handleBody, handleMessage, PROTOCOL_VERSION, TOOLS } from "../src/lib/mcp/server";

type Rpc = { result?: any; error?: any; id?: unknown };

test("initialize answers with the protocol version, tools capability, and server info", async () => {
  const r = (await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })) as Rpc;
  assert.equal(r.result.protocolVersion, PROTOCOL_VERSION);
  assert.ok(r.result.capabilities.tools);
  assert.equal(r.result.serverInfo.name, "bucket-foundation");
});

test("notifications get no response; unknown methods get -32601; bad envelopes get -32600", async () => {
  assert.equal(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  const unknown = (await handleMessage({ jsonrpc: "2.0", id: 2, method: "resources/list" })) as Rpc;
  assert.equal(unknown.error.code, -32601);
  const bad = (await handleMessage({ id: 3 } as any)) as Rpc;
  assert.equal(bad.error.code, -32600);
});

test("tools/list names every registered tool with an input schema", async () => {
  const r = (await handleMessage({ jsonrpc: "2.0", id: 4, method: "tools/list" })) as Rpc;
  const names = r.result.tools.map((t: any) => t.name);
  assert.deepEqual(names, TOOLS.map((t) => t.name));
  assert.ok(r.result.tools.every((t: any) => t.inputSchema && t.description));
});

test("canon_list_branches and canon_search return canon data with card URLs", async () => {
  const branches = (await handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "canon_list_branches", arguments: {} } })) as Rpc;
  assert.equal(branches.result.isError, false);
  assert.ok(branches.result.structuredContent.branches.length >= 7);
  const search = (await handleMessage({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "canon_search", arguments: { q: "entropy", top_k: 3 } } })) as Rpc;
  assert.equal(search.result.isError, false);
  const results = search.result.structuredContent.results;
  assert.ok(results.length >= 1 && results.length <= 3);
  assert.ok(results[0].url.startsWith("https://www.bucket.foundation/canon/"));
  assert.equal(JSON.parse(search.result.content[0].text).n_results, results.length);
});

test("tools/call: unknown tool is -32602; a tool's own failure is isError with the reason", async () => {
  const unknown = (await handleMessage({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nope", arguments: {} } })) as Rpc;
  assert.equal(unknown.error.code, -32602);
  const missing = (await handleMessage({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "canon_search", arguments: {} } })) as Rpc;
  assert.equal(missing.result.isError, true);
});

test("bucket_cite returns a webpage stub for a plain URL without touching the network", async () => {
  const r = (await handleMessage({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "bucket_cite", arguments: { doi_or_url: "https://example.org/page" } } })) as Rpc;
  assert.equal(r.result.structuredContent.csl_json.type, "webpage");
});

test("hypothesize reports the engine offline when HTE_SERVE_URL is unset", async () => {
  const saved = process.env.HTE_SERVE_URL;
  delete process.env.HTE_SERVE_URL;
  try {
    const r = (await handleMessage({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "hypothesize", arguments: { productions: [{ claim: "x" }] } } })) as Rpc;
    assert.equal(r.result.isError, true);
    assert.match(r.result.structuredContent.error, /engine offline/);
  } finally {
    if (saved !== undefined) process.env.HTE_SERVE_URL = saved;
  }
});

test("a batch answers every request and drops notifications; a non-object body is -32600", async () => {
  const batch = (await handleBody([
    { jsonrpc: "2.0", id: 11, method: "ping" },
    { jsonrpc: "2.0", method: "notifications/initialized" },
  ])) as Rpc[];
  assert.equal(batch.length, 1);
  assert.deepEqual(batch[0].result, {});
  const bad = (await handleBody("nope")) as Rpc;
  assert.equal(bad.error.code, -32600);
});
