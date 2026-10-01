export const LIMITS = {
  stem: 15,
  intentStem: 20,
  option: 5,
  optionOfTwo: 10,
  maxOptions: 4,
  why: 20,
  screen: 35,
  parityTokens: 1,
  parityShare: 0.3,
  formulaChars: 12,
  sources: 1,
} as const;

const UNITS = new Set([
  "percent", "%", "ms", "s", "sec", "secs", "second", "seconds", "min", "mins", "minute", "minutes", "h", "hr", "hrs", "hour", "hours",
  "day", "days", "week", "weeks", "month", "months", "year", "years", "bytes", "kb", "mb", "gb", "tb", "mm", "cm", "m", "km", "nm",
  "mg", "g", "kg", "hz", "khz", "mhz", "ghz", "ev", "kev", "mev", "k", "j", "kj", "w", "kw", "v", "usd", "x",
]);

const DROPPED = new Set([
  "a", "an", "the",
  "of", "in", "on", "at", "to", "for", "from", "by", "with", "without", "into", "onto", "over", "under", "through", "across", "between",
  "among", "about", "after", "before", "during", "against", "per", "via", "as", "within", "beyond", "toward", "towards", "upon", "since", "until",
  "and", "or", "but", "nor", "while", "when", "where", "if", "because", "although", "whether", "that", "than",
]);

const COMMIT_PREFIX = /^(feat|fix|docs|chore|refactor|test|perf|build|ci|style|revert|release|ops)(\([^)]*\))?!?:\s*/i;
const PR_SUFFIX = /\s*\(#\d+\)\s*$/;
const WORDLIKE = /[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF]|_{2,}/;
const NUMBER = /^[~<>≤≥±]?\$?\d[\d,.]*(e[+-]?\d+)?$/i;
const OPERATOR = /^[=+*/×<>≤≥^−]+$/;
const OPERAND = /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF_^().]+$/;
const SHORT_OPERAND = /^(\d[\d.]*|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF]{1,2})$/;

const bare = (chunk: string) => chunk.replace(/^[("'“‘[]+|[)"'”’\],.;:!?]+$/g, "");

function isOperator(chunks: string[], i: number): boolean {
  if (OPERATOR.test(chunks[i])) return true;
  return chunks[i] === "-" && SHORT_OPERAND.test(bare(chunks[i - 1] ?? "")) && SHORT_OPERAND.test(bare(chunks[i + 1] ?? ""));
}

function formulaRun(chunks: string[], start: number): number {
  if (!OPERAND.test(bare(chunks[start]))) return 0;
  let end = start;
  while (end + 2 < chunks.length && isOperator(chunks, end + 1) && OPERAND.test(bare(chunks[end + 2]))) end += 2;
  return end === start ? 0 : end + 1 - start;
}

export function tokenize(text: string): string[] {
  const chunks = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < chunks.length) {
    const run = formulaRun(chunks, i);
    const formula = chunks.slice(i, i + run).join(" ");
    if (run > 0 && formula.length <= LIMITS.formulaChars) {
      out.push(formula);
      i += run;
    } else if (run > 0) {
      for (let k = i; k < i + run; k += 2) out.push(chunks[k]);
      i += run;
    } else if (!WORDLIKE.test(chunks[i])) {
      i += 1;
    } else if (NUMBER.test(bare(chunks[i])) && i + 1 < chunks.length && UNITS.has(bare(chunks[i + 1]).toLowerCase())) {
      out.push(`${chunks[i]} ${chunks[i + 1]}`);
      i += 2;
    } else {
      out.push(chunks[i]);
      i += 1;
    }
  }
  return out;
}

export function countTokens(text: string): number {
  return tokenize(text).length;
}

export function shortTitle(title: string, cap: number): string {
  const kept = tokenize(title.replace(PR_SUFFIX, "").replace(COMMIT_PREFIX, ""))
    .filter((t) => !DROPPED.has(bare(t).toLowerCase()))
    .slice(0, Math.max(0, cap));
  return kept.join(" ").replace(/[,;:.]+$/, "");
}

export function parityOk(options: readonly string[]): boolean {
  if (options.length < 2) return true;
  const tokens = options.map(countTokens);
  const chars = options.map((o) => o.trim().length);
  if (Math.max(...tokens) - Math.min(...tokens) > LIMITS.parityTokens) return false;
  return Math.min(...chars) >= Math.max(...chars) * (1 - LIMITS.parityShare);
}

export interface Limited {
  prompt: string;
  lines?: readonly string[];
  choices?: readonly string[] | null;
  explain?: string;
  sources?: readonly unknown[];
}

export function stemTokens(q: Pick<Limited, "prompt" | "lines">): number {
  return countTokens(q.prompt) + (q.lines ?? []).reduce((n, l) => n + countTokens(l), 0);
}

export function screenTokens(q: Pick<Limited, "prompt" | "lines" | "choices">): number {
  return stemTokens(q) + (q.choices ?? []).reduce((n, c) => n + countTokens(c), 0);
}

export function optionCap(count: number): number {
  return count === 2 ? LIMITS.optionOfTwo : LIMITS.option;
}

export function checkLimits(q: Limited, o: { intent?: boolean } = {}): string[] {
  const found: string[] = [];
  const stem = stemTokens(q);
  const stemCap = o.intent ? LIMITS.intentStem : LIMITS.stem;
  if (stem > stemCap) found.push(`the stem has ${stem} tokens, the limit is ${stemCap}`);
  const choices = q.choices ?? [];
  if (o.intent && choices.length > 0) found.push("an intent question takes free text and has no options");
  if (choices.length > LIMITS.maxOptions) found.push(`${choices.length} options, the limit is ${LIMITS.maxOptions}`);
  const cap = optionCap(choices.length);
  for (const c of choices) {
    const n = countTokens(c);
    if (n > cap) found.push(`an option has ${n} tokens, the limit is ${cap}`);
  }
  if (!parityOk(choices)) found.push(`the options differ by more than ${LIMITS.parityTokens} token or ${LIMITS.parityShare * 100} percent in length`);
  const why = countTokens(q.explain ?? "");
  if (why > LIMITS.why) found.push(`the why line has ${why} tokens, the limit is ${LIMITS.why}`);
  const screen = screenTokens(q);
  if (!o.intent && screen > LIMITS.screen) found.push(`${screen} tokens on screen before answering, the limit is ${LIMITS.screen}`);
  if ((q.sources ?? []).length > LIMITS.sources) found.push(`${(q.sources ?? []).length} sources, the limit is ${LIMITS.sources} link`);
  return found;
}

export function withinLimits(q: Limited): boolean {
  return checkLimits(q).length === 0;
}
