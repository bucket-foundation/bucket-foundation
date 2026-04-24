import feedData from "../../../feed.json";
import type { Feed, FeedEvent } from "../whats-new/types";

export function getFeed(): Feed {
  return feedData as Feed;
}

export function getAllEvents(): FeedEvent[] {
  return [...getFeed().events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface ContributorStats {
  handle: string;
  name: string | null;
  events: FeedEvent[];
  eventCount: number;
  canonEvents: number;
  landscapeEvents: number;
  figures: number;
  branches: string[];
  firstContribution: string | null;
  lastContribution: string | null;
}

export function computeStats(handle: string, all: FeedEvent[]): ContributorStats | null {
  const events = all.filter((e) => e.author_github === handle);
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const branches = Array.from(
    new Set(sorted.map((e) => e.branch).filter((b): b is string => !!b)),
  ).sort();

  const canonTypes = new Set([
    "add_paper",
    "add_canon_entry",
    "add_branch",
    "update_dossier",
    "promote",
  ]);
  const landscapeTypes = new Set(["add_landscape", "demote"]);

  return {
    handle,
    name: sorted.find((e) => !!e.author_name)?.author_name ?? null,
    events: [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
    eventCount: events.length,
    canonEvents: events.filter((e) => canonTypes.has(e.type)).length,
    landscapeEvents: events.filter((e) => landscapeTypes.has(e.type)).length,
    figures: events.filter((e) => e.type === "add_figure").length,
    branches,
    firstContribution: sorted[0]?.timestamp ?? null,
    lastContribution: sorted[sorted.length - 1]?.timestamp ?? null,
  };
}

export function getAllHandles(): string[] {
  const s = new Set<string>();
  for (const e of getAllEvents()) s.add(e.author_github);
  return Array.from(s).sort();
}
