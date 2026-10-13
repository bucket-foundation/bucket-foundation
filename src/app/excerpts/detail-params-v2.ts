import { getClaim, getClaimsByConcept, type ClaimCard } from "@/lib/canon-claims";

export function detailStaticParams(): { concept: string; slug: string }[] {
  const out: { concept: string; slug: string }[] = [];
  const seen = new Set<string>();
  for (const [concept, claims] of Object.entries(getClaimsByConcept())) {
    for (const c of claims) {
      const key = `${concept}/${c.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ concept, slug: c.slug });
    }
  }
  return out;
}

export function resolveDetail(concept: string, slug: string): ClaimCard | null {
  return getClaim(concept, slug);
}
