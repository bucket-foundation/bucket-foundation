import { MAKERS, hashString, seededRng, type Rng } from "./generate";
import { cardKey, compoundFactId, factId, factIdOfSource, makeFact, type Fact } from "./fact";
import { checkLimits, parityOk, shortTitle } from "./limits";
import { FORM_LIMIT_SEC, MIN_ORDER_FACTS, type Depth, type Form } from "./space";
import type { PrFact, QuizQuestion, QuizType, WorkSources } from "./types";

export interface SampledQuestion extends QuizQuestion {
  form: Form;
  depth: Depth;
  factIds: string[];
  cardKey: string;
}

export type FormMaker = (src: WorkSources, rng: Rng, depth: Depth) => SampledQuestion | null;

export const ESTIMATE_LOG10: Readonly<Record<Depth, number>> = { 1: 0.3, 2: 0.2, 3: 0.1 };
export const ORDER_CHOICES: Readonly<Record<Depth, number>> = { 1: 2, 2: 3, 3: 4 };
export const ORDER_TITLE_TOKENS = 3;
export const ORDER_LABELS = ["A", "B", "C"] as const;

export function sampledId(form: Form, factIds: readonly string[], depth: Depth): string {
  return `${form}-${hashString(`${factIds.join(",")}|${form}|${depth}`).toString(36)}`;
}

function stamp(q: QuizQuestion, form: Form, depth: Depth, factIds: string[]): SampledQuestion | null {
  if (factIds.length === 0) return null;
  const out: SampledQuestion = { ...q, id: sampledId(form, factIds, depth), form, depth, factIds, cardKey: cardKey(compoundFactId(factIds), form), limitSec: FORM_LIMIT_SEC[form] };
  return checkLimits(out).length === 0 ? out : null;
}

function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}

function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function wrap(type: QuizType, form: Form): FormMaker {
  return (src, rng, depth) => {
    const q = MAKERS[type](src, rng);
    return q ? stamp(q, form, depth, q.sources.map(factIdOfSource)) : null;
  };
}

interface Count {
  fact: Fact;
  prompt: string;
  count: number;
}

export function counts(src: WorkSources): Count[] {
  const out: Count[] = [];
  for (const status of Array.from(new Set(src.beads.map((b) => b.status)))) {
    const n = src.beads.filter((b) => b.status === status).length;
    out.push({ fact: makeFact("count", `beads-status-${status}`, { count: n }), prompt: `How many of your tasks are ${status.replace(/_/g, " ")}?`, count: n });
  }
  for (const m of Array.from(new Set(src.prs.map((p) => p.date.slice(0, 7))))) {
    const n = src.prs.filter((p) => p.date.slice(0, 7) === m).length;
    out.push({ fact: makeFact("count", `prs-month-${m}`, { count: n }), prompt: `How many changes merged during ${m}?`, count: n });
  }
  return out.filter((c) => c.count >= 3);
}

const estimate: FormMaker = (src, rng, depth) => {
  const pool = counts(src);
  if (pool.length === 0) return null;
  const c = pick(rng, pool);
  const factor = Math.round(10 ** ESTIMATE_LOG10[depth] * 100 - 100);
  return stamp(
    {
      id: "",
      type: "estimate",
      prompt: c.prompt,
      lines: [`Within ${factor} percent counts.`],
      choices: null,
      answer: String(c.count),
      tolerance: 0,
      log10Tolerance: ESTIMATE_LOG10[depth],
      limitSec: 0,
      explain: `The count is ${c.count}.`,
      sources: [],
    },
    "estimate",
    depth,
    [c.fact.id],
  );
};

function permutations(xs: string[]): string[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

const order: FormMaker = (src, rng, depth) => {
  const prs = src.prs;
  if (prs.length < MIN_ORDER_FACTS) return null;
  const picked: { pr: PrFact; short: string }[] = [];
  for (const pr of shuffle(rng, prs)) {
    if (picked.length === MIN_ORDER_FACTS) break;
    const short = shortTitle(pr.title, ORDER_TITLE_TOKENS);
    if (!short || picked.some((p) => p.short === short || p.pr.order === pr.order)) continue;
    picked.push({ pr, short });
  }
  if (picked.length < MIN_ORDER_FACTS || !parityOk(picked.map((p) => p.short))) return null;
  const labelled = picked.map((p, i) => ({ ...p, label: ORDER_LABELS[i] }));
  const answer = [...labelled].sort((a, b) => a.pr.order - b.pr.order).map((p) => p.label).join("");
  const wrong = shuffle(rng, permutations([...ORDER_LABELS]).map((p) => p.join("")).filter((p) => p !== answer));
  const choices = shuffle(rng, [answer, ...wrong.slice(0, ORDER_CHOICES[depth] - 1)]);
  const oldest = labelled.find((p) => p.label === answer[0])!;
  return stamp(
    {
      id: "",
      type: "which_first",
      prompt: "Oldest first?",
      lines: labelled.map((p) => `${p.label} ${p.short}`),
      choices,
      answer,
      tolerance: 0,
      limitSec: 0,
      explain: `${oldest.label} merged first, on ${oldest.pr.date}.`,
      sources: [{ kind: "pr", ref: `#${oldest.pr.number}`, label: `Change #${oldest.pr.number}`, href: src.repoUrl ? `${src.repoUrl}/pull/${oldest.pr.number}` : null }],
    },
    "order",
    depth,
    labelled.map((p) => factId("pr", String(p.pr.number))),
  );
};

export const FORM_MAKERS: Readonly<Partial<Record<Form, FormMaker>>> = {
  cloze: wrap("recall", "cloze"),
  spot_error: wrap("spot_error", "spot_error"),
  true_false: wrap("true_false", "true_false"),
  estimate,
  compare: wrap("which_first", "compare"),
  order,
};

export function makeForm(form: Form, src: WorkSources, seed: string, depth: Depth): SampledQuestion | null {
  const maker = FORM_MAKERS[form];
  return maker ? maker(src, seededRng(seed), depth) : null;
}
