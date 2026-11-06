import type { Params, ShareKind } from "./share";

export const SAMPLE_SHARES: Record<ShareKind, Params> = {
  w: { id: "water", g: "water", f: "ja:水|ar:ماء|hi:पानी|th:น้ำ|ta:தண்ணீர்|ko:물" },
  l: { l: "fr.it.ja", r: "es", s: "5" },
  d: { id: "lang-es", t: "Spanish in context: the first thousand words" },
  a: { d: "physics", id: "newton-2", t: "Newton's second law", b: "Classical mechanics", q: "Force equals mass times acceleration." },
  x: { t: "Listening drill", p: "18", m: "20", l: "es.fr", r: "en", s: "12" },
  c: { t: "Le Petit Prince, chapter one", b: "Reader", q: "Lorsque j'avais six ans j'ai vu, une fois, une magnifique image.", l: "fr", at: "125" },
  g: { c: "7K3M9QX2TZ", n: "The Dichio family", k: "family" },
  "": {},
};
