import type { Form } from "./space";
import type { QuizQuestion, QuizType, SourceRef, WorkSources } from "./types";

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

export const FACT_JOIN = "+";

export function compoundFactId(ids: readonly string[]): string {
  return ids.join(FACT_JOIN);
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

export const TYPE_FORM: Readonly<Record<QuizType, Form>> = {
  recall: "recall",
  true_false: "true_false",
  which_first: "compare",
  estimate: "estimate",
  spot_error: "spot_error",
};

export function factIdOfSource(ref: SourceRef): string {
  return ref.kind === "pr" ? factId("pr", ref.ref.replace(/^#/, "")) : factId(ref.kind, ref.ref.replace(/\|/g, "/"));
}

export interface CardFields {
  fact_id: string;
  form: Form;
  card_key: string;
}

export function cardFields(q: Pick<QuizQuestion, "id" | "type" | "sources"> & { form?: Form; factIds?: readonly string[] }): CardFields {
  const form = q.form ?? TYPE_FORM[q.type];
  const first = (q.factIds?.length ? compoundFactId(q.factIds) : null) ?? (q.sources[0] ? factIdOfSource(q.sources[0]) : factId("count", q.id.replace(/\|/g, "/")));
  return { fact_id: first, form, card_key: cardKey(first, form) };
}
