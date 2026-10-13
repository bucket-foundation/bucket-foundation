import { proven, readServerRecord, SERVER_CALL_MS, type ServerRecord } from "./backend";

export interface Reply<T> {
  status: number;
  body: T & { error?: string };
}

export async function provenServer(dir: string, isAlive?: (pid: number) => boolean): Promise<ServerRecord | null> {
  const rec = readServerRecord(dir, isAlive);
  return rec && (await proven(rec)) ? rec : null;
}

export async function callServer<T>(rec: ServerRecord, path: string, body?: unknown): Promise<Reply<T>> {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const r = await fetch(`http://127.0.0.1:${rec.port}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bucket ${rec.token}`, ...(text ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)) } : {}) },
    body: text,
    signal: AbortSignal.timeout(SERVER_CALL_MS),
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as T & { error?: string } };
}
