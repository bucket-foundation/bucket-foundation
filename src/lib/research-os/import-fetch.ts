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

/** How many redirects a fetch will follow before giving up. */
export const MAX_REDIRECTS = 5;

/**
 * Follow a redirect chain, checking every hop.
 *
 * `redirect: "follow"` let the runtime do this, and the host check ran
 * once, against the URL the learner typed. A public host answering 302
 * with a `Location` of `http://169.254.169.254/latest/meta-data/` was
 * fetched by the server, and the reply reached the learner as the body
 * of their import. Any signed-in learner could ask for it: the route at
 * `src/app/api/research-os/access/route.ts:112` takes an arbitrary URL
 * behind nothing but a session.
 *
 * Each hop is checked with the same rule the first one is, and a
 * relative `Location` resolves against the URL that sent it.
 *
 * Residual, and written down rather than implied away: a hostname that
 * resolves to a private address defeats this, because the check reads
 * the URL and not the socket. Closing that needs the address pinned
 * between the lookup and the connection, which this runtime's fetch
 * does not expose.
 */
export async function fetchFollowingChecked(
  raw: string,
  init: RequestInit,
  // Injectable so a test can allow its own loopback fixture as the first
  // hop and still refuse the address the redirect aims at. Every caller
  // in the application uses the default.
  isAllowed: (url: string) => boolean = isPublicHttpUrl,
): Promise<Response | null> {
  let url = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isAllowed(url)) return null;
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status < 300 || res.status > 399) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      return null;
    }
    url = next.toString();
  }
  return null;
}

export async function fetchTextFromUrl(raw: string): Promise<FetchedSource | null> {
  if (!isPublicHttpUrl(raw)) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFollowingChecked(raw, { signal: ctrl.signal, headers: { accept: "text/html,text/plain;q=0.9,*/*;q=0.1", "user-agent": "bucket-foundation-research-os/1 (+https://www.bucket.foundation)" } });
    if (!res || !res.ok) return null;
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
