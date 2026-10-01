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

export interface SecondLaunch {
  spawn: (argv: string[]) => { exited: Promise<number>; kill: () => void };
  exe: string;
  link: string;
  record: () => string;
  before: string;
  log: () => string;
  firstAlive: () => boolean;
  exitMs?: number;
  routeMs?: number;
  sleep?: (ms: number) => Promise<unknown>;
}

export async function secondLaunch(o: SecondLaunch): Promise<string[]> {
  const sleep = o.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const failures: string[] = [];
  const route = `bucket opened /work/daily/${o.link.slice(o.link.lastIndexOf("/") + 1)}`;
  const child = o.spawn([o.exe, o.link]);
  const code = await Promise.race([child.exited, sleep(o.exitMs ?? 30_000).then(() => null)]);
  if (code === null) {
    child.kill();
    failures.push("a second launch kept running beside the first app");
  } else if (code !== 0) failures.push(`a second launch exited with ${code}`);
  const deadline = Date.now() + (o.routeMs ?? 10_000);
  while (!o.log().includes(route) && Date.now() < deadline) await sleep(200);
  if (!o.log().includes(route)) failures.push("the first app did not open the linked quiz route");
  if (!o.firstAlive()) failures.push("the first app exited after a second launch");
  let after: string | null = null;
  try {
    after = o.record();
  } catch {
    after = null;
  }
  if (after !== o.before) failures.push("the sidecar record changed after a second launch, so a second sidecar started");
  return failures;
}
