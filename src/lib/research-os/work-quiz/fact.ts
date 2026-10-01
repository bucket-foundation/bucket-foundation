import type { Form } from "./space";
import type { WorkSources } from "./types";

export const FACT_KINDS = ["pr", "bead", "note", "chat", "atom", "count"] as const;
export type FactKind = (typeof FACT_KINDS)[number];

export interface Fact {
  id: string;
  kind: FactKind;
  ref: string;
  fields: Readonly<Record<string, string | number>>;
}

export const CARD_KEY_SEPARATOR = "|";

export function factId(kind: FactKind, ref: string): string {
  return `${kind}:${ref}`;
}

export function makeFact(kind: FactKind, ref: string, fields: Record<string, string | number>): Fact {
  return { id: factId(kind, ref), kind, ref, fields };
}

export function cardKey(fact: Pick<Fact, "id"> | string, form: Form): string {
  const id = typeof fact === "string" ? fact : fact.id;
  if (!id || id.includes(CARD_KEY_SEPARATOR)) throw new Error(`a fact id cannot be empty or hold ${CARD_KEY_SEPARATOR}: ${id}`);
  return `${id}${CARD_KEY_SEPARATOR}${form}`;
}

export function parseCardKey(key: string): { factId: string; form: string } | null {
  const at = key.lastIndexOf(CARD_KEY_SEPARATOR);
  if (at <= 0 || at === key.length - 1) return null;
  return { factId: key.slice(0, at), form: key.slice(at + 1) };
}

export function factsFromSources(src: WorkSources): Fact[] {
  return [
    ...src.prs.map((p) => makeFact("pr", String(p.number), { title: p.title, date: p.date, order: p.order })),
    ...src.beads.map((b) => makeFact("bead", b.id, { title: b.title, status: b.status, priority: b.priority, date: b.createdAt })),
    ...src.notes.map((n) => makeFact("note", `${n.file}#${n.heading}`.replace(/\|/g, "/"), { title: n.heading, date: n.date })),
  ];
}
