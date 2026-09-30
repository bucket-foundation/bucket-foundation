import embeddingsData from "../../data/canon-embeddings.json";
import sitesData from "../../data/canon-sites.json";
import timelineData from "../../data/canon-timeline.json";
import { buildThetaIndex, type ThetaSort } from "../../components/canon-globe/projections";
import type { CanonMarker } from "../../components/canon-globe/CanonMarkers";

export type TimelineEvent = { id: string; title: string; lat: number; lng: number; year: number; branch: string; kind: string };

export type SiteEntry = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  year: number;
  civilization?: string;
  lidar?: string;
  unesco?: string;
  wikipedia?: string;
  branch: string;
  kind: string;
};

export type ExplorerMarker = Pick<CanonMarker, "id" | "lat" | "lng" | "year" | "branch" | "title" | "kind" | "civilization" | "lidar" | "unesco" | "wikipedia">;

export const ALL_EVENTS: TimelineEvent[] = [...(timelineData.events as TimelineEvent[])].sort((a, b) => a.year - b.year);
export const ALL_SITES: SiteEntry[] = [...(sitesData.sites as SiteEntry[])].sort((a, b) => a.year - b.year);
export const MIN_YEAR = Math.min(timelineData.min_year as number, ...ALL_SITES.map((s) => s.year));
export const MAX_YEAR = Math.max(timelineData.max_year as number, ...ALL_SITES.map((s) => s.year));

export function eventsAsMarkers(events: TimelineEvent[]): ExplorerMarker[] {
  return events.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    year: e.year,
    branch: e.branch,
    title: e.title,
    kind: (e.kind === "figure-birth" || e.kind === "canon-entry" ? e.kind : "canon-entry") as CanonMarker["kind"],
  }));
}

export function sitesAsMarkers(sites: SiteEntry[]): ExplorerMarker[] {
  return sites.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    year: s.year,
    branch: s.branch,
    title: s.title,
    kind: "archaeological-site",
    civilization: s.civilization,
    lidar: s.lidar,
    unesco: s.unesco,
    wikipedia: s.wikipedia,
  }));
}

const EVENT_IDS = new Set(ALL_EVENTS.map((e) => e.id));

export const RANK_THETA: ReadonlyMap<string, number> = new Map((embeddingsData as { items: { id: string; theta: number }[] }).items.map((it) => [it.id, it.theta]));

export function embeddingId(m: Pick<ExplorerMarker, "id" | "kind">): string {
  return m.kind === "archaeological-site" && EVENT_IDS.has(m.id) ? `site:${m.id}` : m.id;
}

export const ALL_MARKERS: ExplorerMarker[] = [...eventsAsMarkers(ALL_EVENTS), ...sitesAsMarkers(ALL_SITES)];

const UNIVERSE = ALL_MARKERS.map((m) => ({ ...m, id: embeddingId(m) }));

export const THETA_INDEX: Record<ThetaSort, Map<string, number>> = {
  rank: buildThetaIndex(UNIVERSE, "rank", RANK_THETA),
  year: buildThetaIndex(UNIVERSE, "year", RANK_THETA),
  branch: buildThetaIndex(UNIVERSE, "branch", RANK_THETA),
};

export function thetaFor(sort: ThetaSort): (m: Pick<ExplorerMarker, "id" | "kind">) => number {
  const idx = THETA_INDEX[sort];
  return (m) => idx.get(embeddingId(m)) ?? 0;
}

export function markersAt(year: number, opts: { figures: boolean; sites: boolean; branch?: string | null }): ExplorerMarker[] {
  const out: ExplorerMarker[] = [];
  if (opts.figures) out.push(...eventsAsMarkers(ALL_EVENTS.filter((e) => e.year <= year)));
  if (opts.sites) out.push(...sitesAsMarkers(ALL_SITES.filter((s) => s.year <= year)));
  if (!opts.branch) return out;
  const want = opts.branch.replace(/^\d+-/, "");
  return out.filter((m) => m.branch.replace(/^\d+-/, "") === want);
}
