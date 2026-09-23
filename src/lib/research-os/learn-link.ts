import { masteryFromStability, retrievability, type StoredCard } from "../academy/mastery";

export interface LearnTarget {
  branchFile: string;
  atomId: string | null;
  href: string;
}

export const ACADEMY_BRANCH_FILES = [
  "00-learning-to-learn",
  "01-mathematics",
  "02-physics",
  "03-chemistry",
  "04-information",
  "06-cosmology",
  "07-mind",
] as const;

export function academyHref(branchFile: string, atomId: string | null): string {
  const base = `/research-os/learn/${encodeURIComponent(branchFile)}`;
  return atomId ? `${base}/${encodeURIComponent(atomId)}` : base;
}

export function learnTargetFor(node: { branch?: string; provenance?: Record<string, unknown> | null }): LearnTarget | null {
  const p = node.provenance ?? {};
  const branch = node.branch ?? "";
  if (p.type === "academy_atom" && typeof p.atom_id === "string") {
    const source = typeof p.source === "string" ? p.source : "";
    const stem = source.split("/").pop()?.replace(/\.json$/, "") || (typeof p.branch === "string" ? p.branch : branch);
    return { branchFile: stem, atomId: p.atom_id, href: academyHref(stem, p.atom_id) };
  }
  if (branch === "05-biophysics") return { branchFile: "biophysics", atomId: null, href: academyHref("biophysics", null) };
  if ((ACADEMY_BRANCH_FILES as readonly string[]).includes(branch)) {
    return { branchFile: branch, atomId: null, href: academyHref(branch, null) };
  }
  return null;
}

export interface RecallSummary {
  retrievability: number | null;
  mastery: number | null;
  dueInDays: number | null;
  seen: boolean;
}

export function recallFor(branchData: unknown, atomId: string, now: number = Date.now()): RecallSummary {
  const cards = (branchData as { cards?: Record<string, StoredCard> } | null)?.cards;
  const card = cards?.[atomId];
  if (!card) return { retrievability: null, mastery: null, dueInDays: null, seen: false };
  const stability = typeof card.stability === "number" ? card.stability : null;
  const last = typeof card.lastReview === "number" ? card.lastReview : null;
  const tDays = last === null ? 0 : Math.max(0, (now - last) / 86400000);
  const r = stability === null ? null : retrievability(tDays, stability);
  const due = typeof card.due === "number" ? (card.due - now) / 86400000 : null;
  return { retrievability: r, mastery: stability === null ? null : masteryFromStability(stability), dueInDays: due, seen: true };
}
