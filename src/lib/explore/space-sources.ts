export const SPACE_SOURCES = ["canon", "advisors"] as const;
export type SpaceSource = (typeof SPACE_SOURCES)[number];

export function sourceFromParam(v: string | null): SpaceSource {
  return (SPACE_SOURCES as readonly string[]).includes(v ?? "") ? (v as SpaceSource) : "canon";
}
