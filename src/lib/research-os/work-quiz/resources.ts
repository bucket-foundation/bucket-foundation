import { academyHref } from "../learn-link";
import { FACT_JOIN } from "./fact";
import type { LearnResource, QuizQuestion } from "./types";

export const LEARN_LABEL = "learn this";
export const EVIDENCE_ANCHOR = "evidence";

const WORK_URL: Readonly<Record<string, (id: string) => string>> = {
  d: (id) => `https://doi.org/${id}`,
  p: (id) => `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`,
  a: (id) => `https://arxiv.org/abs/${id}`,
  o: (id) => `https://openalex.org/${encodeURIComponent(id)}`,
};

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

function pair(ref: string): [string, string] | null {
  const at = ref.indexOf("/");
  if (at <= 0 || at === ref.length - 1) return null;
  return [ref.slice(0, at), ref.slice(at + 1)];
}

function resolveOne(id: string): LearnResource | null {
  const colon = id.indexOf(":");
  if (colon <= 0) return null;
  const kind = id.slice(0, colon);
  const parts = pair(id.slice(colon + 1));
  if (!parts) return null;
  const [head, tail] = parts;
  if (kind === "atom") {
    const deck = decode(head);
    const slug = decode(tail);
    return deck && slug ? { label: LEARN_LABEL, href: academyHref(deck, slug) } : null;
  }
  if (kind === "excerpt") {
    const concept = decode(head);
    const slug = decode(tail);
    return concept && slug ? { label: LEARN_LABEL, href: `/excerpts/${encodeURIComponent(concept)}/${encodeURIComponent(slug)}#${EVIDENCE_ANCHOR}` } : null;
  }
  if (kind === "work") {
    const upstream = decode(tail);
    const build = WORK_URL[head];
    return upstream && build ? { label: LEARN_LABEL, href: build(upstream) } : null;
  }
  return null;
}

export function resourceForFact(factId: string): LearnResource | null {
  for (const id of factId.split(FACT_JOIN)) {
    const hit = resolveOne(id);
    if (hit) return hit;
  }
  return null;
}

export function resourceForQuestion(q: Pick<QuizQuestion, "sources">): LearnResource | null {
  for (const s of q.sources) {
    const hit = resourceForFact(`${s.kind}:${s.ref}`);
    if (hit) return hit;
  }
  return null;
}
