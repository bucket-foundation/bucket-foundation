/**
 * Fetch the text of an imported source so the import is a node with
 * content, and the workspace's quote and check tools have something to
 * read. Server-only. Public http(s) hosts only; a short timeout and a
 * size cap; HTML stripped to text. Best-effort: a failed fetch leaves the
 * import as a title and a link.
 */

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8000;
export const EXCERPT_CHARS = 6000;
export const SUMMARY_CHARS = 600;

/** http or https, a hostname that is not a loopback, link-local, or private address. */
export function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  if (h.includes(":")) return false;
  return true;
}

/** HTML to readable text: scripts, styles, and tags removed, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|br|section|article|blockquote|pre|title|head|header|footer|nav|table)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").replace(/\s+([.,;:!?)])/g, "$1").trim())
    .filter(Boolean)
    .join("\n");
}

export interface FetchedSource {
  text: string;
  title: string | null;
  contentType: string;
  bytes: number;
}

export async function fetchTextFromUrl(raw: string): Promise<FetchedSource | null> {
  if (!isPublicHttpUrl(raw)) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(raw, { signal: ctrl.signal, redirect: "follow", headers: { accept: "text/html,text/plain;q=0.9,*/*;q=0.1", "user-agent": "bucket-foundation-research-os/1 (+https://www.bucket.foundation)" } });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const body = buf.subarray(0, MAX_BYTES).toString("utf8");
    const title = contentType.includes("html") ? (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim() || null : null;
    const text = contentType.includes("html") ? htmlToText(body) : body.replace(/\r/g, "").trim();
    return { text: text.slice(0, EXCERPT_CHARS), title, contentType, bytes: buf.length };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
