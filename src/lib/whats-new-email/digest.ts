export const SITE_URL = "https://www.bucket.foundation";
export const DAY_MS = 86_400_000;
export const KINDS = ["release", "production", "feature", "generation"] as const;
export type DigestKind = (typeof KINDS)[number];

const KIND_OF: Record<string, DigestKind> = {
  release: "release",
  production: "production",
  feature: "feature",
  "site-feature": "feature",
  generation: "generation",
};

const HEADINGS: Record<DigestKind, string> = {
  release: "Releases",
  production: "Productions",
  feature: "Features",
  generation: "Machine-made claims",
};

const LINE_MAX = 200;

export interface RawEntry {
  id?: unknown;
  date?: unknown;
  category?: unknown;
  title?: unknown;
  summary?: unknown;
  claim?: unknown;
  state?: unknown;
}

export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  line: string;
  link: string;
}

export interface DigestGroup {
  kind: DigestKind;
  heading: string;
  items: DigestItem[];
}

export interface Digest {
  day: string;
  groups: DigestGroup[];
  count: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function digestDay(now: number): string {
  return utcDay(now - DAY_MS);
}

export function oneLine(summary: string): string {
  const flat = summary.replace(/\s+/g, " ").trim();
  const end = flat.search(/[.!?](\s|$)/);
  const first = end === -1 ? flat : flat.slice(0, end + 1);
  return first.length <= LINE_MAX ? first : `${first.slice(0, LINE_MAX - 1).replace(/\s+\S*$/, "")}…`;
}

export function entryLink(id: string): string {
  return `${SITE_URL}/whats-new#${encodeURIComponent(id)}`;
}

export function buildDigest(entries: readonly RawEntry[], day: string): Digest {
  const byKind = new Map<DigestKind, DigestItem[]>();
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.date !== day || typeof e.id !== "string" || !e.id || seen.has(e.id)) continue;
    const kind = typeof e.category === "string" ? KIND_OF[e.category] : undefined;
    if (!kind || typeof e.title !== "string" || !e.title.trim()) continue;
    seen.add(e.id);
    const text = typeof e.summary === "string" ? e.summary : typeof e.claim === "string" ? e.claim : "";
    const title = kind === "generation" && typeof e.state === "string" ? `${e.title.trim()}, ${e.state}` : e.title.trim();
    const item = { id: e.id, kind, title, line: text ? oneLine(text) : "", link: entryLink(e.id) };
    byKind.set(kind, [...(byKind.get(kind) ?? []), item]);
  }
  const groups = KINDS.filter((k) => byKind.has(k)).map((kind) => ({ kind, heading: HEADINGS[kind], items: byKind.get(kind)! }));
  return { day, groups, count: groups.reduce((n, g) => n + g.items.length, 0) };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderDigest(digest: Digest, unsubscribeUrl: string, postalAddress: string, subjectLine?: string): RenderedEmail {
  const subject = subjectLine ?? `What's new on Bucket, ${digest.day}: ${digest.count} ${digest.count === 1 ? "update" : "updates"}`;
  const textParts = [`What's new on bucket.foundation, ${digest.day}`, ""];
  for (const g of digest.groups) {
    textParts.push(g.heading.toUpperCase(), "");
    for (const i of g.items) textParts.push(`* ${i.title}`, ...(i.line ? [`  ${i.line}`] : []), `  ${i.link}`, "");
  }
  textParts.push(`Full feed: ${SITE_URL}/whats-new`, "", "You get this because you opted in to the daily What's New email.", `Unsubscribe: ${unsubscribeUrl}`, "", "Bucket Foundation", postalAddress, "");

  const e = escapeHtml;
  const sections = digest.groups
    .map(
      (g) => `<tr><td style="padding:24px 0 8px;font:600 12px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b6358">${e(g.heading)}</td></tr>
${g.items
  .map(
    (i) => `<tr><td style="padding:10px 0;border-top:1px solid #e4ddd0">
<a href="${e(i.link)}" style="font:600 17px/1.4 Georgia,serif;color:#1d1a16;text-decoration:none">${e(i.title)}</a>
${i.line ? `<div style="font:15px/1.5 Georgia,serif;color:#433d35;margin-top:4px">${e(i.line)}</div>` : ""}
</td></tr>`,
  )
  .join("\n")}`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4efe6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="font:600 13px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#1d1a16">bucket.foundation</td></tr>
<tr><td style="padding-top:8px;font:400 28px/1.25 Georgia,serif;color:#1d1a16">What's new, ${e(digest.day)}</td></tr>
${sections}
<tr><td style="padding:28px 0 0"><a href="${SITE_URL}/whats-new" style="font:15px/1.5 Georgia,serif;color:#1d1a16">Read the full feed</a></td></tr>
<tr><td style="padding:32px 0 0;font:12px/1.6 Helvetica,Arial,sans-serif;color:#6b6358">You get this because you opted in to the daily What's New email. <a href="${e(unsubscribeUrl)}" style="color:#6b6358">Unsubscribe</a><br>Bucket Foundation<br>${e(postalAddress)}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text: textParts.join("\n") };
}
