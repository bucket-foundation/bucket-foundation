import { allBranchSlugs, loadCorpusForBranch } from "@/lib/academy/corpus";
import type { LearnAtom } from "./learn-match";

let cached: LearnAtom[] | null = null;

export function learnAtoms(): LearnAtom[] {
  if (cached) return cached;
  const out: LearnAtom[] = [];
  for (const slug of allBranchSlugs()) {
    const corpus = loadCorpusForBranch(slug);
    if (!corpus || (corpus.meta as { kind?: string } | undefined)?.kind === "language") continue;
    const branchFile = slug === "05-biophysics" ? "biophysics" : slug;
    for (const a of (corpus.atoms ?? []) as unknown as { id?: unknown; title?: unknown }[]) {
      if (typeof a.id === "string" && typeof a.title === "string") out.push({ branchFile, id: a.id, title: a.title });
    }
  }
  cached = out;
  return out;
}
