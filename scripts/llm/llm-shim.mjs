#!/usr/bin/env node
import http from "node:http";

const PORT = Number(process.env.LLM_SHIM_PORT || 11500);
const UPSTREAM = (process.env.LLM_UPSTREAM || "http://127.0.0.1:11435").replace(/\/+$/, "");
const SECRET = process.env.LLM_SHIM_SECRET || "";

if (!SECRET) {
  console.error("FATAL: LLM_SHIM_SECRET is required");
  process.exit(1);
}

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

const ALLOW = new Set(["/v1/chat/completions", "/v1/models", "/v1/completions"]);

const server = http.createServer((req, res) => {
  const url = req.url || "/";

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
