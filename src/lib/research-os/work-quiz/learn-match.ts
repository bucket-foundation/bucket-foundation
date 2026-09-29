import { academyHref } from "../learn-link";
import type { LearnLink, QuizQuestion } from "./types";

export interface LearnAtom {
  branchFile: string;
  id: string;
  title: string;
}

const STOP = new Set([
  "about", "after", "again", "before", "being", "every", "their", "there", "these", "those", "which", "while", "where", "without", "under", "until",
  "research", "bucket", "founder", "should", "would", "could", "route", "page", "pages", "table", "tables", "tests", "adds", "added", "into", "from",
  "shows", "first", "second", "third", "import", "importer", "review", "screen", "button", "label", "labels", "agent", "agents", "evolution",
]);

export const MIN_SHARED = 2;

export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function keyTerms(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.match(/[A-Za-z][A-Za-z]{4,}/g) ?? []) {
    const s = stem(m);
    if (!STOP.has(s) && !STOP.has(m.toLowerCase())) out.add(s);
  }
  return out;
}

export function matchLearnItem(text: string, atoms: readonly LearnAtom[]): LearnLink | null {
  const terms = keyTerms(text);
  if (terms.size === 0) return null;
  let best: { atom: LearnAtom; score: number; longest: number } | null = null;
  for (const atom of atoms) {
    const atomTerms = Array.from(keyTerms(atom.title));
    const shared = atomTerms.filter((t) => terms.has(t));
    if (shared.length < MIN_SHARED || shared.length * 2 <= atomTerms.length) continue;
    const longest = Math.max(...shared.map((t) => t.length));
    const score = shared.length * 10 + longest;
    if (!best || score > best.score || (score === best.score && atom.id < best.atom.id)) best = { atom, score, longest };
  }
  return best ? { href: academyHref(best.atom.branchFile, best.atom.id), title: best.atom.title } : null;
}

export function questionText(q: Pick<QuizQuestion, "sources" | "explain">): string {
  return [...q.sources.map((s) => s.label), q.explain].join(" ");
}
