export const MINT_STATES = ["minted", "pending", "draft", "unminted"] as const;
export type MintState = (typeof MINT_STATES)[number];

export const BRANCHES = ["mathematics", "physics", "chemistry", "information", "biophysics", "cosmology", "mind", "bucketmath", "applied"] as const;
export type AtlasBranch = (typeof BRANCHES)[number];

export const MINT_HINT: Record<MintState, string> = {
  minted: "proved and machine-checked",
  pending: "partly formalized",
  draft: "statement formalized, proof open",
  unminted: "no formal statement yet",
};

export interface AtlasProduction {
  id: string;
  kind: "production";
  title: string;
  claim: string;
  branch: AtlasBranch;
  level: number;
  formal: "proved" | "partial" | "statement" | "none";
  mint_state: MintState;
  mint_basis: "formal proof status";
  formal_source: { label: string; url?: string } | null;
  posed: number;
  resolved: number | null;
  markets: string[];
  tokens: string[];
  solvability: number;
  theta: number;
  community: number;
  betweenness: number;
  pagerank: number;
  sources: { label: string; url?: string }[];
  source_kind: "problem" | "lean";
}

export interface AtlasSummary {
  nodes: number;
  edges: number;
  k: number;
  components: number;
  density: number;
  avg_clustering: number;
  communities: number;
  modularity: number;
  branch_assortativity: number;
  solvability_neighbor_corr: number;
  solvability_neighbor_corr_perm_p: number;
  spearman_level_vs_solvability: number;
  spearman_markets_vs_level: number;
  top_bridges_betweenness: [string, number][];
}

export interface SolvabilityAtlasData {
  producer: string;
  generator: string;
  productions: AtlasProduction[];
  summary: AtlasSummary;
  plots: { src: string; title: string; caption: string }[];
}

export interface AtlasFilter {
  source: AtlasProduction["source_kind"];
  branch: AtlasBranch | "";
  mint: MintState | "";
}

export function filterProductions(rows: AtlasProduction[], f: AtlasFilter): AtlasProduction[] {
  return rows
    .filter((p) => p.source_kind === f.source && (!f.branch || p.branch === f.branch) && (!f.mint || p.mint_state === f.mint))
    .sort((a, b) => b.level - a.level || a.solvability - b.solvability || a.title.localeCompare(b.title));
}

export function mintCounts(rows: AtlasProduction[]): Record<MintState, number> {
  const out = { minted: 0, pending: 0, draft: 0, unminted: 0 };
  for (const p of rows) out[p.mint_state] += 1;
  return out;
}

export function dialPoint(theta: number, solvability: number, size = 44): { x: number; y: number } {
  const c = size / 2;
  const r = size * (0.14 + 0.27 * solvability);
  return { x: c + r * Math.cos(theta), y: c - r * Math.sin(theta) };
}
