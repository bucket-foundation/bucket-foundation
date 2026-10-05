export const FORMS = ["recall", "cloze", "true_false", "estimate", "compare", "order", "which_changed", "cause_effect", "spot_error", "meaning", "sound", "language", "pair"] as const;
export type Form = (typeof FORMS)[number];

export const LANGUAGE_FORMS = ["meaning", "sound", "language", "pair"] as const satisfies readonly Form[];
export type LanguageForm = (typeof LANGUAGE_FORMS)[number];

export const FORMATS = ["pick", "word", "number", "order"] as const;
export type Format = (typeof FORMATS)[number];

export const DEPTHS = [1, 2, 3] as const;
export type Depth = (typeof DEPTHS)[number];

export const VALID_PAIRS: Readonly<Record<Form, readonly Format[]>> = {
  recall: ["pick", "word"],
  cloze: ["pick", "word"],
  true_false: ["pick"],
  estimate: ["number"],
  compare: ["pick"],
  order: ["order"],
  which_changed: ["pick"],
  cause_effect: ["pick"],
  spot_error: ["pick"],
  meaning: ["pick"],
  sound: ["pick"],
  language: ["pick"],
  pair: ["pick"],
};

export const BLOCKED_FORMS: Readonly<Partial<Record<Form, string>>> = {
  which_changed: "needs a daily snapshot of bead and PR state",
};

export const FORM_LIMIT_SEC: Readonly<Record<Form, number>> = {
  recall: 30,
  cloze: 30,
  true_false: 20,
  estimate: 40,
  compare: 25,
  order: 40,
  which_changed: 25,
  cause_effect: 35,
  spot_error: 45,
  meaning: 20,
  sound: 25,
  language: 15,
  pair: 25,
};

export const MIN_ORDER_FACTS = 3;

export interface Cell {
  form: Form;
  format: Format;
  depth: Depth;
}

export function cellId(c: Cell): string {
  return `${c.form}/${c.format}/${c.depth}`;
}

export function validPair(form: Form, format: Format): boolean {
  return VALID_PAIRS[form].includes(format);
}

export function validPairs(): [Form, Format][] {
  return FORMS.flatMap((f) => VALID_PAIRS[f].map((fmt): [Form, Format] => [f, fmt]));
}

export function allCells(): Cell[] {
  return validPairs().flatMap(([form, format]) => DEPTHS.map((depth) => ({ form, format, depth })));
}

export interface SpaceFacts {
  counts: number;
  dated: number;
  datedByKind: Readonly<Record<string, number>>;
}

export function cellValid(c: Cell, s: SpaceFacts): boolean {
  if (!validPair(c.form, c.format)) return false;
  if (BLOCKED_FORMS[c.form]) return false;
  if (c.form === "estimate") return s.counts > 0;
  if (c.form === "order") return Object.values(s.datedByKind).some((n) => n >= MIN_ORDER_FACTS);
  if (c.form === "compare") return Object.values(s.datedByKind).some((n) => n >= 2);
  return true;
}

export function openCells(s: SpaceFacts): Cell[] {
  return allCells().filter((c) => cellValid(c, s));
}
