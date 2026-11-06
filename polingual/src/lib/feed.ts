import { SITE } from "./facts";
import { GUIDES } from "./guides";
import { WORDS, capitalize, wordDescription, wordPath, wordTitle } from "./words";

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export type FeedItem = { title: string; link: string; description: string; category: string };

export function feedItems(): FeedItem[] {
  return [
    ...GUIDES.map((g) => ({ title: g.title, link: `${SITE}/learn/${g.slug}`, description: g.description, category: "Guides" })),
    ...WORDS.map((w) => ({ title: wordTitle(w), link: `${SITE}${wordPath(w)}`, description: wordDescription(w), category: `Words: ${capitalize(w.category)}` })),
  ];
}

export function buildFeed(built: Date = new Date()): string {
  const items = feedItems()
    .map((i) => `<item><title>${xmlEscape(i.title)}</title><link>${i.link}</link><guid isPermaLink="true">${i.link}</guid><description>${xmlEscape(i.description)}</description><category>${xmlEscape(i.category)}</category></item>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Polingual</title><link>${SITE}/</link><description>Guides and words from Polingual, the app that teaches several languages at once.</description><language>en</language><lastBuildDate>${built.toUTCString()}</lastBuildDate><atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
