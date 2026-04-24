export type FeedEventType =
  | "add_paper"
  | "add_figure"
  | "add_branch"
  | "add_canon_entry"
  | "add_landscape"
  | "update_dossier"
  | "promote"
  | "demote"
  | "retract";

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  branch: string | null;
  topic: string | null;
  title: string;
  path: string;
  doi: string | null;
  author_github: string;
  author_name: string | null;
  commit_sha: string;
  pr_number: number | null;
  timestamp: string;
}

export interface Feed {
  schema_version: string;
  generated: string;
  total_events: number;
  events: FeedEvent[];
}

export const REPO_SLUG = "bucket-foundation/bucket-foundation";

export function commitUrl(e: FeedEvent): string {
  return `https://github.com/${REPO_SLUG}/blob/${e.commit_sha}/${e.path}`;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const sec = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(d / 365);
  return `${yr}y ago`;
}

export function dayKey(iso: string): string {
  // YYYY-MM-DD in UTC
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toISOString().slice(0, 10);
}

export function formatDayHeader(dayIso: string): string {
  if (dayIso === "unknown") return "unknown date";
  const d = new Date(dayIso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const TYPE_LABEL: Record<FeedEventType, string> = {
  add_paper: "paper",
  add_figure: "figure",
  add_branch: "branch",
  add_canon_entry: "canon",
  add_landscape: "landscape",
  update_dossier: "dossier",
  promote: "promoted",
  demote: "demoted",
  retract: "retracted",
};

export const TYPE_GLYPH: Record<FeedEventType, string> = {
  add_paper: "§",
  add_figure: "✦",
  add_branch: "¶",
  add_canon_entry: "◆",
  add_landscape: "◇",
  update_dossier: "↻",
  promote: "▲",
  demote: "▽",
  retract: "×",
};
