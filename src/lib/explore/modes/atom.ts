import type { Hit } from "../search";
import elements from "../fixtures/elements.json";
import { hitColor } from "./globe";
import type { ExploreMode, Guide, SceneLayout, SceneLink, SceneNode, Vec3 } from "./types";

export interface Element {
  z: number;
  symbol: string;
  name: string;
  mass: number;
  shells: number[];
  config: string;
  color: string;
  group: number | null;
  period: number | null;
}

export const ELEMENTS = elements as Element[];
export const DEFAULT_Z = 6;
export const SHELL_COLOR = "#6B6252";
export const ELECTRON_COLOR = "#8FA3B8";

export function elementByZ(z: number | null | undefined): Element {
  return ELEMENTS.find((e) => e.z === z) ?? ELEMENTS[DEFAULT_Z - 1];
}

export function hitMentions(h: Hit, e: Element): boolean {
  const hay = `${h.title} ${h.text}`;
  if (new RegExp(`\\b${e.name}\\b`, "i").test(hay)) return true;
  return e.symbol.length > 1 && new RegExp(`(^|[^A-Za-z0-9])${e.symbol}([^A-Za-z0-9a-z]|$)`).test(hay);
}

export function shellRadius(i: number): number {
  return 0.55 + 0.32 * i;
}

export function atomLayout(hits: Hit[], z: number | null | undefined): SceneLayout {
  const el = elementByZ(z);
  const nodes: SceneNode[] = [];
  const links: SceneLink[] = [];
  const guides: Guide[] = [];
  const nucleusId = `element:${el.symbol}`;
  nodes.push({ id: nucleusId, position: [0, 0, 0], color: el.color, size: 0.18, label: `${el.name} ${el.symbol} · Z ${el.z} · ${el.config}` });
  el.shells.forEach((count, i) => {
    const r = shellRadius(i);
    guides.push({ kind: "ring", radius: r, color: SHELL_COLOR });
    guides.push({ kind: "text", position: [r, 0.06, 0], text: `n=${i + 1}`, color: "#B8AE94", size: 9 });
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + i * 0.4;
      nodes.push({ id: `electron:${el.symbol}:${i + 1}:${k}`, position: [r * Math.cos(a), 0, r * Math.sin(a)], color: ELECTRON_COLOR, size: 0.05 });
    }
  });
  const outer = shellRadius(el.shells.length - 1) + 0.6;
  const tagged = hits.filter((h) => hitMentions(h, el));
  tagged.forEach((h, i) => {
    const a = (i / Math.max(1, tagged.length)) * Math.PI * 2;
    nodes.push({ id: h.id, position: [outer * Math.cos(a), 0.2 * ((i % 3) - 1), outer * Math.sin(a)], color: hitColor(h), size: 0.07, label: h.title });
    links.push({ from: nucleusId, to: h.id, color: "#D9A43A" });
  });
  return {
    nodes,
    links,
    guides,
    legend: [
      { label: `${el.name} nucleus`, color: el.color },
      { label: "electron", color: ELECTRON_COLOR },
      { label: "hit that names the element", color: "#8E3E3E" },
    ],
    camera: [0, outer * 1.1, outer * 1.9] as Vec3,
    spin: 0.15,
    wheel: "zoom",
  };
}

export const atomMode: ExploreMode = {
  id: "atom",
  label: "Atom",
  layout: (hits, ctx) => atomLayout([...(ctx.extraHits ?? []), ...hits], ctx.element),
};
