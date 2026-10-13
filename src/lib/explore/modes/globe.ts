import { BRANCH_COLOR, BRANCH_ORDER, bareBranch, branchIndex, globeProjection } from "../../../components/canon-globe/projections";
import { ALL_EVENTS, matchExcerptEvent, type TimelineEvent } from "../../canon-explorer/markers";
import type { Hit } from "../search";
import { linksFromHits, type ExploreMode, type SceneNode } from "./types";

export const GLOBE_RADIUS = 1.008;
export const ADVISOR_COLOR = "#EFE8D4";
export const WORK_COLOR = "#8A7A5A";
export const YOU_COLOR = "#F2C14E";
export const GLOBE_ADVISOR_COLOR = "#1F1C16";
export const GLOBE_STAGE = { background: "transparent", link: "#3A3529", hot: "#8A641A" } as const;
export const SOURCE_COLOR = { paper: "#6FA8DC", text: "#C98B5B", talk: "#A78BD6" } as const;

export function hitColor(h: Hit): string {
  if (h.type === "advisor") return ADVISOR_COLOR;
  if (h.type === "work") return WORK_COLOR;
  if (h.type === "you") return YOU_COLOR;
  if (h.type === "paper" || h.type === "text" || h.type === "talk") return SOURCE_COLOR[h.type];
  return BRANCH_COLOR[bareBranch(h.branch)] ?? "#D9A43A";
}

export function excerptConcept(h: Hit): string {
  return h.id.replace(/^excerpt:/, "").split("/")[1] ?? "";
}

export function hitLatLng(h: Hit, i: number, n: number, events: TimelineEvent[] = ALL_EVENTS): { lat: number; lng: number } {
  if (h.type === "excerpt") {
    const match = matchExcerptEvent({ title: h.title, concept: excerptConcept(h), branch: h.branch }, events);
    if (match) return { lat: match.lat, lng: match.lng };
  }
  const bands = BRANCH_ORDER.length + 1;
  const b = h.type === "advisor" ? bands - 1 : branchIndex(h.branch);
  const lat = 70 - (140 * (b + 0.5)) / bands;
  const lng = -180 + (360 * (i + 0.5)) / Math.max(1, n);
  return { lat, lng };
}

export const globeMode: ExploreMode = {
  id: "globe",
  label: "Globe",
  layout(hits) {
    const nodes: SceneNode[] = hits.map((h, i) => {
      const { lat, lng } = hitLatLng(h, i, hits.length);
      return {
        id: h.id,
        position: globeProjection.position({ id: h.id, lat, lng, branch: h.branch }, { radius: GLOBE_RADIUS, theta: () => 0 }),
        color: h.type === "advisor" ? GLOBE_ADVISOR_COLOR : hitColor(h),
        size: 0.018 + 0.03 * h.score,
        label: h.title,
      };
    });
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: linksFromHits(hits, ids),
      guides: [{ kind: "sphere", radius: 1, color: "#1F1C16", opacity: 0.08, wireframe: true }],
      legend: [
        ...BRANCH_ORDER.filter((b) => hits.some((h) => h.type === "excerpt" && bareBranch(h.branch) === b)).map((b) => ({ label: b, color: BRANCH_COLOR[b] })),
        { label: "advisor", color: GLOBE_ADVISOR_COLOR },
        { label: "work", color: WORK_COLOR },
      ],
      camera: globeProjection.camera,
      spin: 0.08,
      stage: GLOBE_STAGE,
    };
  },
};
