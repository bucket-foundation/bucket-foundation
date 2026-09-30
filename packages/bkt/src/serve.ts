import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

export const NONCE_TTL_MS = 30_000;
export const HOSTNAME = "127.0.0.1";

export type PeerUidResolver = (peerPort: number, serverPort: number) => number | null;
export type Route = (req: Request, url: URL) => Response | Promise<Response>;

export interface ServeOptions {
  port?: number;
  uid?: number;
  resolvePeerUid?: PeerUidResolver;
  now?: () => number;
  routes?: Record<string, Route>;
}

export interface Serve {
  port: number;
  hostname: string;
  url: string;
  stop(): void;
}

function hexPort(s: string): number {
  return parseInt(s.split(":")[1], 16);
}

export function procNetTcpUid(peerPort: number, serverPort: number, files = ["/proc/net/tcp", "/proc/net/tcp6"]): number | null {
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 8) continue;
      if (hexPort(cols[1]) === peerPort && hexPort(cols[2]) === serverPort) {
        const uid = Number(cols[7]);
        return Number.isInteger(uid) ? uid : null;
      }
    }
  }
  return null;
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const deny = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });

export function page(nonce: string): { html: string; csp: string } {
  const script = `window.__BKT__=${JSON.stringify({ nonce })};`;
  const hash = createHash("sha256").update(script).digest("base64");
  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${hash}'`,
    "connect-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bucket</title><script>${script}</script></head><body><div id="root"></div></body></html>`;
  return { html, csp };
}

export function startServe(opts: ServeOptions = {}): Serve {
  const uid = opts.uid ?? process.getuid?.() ?? -1;
  const resolve = opts.resolvePeerUid ?? procNetTcpUid;
  const now = opts.now ?? Date.now;
  const routes = opts.routes ?? {};
  const nonce = randomBytes(32).toString("base64url");
  const mintedAt = now();
  let served = false;
  let redeemed = false;
  let token: string | null = null;

  const live = () => !redeemed && now() - mintedAt <= NONCE_TTL_MS;

  const server = Bun.serve({
    hostname: HOSTNAME,
    port: opts.port ?? 0,
    async fetch(req, srv) {
      const url = new URL(req.url);
      const serverPort = srv.port ?? -1;
      const expectedHost = `${HOSTNAME}:${serverPort}`;
      const expectedOrigin = `http://${expectedHost}`;
      if (req.headers.get("host") !== expectedHost) return deny(403);
      const origin = req.headers.get("origin");
      if (origin !== null && origin !== expectedOrigin) return deny(403);

      const peerOk = () => {
        const ip = srv.requestIP(req);
        if (!ip || (ip.address !== HOSTNAME && ip.address !== `::ffff:${HOSTNAME}`)) return false;
        let peer: number | null;
        try {
          peer = resolve(ip.port, serverPort);
        } catch {
          return false;
        }
        return peer !== null && peer === uid;
      };

      if (url.pathname === "/" && req.method === "GET") {
        if (!peerOk()) return deny(403);
        if (served || !live()) return deny(410);
        served = true;
        const { html, csp } = page(nonce);
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-security-policy": csp,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        });
      }

      if (url.pathname === "/session" && req.method === "POST") {
        if (origin === null) return deny(403);
        if (!peerOk()) return deny(403);
        let given: unknown;
        try {
          given = ((await req.json()) as { nonce?: unknown }).nonce;
        } catch {
          return deny(400);
        }
        if (typeof given !== "string" || !served || !live() || !same(given, nonce)) return deny(401);
        redeemed = true;
        token = randomBytes(32).toString("base64url");
        return json({ token });
      }

      const auth = req.headers.get("authorization") ?? "";
      const m = auth.match(/^Bucket ([A-Za-z0-9_-]{43})$/);
      if (!token || !m || !same(m[1], token)) return deny(401);
      if (url.pathname === "/local/ping" && req.method === "GET") return json({ ok: true });
      const route = routes[`${req.method} ${url.pathname}`];
      return route ? route(req, url) : deny(404);
    },
  });

  return {
    port: server.port ?? -1,
    hostname: HOSTNAME,
    url: `http://${HOSTNAME}:${server.port}/`,
    stop: () => server.stop(true),
  };
}
