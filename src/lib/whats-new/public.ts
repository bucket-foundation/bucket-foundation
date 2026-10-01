import type { Kind } from "./schema";
import { listEntries, type DocStore, type StoredEntry } from "./store";

export const SITE_URL = "https://www.bucket.foundation";

export interface LegacyEntry {
  id: string;
  date: string;
  category?: string;
  [field: string]: unknown;
}

export type PublicEntry = Record<string, unknown> & { id: string; date: string; category?: string; kind?: string };

function legacyKind(entry: PublicEntry): string {
  return entry.category === "production" || entry.category === "generation" ? entry.category : "update";
}

export function publicView(entry: StoredEntry): PublicEntry {
  const { poster: _poster, body_hash: _hash, review_state: _review, image: _image, date, ...rest } = entry;
  const day = typeof entry.published_at === "string" ? entry.published_at.slice(0, 10) : (date as string);
  return { ...rest, date: day };
}

export function mergeEntries(legacy: readonly LegacyEntry[], stored: readonly StoredEntry[], kind: Kind | null = null): PublicEntry[] {
  const taken = new Set(legacy.map((e) => e.id));
  const newestFirst = (a: StoredEntry, b: StoredEntry): number => {
    const left = a.published_at ?? "";
    const right = b.published_at ?? "";
    return left < right ? 1 : left > right ? -1 : a.id < b.id ? -1 : 1;
  };
  const published = stored
    .filter((e) => e.review_state === "published" && !taken.has(e.id))
    .sort(newestFirst)
    .map(publicView);
  const all: PublicEntry[] = [...legacy, ...published];
  return all
    .filter((e) => kind === null || (e.kind ?? legacyKind(e)) === kind)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : a.i - b.i))
    .map(({ e }) => e);
}

export async function publishedEntries(store: DocStore | null): Promise<StoredEntry[]> {
  if (!store) return [];
  return (await listEntries(store)).filter((e) => e.review_state === "published");
}

export async function loadPublicEntries(legacy: readonly LegacyEntry[], store: DocStore | null, kind: Kind | null = null): Promise<PublicEntry[]> {
  return mergeEntries(legacy, await publishedEntries(store), kind);
}

export interface PageSections<T> {
  productions: T[];
  milestones: T[];
}

export function pageSections<T extends { category?: string }>(entries: readonly T[]): PageSections<T> {
  return {
    productions: entries.filter((e) => e.category === "production"),
    milestones: entries.filter((e) => e.category !== "production" && e.category !== "generation"),
  };
}

export interface FeedItem {
  title: string;
  path: string;
  desc: string;
  date: string;
  categories: { domain: string; value: string }[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function feedItems(entries: readonly PublicEntry[]): FeedItem[] {
  return entries.map((e) => {
    const path = `/whats-new#${e.id}`;
    const date = new Date(e.date).toISOString();
    if (e.kind === "generation") {
      const state = str(e.state);
      return {
        title: `Generation, ${state}: ${str(e.title)}`,
        path,
        desc: str(e.claim) || `Machine-generated ${state} from ${str(e.tool)}.`,
        date,
        categories: [
          { domain: "kind", value: "generation" },
          { domain: "state", value: state },
          { domain: "machine_generated", value: "true" },
        ],
      };
    }
    const branch = str(e.branch);
    return {
      title: `${str(e.title)}${branch ? ` (${branch})` : ""}`,
      path,
      desc: str(e.summary),
      date,
      categories: e.kind === "production" ? [{ domain: "kind", value: "production" }] : [],
    };
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function feedItemXml(item: FeedItem, pubDate: string, base: string = SITE_URL): string {
  const url = `${base}${item.path}`;
  const categories = item.categories.map((c) => `\n      <category domain="${esc(c.domain)}">${esc(c.value)}</category>`).join("");
  return `<item>
      <title>${esc(item.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(item.desc)}</description>${categories}
    </item>`;
}
