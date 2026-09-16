/**
 * Research OS, Learn inside the workspace (ros-29). Pure: from a graph
 * node, the Academy lesson it comes from (nodes ingested by
 * src/lib/research-os/ingest/academy.ts carry provenance.type
 * "academy_atom", provenance.source "learning/app/corpus/<branch>.json",
 * provenance.atom_id) and the deep link that opens that lesson in the
 * Academy app. For any other node, the Academy branch that matches the
 * node's canon branch, when one exists.
 */
import { masteryFromStability, retrievability, type StoredCard } from "../academy/mastery";

export interface LearnTarget {
  /** Academy corpus file stem, e.g. "02-physics". */
  branchFile: string;
  /** Atom id inside that file; null when only the branch is known. */
  atomId: string | null;
  /** Route on this site that opens the lesson (or the branch). */
  href: string;
}

/** Canon branch slugs that have an Academy corpus file of the same stem. */
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
  const q = new URLSearchParams({ branch: branchFile });
  if (atomId) q.set("atom", atomId);
  return `/academy?${q.toString()}`;
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
  /** 0..1 probability of recall now, from FSRS stability; null when unseen. */
  retrievability: number | null;
  /** 0..1 mastery proxy from stability; null when unseen. */
  mastery: number | null;
  /** Days until the card is due; negative when overdue; null when unseen. */
  dueInDays: number | null;
  seen: boolean;
}

/**
 * Read one atom's card out of the Academy progress store's branch payload
 * (the engine state the app persists: {cards: {<atomId>: StoredCard}}).
 */
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
