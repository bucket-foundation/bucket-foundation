import type { MapModel } from "../../../../src/lib/explore/map";
import type { Hit } from "../../../../src/lib/explore/search";
import { hitColor } from "../../../../src/lib/explore/modes/globe";
import { linksFromHits, type SceneLayout, type SceneNode } from "../../../../src/lib/explore/modes/types";

export function hasMapAxes(model: MapModel | null | undefined): model is MapModel {
  return !!model && Array.isArray(model.axes) && model.axes.length > 0
    && model.axes.every((axis) => axis && typeof axis.label === "string" && Number.isFinite(axis.angle)
      && Array.isArray(axis.terms) && axis.terms.every((term) => typeof term === "string"))
    && Array.isArray(model.advisors);
}

export function sourceMap(hits: Hit[]): SceneLayout {
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const unique = new Map<string, Hit>();
  for (const hit of [...hits].sort((a, b) => compare(a.id, b.id) || compare(JSON.stringify(a), JSON.stringify(b)))) {
    if (!unique.has(hit.id)) unique.set(hit.id, hit);
  }
  const groups = new Map<string, Hit[]>();
  for (const hit of unique.values()) {
    const branch = hit.branch?.trim() || "Unassigned";
    groups.set(branch, [...(groups.get(branch) ?? []), hit]);
  }
  const ordered = [...groups].sort(([a], [b]) => compare(a, b));
  const nodes: SceneNode[] = [];
  const guides: SceneLayout["guides"] = [];
  const legend: SceneLayout["legend"] = [];
  ordered.forEach(([branch, sources], group) => {
    const angle = (group + 0.5) * Math.PI * 2 / ordered.length;
    const color = hitColor(sources[0]);
    guides.push({ kind: "text", text: branch, position: [1.8 * Math.cos(angle), 1.8 * Math.sin(angle), 0], color });
    legend.push({ label: branch, color });
    sources.forEach((hit, index) => {
      const theta = (group + 0.1 + 0.8 * (index + 0.5) / sources.length) * Math.PI * 2 / ordered.length;
      nodes.push({ id: hit.id, position: [1.35 * Math.cos(theta), 1.35 * Math.sin(theta), 0], color: hitColor(hit), size: 0.035, label: hit.title });
    });
  });
  return { nodes, links: linksFromHits([...unique.values()], new Set(unique.keys())).filter((link) => link.from !== link.to), guides, legend, camera: [0, 0, 5.8], wheel: "zoom" };
}
