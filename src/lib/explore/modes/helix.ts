import type { Hit } from "../search";
import { ADVISOR_COLOR, WORK_COLOR, hitColor } from "./globe";
import { linksFromHits, type ExploreMode, type Guide, type SceneNode, type Vec3 } from "./types";

export const HELIX_RADIUS = 0.8;
export const HELIX_STEP = 0.14;
export const HELIX_TWIST = 0.55;
export const STRAND_A = "#D9A43A";
export const STRAND_B = "#9FB7C9";

export function axisOrder(hits: Hit[]): Hit[] {
  return hits.slice().sort((a, b) => {
    const ya = a.year ?? Number.POSITIVE_INFINITY;
    const yb = b.year ?? Number.POSITIVE_INFINITY;
    if (ya !== yb) return ya - yb;
    return b.score - a.score || (a.id < b.id ? -1 : 1);
  });
}

export interface HelixFrame {
  offset: number;
  turn: number;
}

export function helixFrame(scroll: number): HelixFrame {
  return { offset: scroll * 0.004, turn: scroll * 0.003 };
}

export function helixPoint(slot: number, n: number, strand: 0 | 1, frame: HelixFrame, radius = HELIX_RADIUS): Vec3 {
  const y = (slot - (n - 1) / 2) * HELIX_STEP - frame.offset;
  const a = slot * HELIX_TWIST + frame.turn + strand * Math.PI;
  return [radius * Math.cos(a), y, radius * Math.sin(a)];
}

export function strandOf(h: Hit): 0 | 1 | null {
  if (h.type === "excerpt") return 0;
  if (h.type === "advisor") return 1;
  return null;
}

export function backbone(n: number, strand: 0 | 1, frame: HelixFrame, samples = 6): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= (n - 1) * samples; i++) pts.push(helixPoint(i / samples, n, strand, frame));
  return pts;
}

export function yearLabels(order: Hit[], frame: HelixFrame, every = 6): Guide[] {
  const n = order.length;
  const out: Guide[] = [];
  let last: number | null = null;
  order.forEach((h, slot) => {
    if (h.year === null || h.year === last || slot % every !== 0) return;
    last = h.year;
    const [, y] = helixPoint(slot, n, 0, frame);
    out.push({ kind: "text", position: [HELIX_RADIUS + 0.45, y, 0], text: h.year < 0 ? `${-h.year} BCE` : String(h.year), color: "#B8AE94", size: 10 });
  });
  return out;
}

export const helixMode: ExploreMode = {
  id: "helix",
  label: "Helix",
  layout(hits, ctx) {
    const frame = helixFrame(ctx.scroll);
    const order = axisOrder(hits);
    const n = Math.max(order.length, 2);
    const nodes: SceneNode[] = order.map((h, slot) => {
      const strand = strandOf(h);
      const position: Vec3 = strand === null ? helixPoint(slot, n, 0, frame, 0) : helixPoint(slot, n, strand, frame);
      return { id: h.id, position, color: hitColor(h), size: 0.03 + 0.03 * h.score, label: h.year === null ? h.title : `${h.title} · ${h.year}` };
    });
    const ids = new Set(nodes.map((x) => x.id));
    const pairs = linksFromHits(
      hits.filter((h) => h.type !== "work"),
      ids,
    );
    return {
      nodes,
      links: pairs,
      guides: [
        { kind: "tube", points: backbone(n, 0, frame), color: STRAND_A, radius: 0.012 },
        { kind: "tube", points: backbone(n, 1, frame), color: STRAND_B, radius: 0.012 },
        ...yearLabels(order, frame),
      ],
      legend: [
        { label: "excerpt strand", color: STRAND_A },
        { label: "advisor strand", color: STRAND_B },
        { label: "advisor", color: ADVISOR_COLOR },
        { label: "work on axis", color: WORK_COLOR },
      ],
      camera: [0, 0, 5.5],
      wheel: "scroll",
    };
  },
};
