import { createHash, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { platformFor, procNetTcpOwner, type Owner, type Platform } from "./platform";

export const NONCE_TTL_MS = 30_000;
export const HOSTNAME = "127.0.0.1";
export const MAX_BODY_BYTES = 256 * 1024;

export type PeerUidResolver = (peerPort: number, serverPort: number) => Owner | null | undefined;
export type Route = (req: Request, url: URL) => Response | Promise<Response>;

export interface ServeOptions {
  cliToken?: string;
  cliSecret?: string;
  port?: number;
  uid?: Owner;
  platform?: Platform;
  resolvePeerUid?: PeerUidResolver;
  now?: () => number;
  routes?: Record<string, Route>;
  uiDir?: string;
  maxBodyBytes?: number;
  routeBodyBytes?: Record<string, number>;
  onError?: (e: Error) => void;
}

export interface Serve {
  port: number;
  hostname: string;
  url: string;
  remint(): void;
  stop(): void;
}

export const procNetTcpUid = procNetTcpOwner;

export function proveServer(secret: string, challenge: string): string {
  return createHmac("sha256", secret).update(`bkt-serve:${challenge}`).digest("base64url");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const deny = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });
const gone = () =>
  new Response("This window's launch code is used. Run bkt app to open Bucket again.", {
    status: 410,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

const TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export interface UiAssets {
  files: Map<string, { body: Uint8Array; type: string }>;
  scripts: string[];
  styles: string[];
}

const UI_DIRS: { dir: string; types: Record<string, string> }[] = [
  { dir: "assets", types: TYPES },
  { dir: "textures/earth", types: { ".bin": "application/octet-stream", ".json": "application/json" } },
];

export const UI_ENTRY = "/assets/app.js";

export function loadUi(dir: string | undefined): UiAssets {
  const files = new Map<string, { body: Uint8Array; type: string }>();
  for (const { dir: sub, types } of UI_DIRS) {
    const root = dir ? join(dir, sub) : "";
    if (!dir || !existsSync(root)) continue;
    for (const name of readdirSync(root).sort()) {
      const p = join(root, name);
      const type = types[extname(name)];
      if (!type || !statSync(p).isFile() || !/^[A-Za-z0-9._-]+$/.test(name)) continue;
      files.set(`/${sub}/${name}`, { body: readFileSync(p), type });
    }
  }
  const keys = [...files.keys()];
  const js = keys.filter((k) => k.startsWith("/assets/") && k.endsWith(".js"));
  return { files, scripts: js.includes(UI_ENTRY) ? [UI_ENTRY] : js, styles: keys.filter((k) => k.startsWith("/assets/") && k.endsWith(".css")) };
}

export function page(nonce: string, ui: Pick<UiAssets, "scripts" | "styles"> = { scripts: [], styles: [] }): { html: string; csp: string } {
  const script = `window.__BKT__=${JSON.stringify({ nonce })};`;
  const hash = createHash("sha256").update(script).digest("base64");
  const csp = [
    "default-src 'none'",
    `script-src 'self' 'sha256-${hash}'`,
    "connect-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  const links = ui.styles.map((s) => `<link rel="stylesheet" href="${s}">`).join("");
  const mods = ui.scripts.map((s) => `<script type="module" src="${s}"></script>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bucket</title><script>${script}</script>${links}${mods}</head><body><div id="root"></div></body></html>`;
  return { html, csp };
}

export function startServe(opts: ServeOptions = {}): Serve {
  const platform = opts.platform ?? (opts.uid === undefined || opts.resolvePeerUid === undefined ? platformFor() : null);
  const uid = opts.uid ?? platform!.self();
  const resolve = opts.resolvePeerUid ?? ((peer: number, server: number) => platform!.peerOwner(peer, server));
  const now = opts.now ?? Date.now;
  const routes = opts.routes ?? {};
  const ui = loadUi(opts.uiDir);
  const maxBody = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  const routeBody = opts.routeBodyBytes ?? {};
  const serverMax = Math.max(maxBody, ...Object.values(routeBody));
  const unavailable =
    platform && !opts.resolvePeerUid
      ? `peer owner lookup on ${platform.os} could not run ${platform.peerTools.join(" or ")}, so every request is refused; restore it and start bkt serve again`
      : "peer owner lookup is unavailable, so every request is refused";
  let lookupReported = false;
  const lookupFailed = (e: Error) => {
    if (lookupReported) return;
    lookupReported = true;
    opts.onError?.(e);
  };
  let nonce = "";
  let mintedAt = 0;
  let served = false;
  let redeemed = false;
  let token: string | null = null;

  const remint = () => {
    nonce = randomBytes(32).toString("base64url");
    mintedAt = now();
    served = false;
    redeemed = false;
    token = null;
  };
  remint();

  const live = () => !redeemed && now() - mintedAt <= NONCE_TTL_MS;

  async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: number }> {
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > maxBody) return { ok: false, status: 413 };
    const buf = await req.arrayBuffer();
    if (buf.byteLength > maxBody) return { ok: false, status: 413 };
    try {
      return { ok: true, value: JSON.parse(new TextDecoder().decode(buf)) };
    } catch {
      return { ok: false, status: 400 };
    }
  }

  const server = Bun.serve({
    hostname: HOSTNAME,
    port: opts.port ?? 0,
    development: false,
    maxRequestBodySize: serverMax,
    error(e) {
      opts.onError?.(e);
      return deny(500);
    },
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
        let peer: Owner | null | undefined;
        try {
          peer = resolve(ip.port, serverPort);
        } catch (e) {
          lookupFailed(e as Error);
          return false;
        }
        if (peer === undefined) lookupFailed(new Error(unavailable));
        return peer !== undefined && peer !== null && peer === uid;
      };

      if (url.pathname === "/" && req.method === "GET") {
        if (!peerOk()) return deny(403);
        if (served || !live()) return gone();
        served = true;
        const { html, csp } = page(nonce, ui);
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

      const asset = req.method === "GET" ? ui.files.get(url.pathname) : undefined;
      if (asset) {
        if (!peerOk()) return deny(403);
        return new Response(new Blob([asset.body as Uint8Array<ArrayBuffer>]), { headers: { "content-type": asset.type, "cache-control": "no-store", "x-content-type-options": "nosniff" } });
      }

      if (url.pathname === "/session" && req.method === "POST") {
        if (origin === null) return deny(403);
        if (!peerOk()) return deny(403);
        const body = await readJson(req);
        if (!body.ok) return deny(body.status);
        const given = (body.value as { nonce?: unknown } | null)?.nonce;
        if (typeof given !== "string" || !served || !live() || !same(given, nonce)) return deny(401);
        redeemed = true;
        token = randomBytes(32).toString("base64url");
        return json({ token });
      }

      if (url.pathname === "/cli/prove" && req.method === "GET" && opts.cliSecret !== undefined) {
        const challenge = url.searchParams.get("challenge") ?? "";
        if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return deny(400);
        return json({ proof: proveServer(opts.cliSecret, challenge) });
      }
      const auth = req.headers.get("authorization") ?? "";
      const m = auth.match(/^Bucket ([A-Za-z0-9_-]{43})$/);
      const cli = opts.cliToken !== undefined && !!m && same(m[1], opts.cliToken);
      if (!cli && (!token || !m || !same(m[1], token))) return deny(401);
      if (url.pathname === "/local/ping" && req.method === "GET") return json({ ok: true });
      const key = `${req.method} ${url.pathname}`;
      const route = routes[key];
      if (!route) return deny(404);
      if (req.method !== "GET") {
        const cap = routeBody[key] ?? maxBody;
        const declared = req.headers.get("content-length");
        if (declared === null || !/^\d+$/.test(declared)) return deny(411);
        if (Number(declared) > cap) return deny(413);
      }
      return route(req, url);
    },
  });

  return {
    port: server.port ?? -1,
    hostname: HOSTNAME,
    url: `http://${HOSTNAME}:${server.port}/`,
    remint,
    stop: () => server.stop(true),
  };
}
