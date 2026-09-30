export const EDGE_KINDS = ["cites", "shares-token", "advises", "same-branch", "locus-of", "bonds", "residue"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export interface Edge {
  to: string;
  kind: EdgeKind;
  reason: string;
  weight: number;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export interface StageProfile {
  kicker: string;
  date: string | null;
  title: string;
  figure: string | null;
  caption: string | null;
  body: string;
  links: ProfileLink[];
  scores: Record<string, number>;
  sizeMetres: number | null;
}

export interface StageRecord {
  id: string;
  type: string;
  theta: number;
  r: number;
  t: number | null;
  profile: StageProfile;
  links: Edge[];
}

export function isEdge(v: unknown): v is Edge {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.to === "string" && (EDGE_KINDS as readonly string[]).includes(e.kind as string) && typeof e.reason === "string" && typeof e.weight === "number" && Number.isFinite(e.weight);
}
