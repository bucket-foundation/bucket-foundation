#!/usr/bin/env node
/**
 * Bucket Academy LLM auth-shim.
 *
 * Sits in front of the local llama.cpp server (127.0.0.1:11435) and is the ONLY
 * thing exposed through the cloudflared tunnel. Raw llama-server has no auth, so
 * we never tunnel it directly. The shim:
 *   - requires `Authorization: Bearer <LLM_SHIM_SECRET>` on /v1/* requests
 *   - forwards approved requests to the upstream llama-server
 *   - only proxies the OpenAI-compatible surface the tutor uses
 *   - exposes an unauthenticated GET /health for the tunnel/uptime checks
 *
 * Zero dependencies (Node built-in http only) so it runs as a plain systemd
 * --user service with no install step.
 *
 * Env:
 *   LLM_SHIM_PORT     (default 11500)  — port the shim listens on
 *   LLM_UPSTREAM      (default http://127.0.0.1:11435) — llama-server base
 *   LLM_SHIM_SECRET   (required)       — bearer token clients must present
 */
import http from "node:http";

const PORT = Number(process.env.LLM_SHIM_PORT || 11500);
const UPSTREAM = (process.env.LLM_UPSTREAM || "http://127.0.0.1:11435").replace(/\/+$/, "");
const SECRET = process.env.LLM_SHIM_SECRET || "";

if (!SECRET) {
  console.error("FATAL: LLM_SHIM_SECRET is required");
  process.exit(1);
}

// Constant-time-ish compare to avoid trivial timing leaks.
function tokenOk(header) {
  if (!header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return false;
  const got = Buffer.from(m[1]);
  const want = Buffer.from(SECRET);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

// Only these upstream paths are reachable through the shim.
const ALLOW = new Set(["/v1/chat/completions", "/v1/models", "/v1/completions"]);

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  // Unauthenticated liveness probe for the tunnel + uptime checks.
  if (req.method === "GET" && (url === "/health" || url === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", upstream: UPSTREAM }));
    return;
  }

  if (!ALLOW.has(url.split("?")[0])) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!tokenOk(req.headers["authorization"])) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const target = new URL(UPSTREAM + url);
    const proxyReq = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: req.method,
        headers: { "content-type": "application/json", "content-length": body.length },
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 502, {
          "content-type": upRes.headers["content-type"] || "application/json",
        });
        upRes.pipe(res);
      },
    );
    proxyReq.on("error", (e) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "upstream_unreachable", detail: String(e.message) }));
    });
    proxyReq.end(body);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`llm-shim listening on 127.0.0.1:${PORT} -> ${UPSTREAM} (bearer-protected)`);
});
