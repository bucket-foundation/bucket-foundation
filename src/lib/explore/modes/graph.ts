import bridgeData from "../fixtures/bridges.json";
import { BRANCH_COLOR, BRANCH_ORDER, bareBranch } from "../../../components/canon-globe/projections";
import { tokens, type Hit } from "../search";
import { ADVISOR_COLOR, WORK_COLOR, excerptConcept, hitColor } from "./globe";
import { linksFromHits, type ExploreMode, type SceneLink, type SceneNode, type Vec3 } from "./types";

export interface BridgeRecord {
  id: string;
  title: string;
  tier: string;
  mass: number;
  branches: string[];
  members?: { branch: string; concept: string }[];
}

export const BRIDGES: BridgeRecord[] = [...(bridgeData.curated as BridgeRecord[]), ...(bridgeData.detected as BridgeRecord[])];
export const BRIDGE_COLOR = "#C9C1AA";
export const BRIDGE_LINK_COLOR = "#8C7B4F";
export const GRAPH_RADIUS = 1.6;
export const FORCE_STEPS = 220;

function hashUnit(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function excerptBranchConcept(h: Hit): { branch: string; concept: string } | null {
  if (h.type !== "excerpt") return null;
  return { branch: bareBranch(h.branch), concept: excerptConcept(h) };
}

export function bridgeMembers(bridge: BridgeRecord, hits: Hit[]): string[] {
  const ids: string[] = [];
  if (bridge.members) {
    const keys = new Set(bridge.members.map((m) => `${m.branch}/${m.concept}`));
    for (const h of hits) {
      const bc = excerptBranchConcept(h);
      if (bc && keys.has(`${bc.branch}/${bc.concept}`)) ids.push(h.id);
    }
    return ids;
  }
  const words = tokens(bridge.title);
  if (words.size === 0) return ids;
  const branches = new Set(bridge.branches);
  for (const h of hits) {
    if (h.type !== "excerpt" || !branches.has(bareBranch(h.branch))) continue;
    const hay = tokens(`${h.title} ${h.text} ${excerptConcept(h)}`);
    if (Array.from(words).some((w) => hay.has(w))) ids.push(h.id);
  }
  return ids;
}

export function bridgeLinks(hits: Hit[], bridges: BridgeRecord[] = BRIDGES): { bridges: BridgeRecord[]; links: SceneLink[] } {
  const used: BridgeRecord[] = [];
  const links: SceneLink[] = [];
  for (const b of bridges) {
    const members = bridgeMembers(b, hits);
    if (members.length < 2) continue;
    used.push(b);
    for (const id of members) links.push({ from: b.id, to: id, color: BRIDGE_LINK_COLOR });
  }
  return { bridges: used, links };
}

export function forceLayout(ids: string[], edges: [string, string][], steps = FORCE_STEPS, radius = GRAPH_RADIUS): Map<string, Vec3> {
  const n = ids.length;
  const pos = ids.map((id) => {
    const u = hashUnit(id, 1) * 2 - 1;
    const t = hashUnit(id, 2) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    return [radius * r * Math.cos(t), radius * u, radius * r * Math.sin(t)] as Vec3;
  });
  if (n < 2) return new Map(ids.map((id, i) => [id, pos[i]]));
  const index = new Map(ids.map((id, i) => [id, i]));
  const pairs = edges.flatMap(([a, b]) => {
    const i = index.get(a);
    const j = index.get(b);
    return i === undefined || j === undefined || i === j ? [] : [[i, j] as [number, number]];
  });
  const rest = radius * 0.55;
  for (let step = 0; step < steps; step++) {
    const cool = 1 - step / steps;
    const force: Vec3[] = pos.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d: Vec3 = [pos[i][0] - pos[j][0], pos[i][1] - pos[j][1], pos[i][2] - pos[j][2]];
        const dist2 = Math.max(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 0.0025);
        const f = 0.02 / dist2;
        const dist = Math.sqrt(dist2);
        for (let k = 0; k < 3; k++) {
          const push = (d[k] / dist) * f;
          force[i][k] += push;
          force[j][k] -= push;
        }
      }
    }
    for (const [i, j] of pairs) {
      const d: Vec3 = [pos[j][0] - pos[i][0], pos[j][1] - pos[i][1], pos[j][2] - pos[i][2]];
      const dist = Math.max(Math.hypot(...d), 1e-6);
      const f = 0.08 * (dist - rest);
      for (let k = 0; k < 3; k++) {
        const pull = (d[k] / dist) * f;
        force[i][k] += pull;
        force[j][k] -= pull;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        force[i][k] -= 0.05 * pos[i][k];
        pos[i][k] += Math.max(-0.2, Math.min(0.2, force[i][k])) * cool;
      }
    }
  }
  return new Map(ids.map((id, i) => [id, pos[i]]));
}

export const graphMode: ExploreMode = {
  id: "graph",
  label: "Graph",
  layout(hits) {
    const bridged = bridgeLinks(hits);
    const hitIds = new Set(hits.map((h) => h.id));
    const hitLinks = linksFromHits(hits, hitIds);
    const links = [...hitLinks, ...bridged.links];
    const ids = [...hits.map((h) => h.id), ...bridged.bridges.map((b) => b.id)];
    const positions = forceLayout(
      ids,
      links.map((l) => [l.from, l.to]),
    );
    const nodes: SceneNode[] = [
      ...hits.map((h) => ({ id: h.id, position: positions.get(h.id)!, color: hitColor(h), size: 0.03 + 0.035 * h.score, label: h.title })),
      ...bridged.bridges.map((b) => ({ id: b.id, position: positions.get(b.id)!, color: BRIDGE_COLOR, size: 0.07, label: `Bridge: ${b.title}` })),
    ];
    return {
      nodes,
      links,
      guides: [],
      legend: [
        ...BRANCH_ORDER.filter((b) => hits.some((h) => h.type === "excerpt" && bareBranch(h.branch) === b)).map((b) => ({ label: b, color: BRANCH_COLOR[b] })),
        { label: "advisor", color: ADVISOR_COLOR },
        { label: "work", color: WORK_COLOR },
        { label: "canon bridge", color: BRIDGE_COLOR },
      ],
      camera: [0, 0, 5],
      spin: 0.05,
    };
  },
};
