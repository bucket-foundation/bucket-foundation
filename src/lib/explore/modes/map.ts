import { axisAngles, nearestAdvisors, project, termVector, type MapModel } from "../map";
import { tokens, similarity, type Hit } from "../search";
import { ADVISOR_COLOR, YOU_COLOR, hitColor } from "./globe";
import type { ExploreMode, Guide, SceneLayout, SceneLink, SceneNode } from "./types";

export const MAP_RADIUS = 1.4;
export const AXIS_COLOR = "#6B6252";
export const LINK_COLOR = "#D9A43A";
export const YOU_ID = "you:self";
export const NEAR_EXCERPTS = 3;

const EMPTY: SceneLayout = { nodes: [], links: [], guides: [], legend: [{ label: "advisor", color: ADVISOR_COLOR }, { label: "position: term overlap with prime directions, not fit-me", color: AXIS_COLOR }], camera: [0, 0, 4.6], wheel: "zoom" };

export function nearestExcerpts(text: string, hits: Hit[], k = NEAR_EXCERPTS): Hit[] {
  const bag = tokens(text);
  return hits
    .filter((h) => h.type === "excerpt")
    .map((h) => ({ h, s: similarity(bag, tokens(`${h.title} ${h.text}`)) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || (x.h.id < y.h.id ? -1 : 1))
    .slice(0, k)
    .map((x) => x.h);
}

export function mapLayout(model: MapModel | null | undefined, hits: Hit[], youText: string | undefined): SceneLayout {
  if (!model || !model.axes.length) return EMPTY;
  const angles = axisAngles(model.axes);
  const at = (v: number[]): [number, number, number] => {
    const [x, y] = project(v, angles);
    return [x * MAP_RADIUS, y * MAP_RADIUS, 0];
  };
  const nodes: SceneNode[] = [];
  const links: SceneLink[] = [];
  const guides: Guide[] = [
    { kind: "ring", radius: MAP_RADIUS, color: AXIS_COLOR, tilt: 0 },
    { kind: "ring", radius: MAP_RADIUS / 2, color: AXIS_COLOR, tilt: 0 },
  ];
  model.axes.forEach((a, i) => {
    const r = MAP_RADIUS * 1.12;
    guides.push({ kind: "line", points: [[0, 0, 0], [MAP_RADIUS * Math.cos(angles[i]), MAP_RADIUS * Math.sin(angles[i]), 0]], color: AXIS_COLOR });
    guides.push({ kind: "text", position: [r * Math.cos(angles[i]), r * Math.sin(angles[i]), 0], text: a.label, color: "#B8AE94", size: 10 });
  });
  for (const a of model.advisors) nodes.push({ id: a.id, position: at(a.star), color: ADVISOR_COLOR, size: 0.04 + 0.04 * Math.max(0, Math.min(1, a.score)), label: `${a.name} · ${a.field}` });

  const legend = [{ label: "advisor", color: ADVISOR_COLOR }, { label: "position: term overlap with prime directions, not fit-me", color: AXIS_COLOR }];
  if (youText?.trim()) {
    const vec = termVector(youText, model.axes);
    nodes.push({ id: YOU_ID, position: at(vec), color: YOU_COLOR, size: 0.11, label: "You" });
    for (const a of nearestAdvisors(vec, model.advisors)) links.push({ from: YOU_ID, to: a.id, color: LINK_COLOR });
    for (const h of nearestExcerpts(youText, hits)) {
      nodes.push({ id: h.id, position: at(termVector(`${h.title} ${h.text}`, model.axes)), color: hitColor(h), size: 0.06, label: h.title });
      links.push({ from: YOU_ID, to: h.id, color: LINK_COLOR });
    }
    legend.push({ label: "you", color: YOU_COLOR }, { label: "nearest canon excerpt", color: hitColor({ type: "excerpt", branch: "05-biophysics" } as Hit) });
  }
  return { nodes, links, guides, legend, camera: [0, 0, 4.6], wheel: "zoom" };
}

export const mapMode: ExploreMode = {
  id: "map",
  label: "Map",
  layout(hits, ctx) {
    return mapLayout(ctx.map, hits, ctx.youText);
  },
};
