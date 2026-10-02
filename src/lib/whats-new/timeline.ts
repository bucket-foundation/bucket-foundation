export const REPO_URL = "https://github.com/bucket-foundation/bucket-foundation";
export const POLL_MS = 60_000;

export interface TimelineEntry {
  id: string;
  date: string;
  category?: string;
  kind?: string;
  at?: unknown;
  [field: string]: unknown;
}

export interface TimelineRow<T extends TimelineEntry = TimelineEntry> {
  entry: T;
  size: "large" | "small";
  key: string;
  time: string | null;
}

export interface TimelineDay<T extends TimelineEntry = TimelineEntry> {
  day: string;
  rows: TimelineRow<T>[];
}

export const CATEGORY_LABEL: Record<string, string> = {
  "branch-opened": "branch opened",
  "entry-promoted": "entry promoted",
  "entry-stub-written": "stub written",
  "cross-link-added": "cross-link",
  "landscape-added": "landscape",
  "intake-research": "research",
  "site-refactor": "site",
  "site-feature": "site feature",
  "claim-added": "claim added",
  "pr-merged": "merged",
  generation: "generation",
  production: "production",
};

function at(entry: TimelineEntry): string | null {
  if (typeof entry.at !== "string") return null;
  const ms = Date.parse(entry.at);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function timelineKey(entry: TimelineEntry): string {
  return at(entry) ?? `${entry.date}T00:00:00.000Z`;
}

export function rowTime(entry: TimelineEntry): string | null {
  const iso = at(entry);
  return iso ? `${iso.slice(11, 16)} UTC` : null;
}

export function isLarge(entry: TimelineEntry): boolean {
  return (entry.kind ?? entry.category) === "production";
}

export function timeline<T extends TimelineEntry>(entries: readonly T[]): TimelineDay<T>[] {
  const rows = entries
    .map((entry, i) => ({ entry, i, key: timelineKey(entry) }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : a.i - b.i))
    .map(({ entry, key }): TimelineRow<T> => ({ entry, key, size: isLarge(entry) ? "large" : "small", time: rowTime(entry) }));
  const days: TimelineDay<T>[] = [];
  for (const row of rows) {
    const day = row.key.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.day === day) last.rows.push(row);
    else days.push({ day, rows: [row] });
  }
  return days;
}

export function dayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function rowLink(entry: TimelineEntry): { href: string; label: string } | null {
  const evidence = Array.isArray(entry.evidence) ? entry.evidence.find((e): e is string => typeof e === "string") : undefined;
  if (evidence) return { href: evidence, label: "evidence" };
  if (typeof entry.url === "string" && entry.url.startsWith("https://")) return { href: entry.url, label: typeof entry.pr === "number" ? `#${entry.pr}` : "link" };
  if (typeof entry.pr === "number") return { href: `${REPO_URL}/pull/${entry.pr}`, label: `#${entry.pr}` };
  if (typeof entry.commit === "string" && /^[0-9a-f]{7,40}$/.test(entry.commit)) return { href: `${REPO_URL}/commit/${entry.commit}`, label: entry.commit.slice(0, 7) };
  return null;
}
