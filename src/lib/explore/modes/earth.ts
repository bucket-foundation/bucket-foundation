import worldData from "../../../data/world-indicators.json";
import blueZonesData from "../../../data/blue-zones.json";
import { BRANCH_COLOR, BRANCH_ORDER, bareBranch, globeProjection } from "../../../components/canon-globe/projections";
import { ALL_EVENTS, matchExcerptEvent, type TimelineEvent } from "../../canon-explorer/markers";
import type { Hit } from "../search";
import { ADVISOR_COLOR, GLOBE_RADIUS, WORK_COLOR, excerptConcept, hitColor } from "./globe";
import { linksFromHits, type ExploreMode, type SceneNode, type Vec3 } from "./types";

export const LAND_COLOR = "#7FA893";
export const LAND_STEP_DEG = 3;
export const LAND_RADIUS = 1.002;

export interface Place {
  lat: number;
  lng: number;
  name: string;
}

interface Named {
  title: string;
  lat: number;
  lng: number;
}

const COUNTRIES = (worldData as unknown as { countries: Named[] }).countries;
const BLUE_ZONES = (blueZonesData as unknown as { zones: Named[] }).zones;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function namedPlaces(list: Named[], parts: (title: string) => string[]): { re: RegExp; place: Place }[] {
  return list.flatMap((c) =>
    parts(c.title)
      .filter((p) => p.length >= 4)
      .map((p) => ({ re: new RegExp(`\\b${escapeRegExp(p)}\\b`), place: { lat: c.lat, lng: c.lng, name: p } })),
  );
}

export const NAMED_PLACES = [
  ...namedPlaces(BLUE_ZONES, (t) => t.split(/[,/]/).map((x) => x.trim())),
  ...namedPlaces(COUNTRIES, (t) => [t]),
];

export function placeOf(h: Hit, events: TimelineEvent[] = ALL_EVENTS, named = NAMED_PLACES): Place | null {
  if (h.type === "excerpt") {
    const match = matchExcerptEvent({ title: h.title, concept: excerptConcept(h), branch: h.branch }, events);
    if (match) return { lat: match.lat, lng: match.lng, name: match.title };
  }
  const text = `${h.title} ${h.subtitle} ${h.text}`;
  const found = named.find((n) => n.re.test(text));
  return found ? found.place : null;
}

export interface LandSource {
  isLand(lat: number, lng: number): boolean;
}

export function onLand(place: Place, land: LandSource | null | undefined): boolean {
  return !land || land.isLand(place.lat, place.lng);
}

export function landPoints(land: LandSource, step = LAND_STEP_DEG): Vec3[] {
  const out: Vec3[] = [];
  for (let lat = -84 + step / 2; lat < 90; lat += step) {
    const lngStep = step / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (let lng = -180 + lngStep / 2; lng < 180; lng += lngStep) {
      if (land.isLand(lat, lng)) out.push(globeProjection.position({ id: "land", lat, lng, branch: "earth" }, { radius: LAND_RADIUS, theta: () => 0 }));
    }
  }
  return out;
}

export const earthMode: ExploreMode = {
  id: "earth",
  label: "Earth",
  layout(hits, ctx) {
    const placed = hits.flatMap((h) => {
      const place = placeOf(h);
      return place && onLand(place, ctx.landmask) ? [{ h, place }] : [];
    });
    const spread = new Map<string, number>();
    const nodes: SceneNode[] = placed.map(({ h, place }) => {
      const key = `${place.lat},${place.lng}`;
      const k = spread.get(key) ?? 0;
      spread.set(key, k + 1);
      const a = k * 2.4;
      const jitter = k === 0 ? 0 : 1.2 * Math.sqrt(k);
      const lat = Math.max(-89, Math.min(89, place.lat + jitter * Math.sin(a)));
      const lng = place.lng + jitter * Math.cos(a);
      return {
        id: h.id,
        position: globeProjection.position({ id: h.id, lat, lng, branch: h.branch }, { radius: GLOBE_RADIUS, theta: () => 0 }),
        color: hitColor(h),
        size: 0.018 + 0.03 * h.score,
        label: `${h.title} · ${place.name}`,
      };
    });
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: linksFromHits(hits, ids),
      guides: [
        { kind: "sphere", radius: 1, color: "#1E2A25", opacity: 0.6 },
        ...(ctx.landmask ? [{ kind: "points" as const, points: landPoints(ctx.landmask), color: LAND_COLOR, size: 0.022 }] : []),
      ],
      legend: [
        { label: "land", color: LAND_COLOR },
        ...BRANCH_ORDER.filter((b) => placed.some(({ h }) => h.type === "excerpt" && bareBranch(h.branch) === b)).map((b) => ({ label: b, color: BRANCH_COLOR[b] })),
        ...(placed.some(({ h }) => h.type === "advisor") ? [{ label: "advisor", color: ADVISOR_COLOR }] : []),
        ...(placed.some(({ h }) => h.type === "work") ? [{ label: "work", color: WORK_COLOR }] : []),
      ],
      camera: globeProjection.camera,
      spin: 0.06,
    };
  },
};
