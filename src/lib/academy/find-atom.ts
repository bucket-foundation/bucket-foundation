import type { Atom } from "./engine";
import { allBranchSlugs, loadCorpusForBranch } from "./corpus";

export interface TutorAtom {
  atom: Atom;
  titleOf: (id: string) => string | null;
}

export function findTutorAtom(branch: string | null, atomId: string): TutorAtom | null {
  const all = allBranchSlugs();
  const slugs = branch ? [branch, ...all.filter((s) => s !== branch)] : all;
  for (const slug of slugs) {
    const atoms = (loadCorpusForBranch(slug)?.atoms || []) as unknown as Atom[];
    const atom = atoms.find((a) => a.id === atomId);
    if (!atom) continue;
    const titles = new Map(atoms.map((a) => [a.id, a.title]));
    return { atom, titleOf: (id) => titles.get(id) ?? null };
  }
  return null;
}
