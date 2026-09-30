import { ROS_RESOURCES, webRosSource, type RosResource } from "@ros/contract";

export const MOBILE_SESSION = "mobile";
export const PROGRESS_PATH = "/api/academy/progress";

export interface SyncFetchOptions {
  base: string;
  token: () => Promise<string | null>;
  fetch: typeof fetch;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function requireHttps(base: string): string {
  const u = new URL(base);
  if (u.protocol !== "https:") throw new Error(`sync API must use https, got ${u.protocol}`);
  return u.origin;
}

function isRos(name: string): name is RosResource {
  return (ROS_RESOURCES as string[]).includes(name);
}

export function createSyncFetch(opts: SyncFetchOptions): typeof fetch {
  const base = requireHttps(opts.base);
  const ros = webRosSource({ base, fetch: opts.fetch });

  async function progress(method: string, body: BodyInit | null | undefined): Promise<Response> {
    const token = await opts.token();
    if (!token) return json({ error: "Sign in to Bucket to sync progress on this device." }, 401);
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (method === "POST") headers["content-type"] = "application/json";
    return opts.fetch(`${base}${PROGRESS_PATH}`, { method, headers, body: method === "POST" ? body : undefined, cache: "no-store" });
  }

  const handler = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = input instanceof Request ? input : null;
    const raw = req ? req.url : String(input);
    const url = new URL(raw, "https://app.invalid");
    const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
    const local = url.origin === "https://app.invalid" || raw.startsWith("/");
    if (!local) return opts.fetch(input, init);
    if (url.pathname === "/session" && method === "POST") return json({ token: MOBILE_SESSION });
    if (url.pathname === "/local/progress") return progress(method, init?.body ?? (req ? await req.text() : undefined));
    const rosName = url.pathname.match(/^\/local\/ros\/([a-z]+)$/)?.[1];
    if (rosName && isRos(rosName) && method === "GET") {
      const r = await ros.get(rosName);
      return r.ok ? json(r.data) : json({ error: r.error }, r.status >= 400 ? r.status : 502);
    }
    if (url.pathname.startsWith("/local/")) return json({ error: "This part of Bucket runs on a computer. Open Bucket on your desktop to use it." }, 501);
    return opts.fetch(input, init);
  };
  return handler as typeof fetch;
}
