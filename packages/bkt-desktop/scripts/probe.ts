import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface ProbeResult {
  page: boolean;
  uiBundle: boolean;
  forgedNonceRejected: boolean;
  noTokenRejected: boolean;
}

export function appRecordPath(env: Record<string, string | undefined>, uid: number | undefined): string {
  const base = env.XDG_RUNTIME_DIR ?? join(env.TMPDIR ?? tmpdir(), `bucket-${uid ?? "user"}`);
  return join(base, "bucket", "app.json");
}

export function readPort(path: string): number | null {
  if (!existsSync(path)) return null;
  const rec = JSON.parse(readFileSync(path, "utf8")) as { port?: unknown };
  return typeof rec.port === "number" ? rec.port : null;
}

export async function probe(port: number, f: typeof fetch = fetch): Promise<ProbeResult> {
  const base = `http://127.0.0.1:${port}`;
  const root = await f(`${base}/`);
  const html = await root.text();
  const asset = await f(`${base}/assets/app.js`);
  const forged = await f(`${base}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce: "forged" }) });
  const bare = await f(`${base}/local/decks`);
  return { page: root.status === 410 || html.includes("window.__BKT__"), uiBundle: asset.ok, forgedNonceRejected: forged.status >= 400, noTokenRejected: bare.status === 401 || bare.status === 403 };
}
