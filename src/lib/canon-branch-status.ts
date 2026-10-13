export const CANON_CITE_PRICE_USD = 0.002;
export const SITE_ORIGIN = "https://www.bucket.foundation";

export function branchStatus(input: { entries: number; figures: number; claims: number; fsStatus?: string | null }): string {
  if (input.entries + input.figures + input.claims === 0) return "open for submissions";
  return input.fsStatus || "in progress";
}

export function canonEntryUrl(branchSlug: string, bibkey: string): string {
  return `${SITE_ORIGIN}/canon/${branchSlug}#${bibkey}`;
}
