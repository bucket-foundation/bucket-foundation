export const LIMITS = {
  stem: 15,
  intentStem: 20,
  option: 5,
  choices: 3,
  why: 20,
  screen: 30,
  parityTokens: 1,
  parityShare: 0.3,
  formulaChars: 12,
  sources: 1,
  tokenChars: 40,
  screenChars: 280,
  whyChars: 160,
  unspacedCharsPerToken: 2,
} as const;

export const QUIZ_QUESTIONS = { min: 3, max: 5 } as const;

const UNITS = new Set([
  "percent", "%", "ms", "s", "sec", "secs", "second", "seconds", "min", "mins", "minute", "minutes", "h", "hr", "hrs", "hour", "hours",
  "day", "days", "week", "weeks", "month", "months", "year", "years", "bytes", "kb", "mb", "gb", "tb", "mm", "cm", "m", "km", "nm",
  "mg", "g", "kg", "hz", "khz", "mhz", "ghz", "ev", "kev", "mev", "k", "j", "kj", "w", "kw", "v", "usd", "x",
]);

const DROPPED = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "for", "from", "by", "with", "as", "per", "via", "about", "and", "or"]);

const COMMIT_PREFIX = /^(feat|fix|docs|chore|refactor|test|perf|build|ci|style|revert|release|ops)(\([^)]*\))?!?:\s*/i;
const PR_SUFFIX = /\s*\(#\d+\)\s*$/;
const NUMBER = /^[~<>≤≥±]?\$?\d[\d,.]*(e[+-]?\d+)?$/i;
const OPERATOR = /^[=+*/×<>≤≥^−]+$/;
const OPERAND = /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF_^().]+$/;
const SHORT_OPERAND = /^(\d[\d.]*|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF]{1,2})$/;

const SYMBOL_RANGES: readonly [number, number][] = [
  [0x00a0, 0x00bf],
  [0x00d7, 0x00d7],
  [0x00f7, 0x00f7],
  [0x2000, 0x206f],
  [0x2190, 0x22ff],
  [0x2500, 0x257f],
  [0x3000, 0x303f],
  [0xfe00, 0xfe0f],
  [0xff00, 0xff0f],
  [0xff1a, 0xff20],
];

const UNSPACED_RANGES: readonly [number, number][] = [
  [0x0e00, 0x0eff],
  [0x1000, 0x109f],
  [0x1780, 0x17ff],
  [0x3040, 0x30ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xf900, 0xfaff],
  [0xff66, 0xff9f],
];

const inRanges = (code: number, ranges: readonly [number, number][]) => ranges.some(([lo, hi]) => code >= lo && code <= hi);

function chunkWeight(chunk: string): number {
  if (/_{2,}/.test(chunk)) return 1;
  let unspaced = 0;
  let spaced = false;
  for (let i = 0; i < chunk.length; i++) {
    const code = chunk.charCodeAt(i);
    if (inRanges(code, UNSPACED_RANGES)) unspaced += 1;
    else if (code < 0x80 ? /[A-Za-z0-9]/.test(chunk[i]) : !inRanges(code, SYMBOL_RANGES)) spaced = true;
  }
  return Math.ceil(unspaced / LIMITS.unspacedCharsPerToken) + (spaced ? 1 : 0);
}

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
    } else if (chunkWeight(chunks[i]) === 0) {
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

export function tokenWeight(token: string): number {
  return Math.max(1, ...token.split(" ").map(chunkWeight));
}

export function countTokens(text: string): number {
  return tokenize(text).reduce((n, t) => n + tokenWeight(t), 0);
}

export function longestToken(text: string): number {
  return tokenize(text).reduce((n, t) => Math.max(n, t.length), 0);
}

export function shortTitle(title: string, cap: number): string {
  const kept: string[] = [];
  let used = 0;
  for (const t of tokenize(title.replace(PR_SUFFIX, "").replace(COMMIT_PREFIX, ""))) {
    if (DROPPED.has(bare(t).toLowerCase())) continue;
    used += tokenWeight(t);
    if (used > cap) break;
    if (t.length > LIMITS.tokenChars) return "";
    kept.push(t);
  }
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

export function checkLimits(q: Limited, o: { intent?: boolean } = {}): string[] {
  const found: string[] = [];
  const stem = stemTokens(q);
  const stemCap = o.intent ? LIMITS.intentStem : LIMITS.stem;
  if (stem > stemCap) found.push(`the stem has ${stem} tokens, the limit is ${stemCap}`);
  const choices = q.choices ?? [];
  if (o.intent && choices.length > 0) found.push("an intent question takes free text and has no options");
  if (choices.length > 0 && choices.length !== LIMITS.choices) found.push(`${choices.length} options, a choice question takes exactly ${LIMITS.choices}`);
  for (const c of choices) {
    const n = countTokens(c);
    if (n > LIMITS.option) found.push(`an option has ${n} tokens, the limit is ${LIMITS.option}`);
  }
  if (!parityOk(choices)) found.push(`the options differ by more than ${LIMITS.parityTokens} token or ${LIMITS.parityShare * 100} percent in length`);
  const why = countTokens(q.explain ?? "");
  if (why > LIMITS.why) found.push(`the why line has ${why} tokens, the limit is ${LIMITS.why}`);
  const screen = screenTokens(q);
  if (!o.intent && screen > LIMITS.screen) found.push(`${screen} tokens on screen before answering, the limit is ${LIMITS.screen}`);
  const shown = [q.prompt, ...(q.lines ?? []), ...choices];
  const longest = Math.max(0, ...[...shown, q.explain ?? ""].map(longestToken));
  if (longest > LIMITS.tokenChars) found.push(`a token has ${longest} characters, the limit is ${LIMITS.tokenChars}`);
  const chars = shown.reduce((n, t) => n + t.trim().length, 0);
  if (chars > LIMITS.screenChars) found.push(`${chars} characters on screen before answering, the limit is ${LIMITS.screenChars}`);
  const whyChars = (q.explain ?? "").trim().length;
  if (whyChars > LIMITS.whyChars) found.push(`the why line has ${whyChars} characters, the limit is ${LIMITS.whyChars}`);
  if ((q.sources ?? []).length > LIMITS.sources) found.push(`${(q.sources ?? []).length} sources, the limit is ${LIMITS.sources} link`);
  return found;
}

export function withinLimits(q: Limited): boolean {
  return checkLimits(q).length === 0;
}
