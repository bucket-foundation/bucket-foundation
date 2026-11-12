import { checkLink, redeemLink } from "./notify";
import type { MarkStore } from "./marks";
import type { WaitlistStore } from "../waitlist/store";

export type Artifact = { statusCode: number; stream: ReadableStream<Uint8Array> | null };

export interface ServeDeps {
  secret: string | undefined;
  artifact: string | undefined;
  marks: MarkStore | null;
  store: WaitlistStore | null;
  fetchArtifact: (pathname: string) => Promise<Artifact | null>;
  now: number;
}

export type ServeResult = { kind: "text"; status: number; body: string } | { kind: "file"; name: string; stream: ReadableStream<Uint8Array> };

export const EXPIRED = "This link has expired. Request a new one at /download.";
export const PAUSED = "Downloads are paused for a moment. Your link still works, so try it again later.";
export const USED = "This link was used. Request a new one at /download.";

export async function serveDownload(q: URLSearchParams, deps: ServeDeps): Promise<ServeResult> {
  const link = checkLink(q, deps.secret, deps.now);
  if (!link.ok) return { kind: "text", status: 410, body: EXPIRED };
  const artifact = deps.artifact?.trim();
  if (!artifact || !deps.marks || !deps.store) return { kind: "text", status: 503, body: "Download not published yet." };
  try {
    if (!(await deps.store.read(link.key))) return { kind: "text", status: 410, body: EXPIRED };
    const res = await deps.fetchArtifact(artifact).catch((err: unknown) => {
      console.error("[download] artifact unavailable:", err instanceof Error ? err.message : err);
      return null;
    });
    if (!res || res.statusCode !== 200 || !res.stream) return { kind: "text", status: 503, body: PAUSED };
    if (!(await redeemLink(deps.marks, link.sig, deps.now))) {
      await res.stream.cancel().catch(() => undefined);
      return { kind: "text", status: 410, body: USED };
    }
    const name = (artifact.split("/").pop() ?? "bucket").replace(/[^\w.-]/g, "_");
    return { kind: "file", name, stream: res.stream };
  } catch (err) {
    console.error("[download] serve failed:", err instanceof Error ? err.message : err);
    return { kind: "text", status: 502, body: "Download failed. Try again in a minute." };
  }
}
