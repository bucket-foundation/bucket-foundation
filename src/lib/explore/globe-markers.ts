import type { CanonMarker } from "@/components/canon-globe/CanonMarkers";
import timelineData from "@/data/canon-timeline.json";
import sitesData from "@/data/canon-sites.json";
import type { Dataset } from "./space";

interface TimelineEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  year: number;
  branch: string;
  kind: string;
}

interface SiteEntry {
  id: string;
  title: string;
  lat: number;
  lng: number;
  year: number;
  branch: string;
  civilization?: string;
  lidar?: string;
  unesco?: string;
  wikipedia?: string;
}

export function eventMarker(e: TimelineEvent): CanonMarker {
  return { id: e.id, lat: e.lat, lng: e.lng, year: e.year, branch: e.branch, title: e.title, kind: e.kind === "figure-birth" || e.kind === "canon-entry" ? e.kind : "canon-entry" };
}

export function siteMarker(s: SiteEntry): CanonMarker {
  return { id: s.id, lat: s.lat, lng: s.lng, year: s.year, branch: s.branch, title: s.title, kind: "archaeological-site", civilization: s.civilization, lidar: s.lidar, unesco: s.unesco, wikipedia: s.wikipedia };
}

let cached: CanonMarker[] | null = null;

export function canonMarkers(): CanonMarker[] {
  if (!cached) {
    const events = (timelineData.events as TimelineEvent[]).map(eventMarker);
    const taken = new Set(events.map((e) => e.id));
    const sites = (sitesData.sites as SiteEntry[]).map((s) => siteMarker(s)).map((m) => (taken.has(m.id) ? { ...m, id: `site:${m.id}` } : m));
    cached = [...events, ...sites].sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (a.id < b.id ? -1 : 1));
  }
  return cached as CanonMarker[];
}

export function markerYears(markers: Pick<CanonMarker, "year">[]): number[] {
  return Array.from(new Set(markers.map((m) => m.year).filter((y): y is number => typeof y === "number" && Number.isFinite(y)))).sort((a, b) => a - b);
}

export function markersUpTo<T extends Pick<CanonMarker, "year">>(markers: T[], year: number): T[] {
  return markers.filter((m) => typeof m.year !== "number" || m.year <= year);
}

export function geoMarkersFor(ds: Pick<Dataset, "obs">, pool: CanonMarker[] = canonMarkers()): CanonMarker[] {
  const byId = new Map(pool.map((m) => [m.id, m]));
  const out: CanonMarker[] = [];
  for (const o of ds.obs) {
    const hit = byId.get(o.id) ?? byId.get(o.id.replace(/^site:/, ""));
    if (hit) {
      out.push(hit);
      continue;
    }
    const lat = o.meta.lat;
    const lng = o.meta.lng;
    if (typeof lat === "number" && typeof lng === "number") out.push({ id: o.id, lat, lng, year: typeof o.t === "number" ? o.t : undefined, branch: typeof o.meta.branch === "string" ? o.meta.branch : "", title: o.title, kind: "canon-entry" });
  }
  return out;
}

export function fmtYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}
