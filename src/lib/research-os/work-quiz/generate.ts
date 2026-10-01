import { countTokens, parityOk, shortTitle, withinLimits } from "./limits";
import { QUIZ_TYPES, type BeadFact, type NoteFact, type PrFact, type QuizQuestion, type QuizType, type SourceRef, type WorkSources } from "./types";

export const LIMIT_SEC: Record<QuizType, number> = {
  recall: 30,
  true_false: 20,
  which_first: 25,
  estimate: 40,
  spot_error: 45,
};

export const ESTIMATE_TOLERANCE = 0.2;

export type Rng = () => number;

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seededRng(seed: string): Rng {
  let a = hashString(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function questionId(type: QuizType, key: string): string {
  return `${type}:${hashString(`${type}|${key}`).toString(36)}`;
}

export function prTitle(title: string): string {
  return title.replace(/\s*\(#\d+\)\s*$/, "").replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "").trim();
}

export const CLOZE_TITLE_TOKENS = 8;
export const STEM_TITLE_TOKENS = 6;
export const OPTION_TITLE_TOKENS = 5;
export const MIN_PAIR_TOKENS = 3;
export const PAIR_TRIES = 8;

function prRef(pr: PrFact, repoUrl: string | null): SourceRef {
  return { kind: "pr", ref: `#${pr.number}`, label: `PR #${pr.number}`, href: repoUrl ? `${repoUrl}/pull/${pr.number}` : null };
}

function beadRef(b: BeadFact): SourceRef {
  return { kind: "bead", ref: b.id, label: `bead ${b.id}`, href: null };
}

function noteRef(n: NoteFact): SourceRef {
  return { kind: "note", ref: `${n.file}#${n.heading}`, label: n.file.split("/").pop() ?? n.file, href: null };
}

export function shortPair(a: string, b: string, cap = OPTION_TITLE_TOKENS): [string, string] | null {
  for (let n = cap; n >= MIN_PAIR_TOKENS; n--) {
    const x = shortTitle(a, n);
    const y = shortTitle(b, n);
    if (x && y && x !== y && parityOk([x, y])) return [x, y];
  }
  return null;
}

const STOP = new Set(["about", "after", "again", "every", "their", "there", "these", "those", "which", "while", "where", "with", "without", "under", "until", "before", "being"]);

export function clozeWords(title: string): string[] {
  return (title.match(/[A-Za-z][A-Za-z-]{4,}/g) ?? []).filter((w) => !STOP.has(w.toLowerCase()));
}

export function clozeOptions(answer: string, pool: readonly string[]): string[] | null {
  const picked = [answer];
  for (const w of pool) {
    if (picked.length === 4) break;
    if (parityOk([...picked, w])) picked.push(w);
  }
  return picked.length === 4 ? picked : null;
}

function recall(src: WorkSources, rng: Rng): QuizQuestion | null {
  const items: { text: string; ref: SourceRef; key: string; name: string }[] = [
    ...src.prs.map((p) => ({ text: shortTitle(p.title, CLOZE_TITLE_TOKENS), ref: prRef(p, src.repoUrl), key: `pr${p.number}`, name: `PR #${p.number}` })),
    ...src.beads.map((b) => ({ text: shortTitle(b.title, CLOZE_TITLE_TOKENS), ref: beadRef(b), key: b.id, name: `Bead ${b.id}` })),
  ].filter((it) => clozeWords(it.text).length > 0);
  if (items.length < 2) return null;
  const item = pick(rng, items);
  const words = clozeWords(item.text);
  const once = words.filter((w) => words.filter((x) => x.toLowerCase() === w.toLowerCase()).length === 1);
  if (once.length === 0) return null;
  const answer = pick(rng, once);
  const inTitle = new Set(words.map((w) => w.toLowerCase()));
  const pool = Array.from(new Set(items.flatMap((it) => clozeWords(it.text)))).filter((w) => !inTitle.has(w.toLowerCase()));
  const byLower = new Map<string, string>();
  for (const w of shuffle(rng, pool)) if (!byLower.has(w.toLowerCase())) byLower.set(w.toLowerCase(), w);
  const options = clozeOptions(answer, Array.from(byLower.values()));
  if (!options) return null;
  const blanked = item.text.replace(new RegExp(`(^|[^A-Za-z-])${answer.replace(/-/g, "\\-")}(?![A-Za-z-])`), "$1____");
  return {
    id: questionId("recall", `${item.key}|${answer}`),
    type: "recall",
    prompt: "Which word fills the blank?",
    lines: [blanked],
    choices: shuffle(rng, options),
    answer,
    tolerance: 0,
    limitSec: LIMIT_SEC.recall,
    explain: `${item.name} reads: ${item.text}`,
    sources: [item.ref],
  };
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function trueFalse(src: WorkSources, rng: Rng): QuizQuestion | null {
  const statuses = Array.from(new Set(src.beads.map((b) => b.status)));
  const useBead = src.beads.length > 0 && statuses.length > 1 && (src.prs.length === 0 || rng() < 0.5);
  const claimTrue = rng() < 0.5;
  if (useBead) {
    const b = pick(rng, src.beads);
    const claimed = claimTrue ? b.status : pick(rng, statuses.filter((s) => s !== b.status));
    const short = shortTitle(b.title, STEM_TITLE_TOKENS);
    if (!short) return null;
    return {
      id: questionId("true_false", `${b.id}|status|${claimed}`),
      type: "true_false",
      prompt: `The bead "${short}" has status ${claimed}.`,
      lines: [],
      choices: ["true", "false"],
      answer: claimed === b.status ? "true" : "false",
      tolerance: 0,
      limitSec: LIMIT_SEC.true_false,
      explain: `Bead ${b.id} has status ${b.status}.`,
      sources: [beadRef(b)],
    };
  }
  if (src.prs.length === 0) return null;
  const p = pick(rng, src.prs);
  const offset = claimTrue ? 0 : pick(rng, [-5, -3, -2, 2, 3, 5]);
  const claimed = shiftDate(p.date, offset);
  const short = shortTitle(p.title, STEM_TITLE_TOKENS);
  if (!short) return null;
  return {
    id: questionId("true_false", `pr${p.number}|date|${claimed}`),
    type: "true_false",
    prompt: `"${short}" merged on ${claimed}.`,
    lines: [],
    choices: ["true", "false"],
    answer: offset === 0 ? "true" : "false",
    tolerance: 0,
    limitSec: LIMIT_SEC.true_false,
    explain: `PR #${p.number} merged on ${p.date}.`,
    sources: [prRef(p, src.repoUrl)],
  };
}

function whichFirst(src: WorkSources, rng: Rng): QuizQuestion | null {
  const datedNotes = src.notes.filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date));
  const noteDates = new Set(datedNotes.map((n) => n.date));
  const useNotes = noteDates.size > 1 && (src.prs.length < 2 || rng() < 0.3);
  if (useNotes) {
    const a = pick(rng, datedNotes);
    const b = pick(rng, datedNotes.filter((n) => n.date !== a.date));
    const [older, newer] = a.date < b.date ? [a, b] : [b, a];
    const pair = shortPair(older.heading, newer.heading);
    if (!pair) return null;
    return {
      id: questionId("which_first", `${older.file}#${older.heading}|${newer.file}#${newer.heading}`),
      type: "which_first",
      prompt: "Which idea came first?",
      lines: [],
      choices: shuffle(rng, pair),
      answer: pair[0],
      tolerance: 0,
      limitSec: LIMIT_SEC.which_first,
      explain: `${pair[0]} is from ${older.date}; ${pair[1]} is from ${newer.date}.`,
      sources: [noteRef(older)],
    };
  }
  if (src.prs.length < 2) return null;
  const a = pick(rng, src.prs);
  const others = shuffle(rng, src.prs.filter((p) => p.number !== a.number && Math.abs(p.order - a.order) <= 60)).slice(0, PAIR_TRIES);
  let best: { older: PrFact; newer: PrFact; pair: [string, string]; size: number } | null = null;
  for (const b of others) {
    const [o, n] = a.order < b.order ? [a, b] : [b, a];
    const found = shortPair(o.title, n.title);
    const size = found ? countTokens(found[0]) + countTokens(found[1]) : 0;
    if (found && (!best || size > best.size)) best = { older: o, newer: n, pair: found, size };
    if (size === 2 * OPTION_TITLE_TOKENS) break;
  }
  if (!best) return null;
  const { older, newer, pair } = best;
  return {
    id: questionId("which_first", `pr${older.number}|pr${newer.number}`),
    type: "which_first",
    prompt: "Which merged first?",
    lines: [],
    choices: shuffle(rng, pair),
    answer: pair[0],
    tolerance: 0,
    limitSec: LIMIT_SEC.which_first,
    explain: `PR #${older.number} merged ${older.date}; PR #${newer.number} merged ${newer.date}.`,
    sources: [prRef(older, src.repoUrl)],
  };
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function estimate(src: WorkSources, rng: Rng): QuizQuestion | null {
  const options: { key: string; prompt: string; count: number; explain: string }[] = [];
  for (const status of Array.from(new Set(src.beads.map((b) => b.status)))) {
    const n = src.beads.filter((b) => b.status === status).length;
    options.push({ key: `beads-status-${status}`, prompt: `How many beads have status ${status}?`, count: n, explain: `${n} of ${src.beads.length} beads have status ${status}.` });
  }
  for (const p of Array.from(new Set(src.beads.map((b) => b.priority)))) {
    const n = src.beads.filter((b) => b.priority === p).length;
    options.push({ key: `beads-priority-${p}`, prompt: `How many beads are priority P${p}?`, count: n, explain: `${n} of ${src.beads.length} beads are P${p}.` });
  }
  for (const m of Array.from(new Set(src.prs.map((p) => monthOf(p.date))))) {
    const n = src.prs.filter((p) => monthOf(p.date) === m).length;
    options.push({ key: `prs-month-${m}`, prompt: `How many PRs merged in ${m}?`, count: n, explain: `${n} PRs merged into dev during ${m}.` });
  }
  const feats = src.prs.filter((p) => /^feat/i.test(p.title)).length;
  if (src.prs.length > 0) options.push({ key: "prs-feat", prompt: "How many merged PRs are feat PRs?", count: feats, explain: `${feats} of ${src.prs.length} merged PRs are feat PRs.` });
  const usable = options.filter((o) => o.count >= 3);
  if (usable.length === 0) return null;
  const o = pick(rng, usable);
  return {
    id: questionId("estimate", o.key),
    type: "estimate",
    prompt: o.prompt,
    lines: [`Within ${Math.round(ESTIMATE_TOLERANCE * 100)} percent counts as right.`],
    choices: null,
    answer: String(o.count),
    tolerance: Math.max(1, Math.round(o.count * ESTIMATE_TOLERANCE)),
    limitSec: LIMIT_SEC.estimate,
    explain: o.explain,
    sources: [],
  };
}

export const BEAD_FIELDS = ["the bead id", "the status", "the priority"] as const;
export const PR_FIELDS = ["the number", "the date", "the title"] as const;

function spotError(src: WorkSources, rng: Rng): QuizQuestion | null {
  const useBead = src.beads.length > 1 && (src.prs.length < 2 || rng() < 0.5);
  if (useBead) {
    const b = pick(rng, src.beads);
    const wrong = pick(rng, BEAD_FIELDS);
    let id = b.id;
    let status = b.status;
    let priority = b.priority;
    if (wrong === "the bead id") {
      const other = src.beads.filter((x) => x.id !== b.id);
      if (other.length === 0) return null;
      id = pick(rng, other).id;
    } else if (wrong === "the status") {
      const other = Array.from(new Set(src.beads.map((x) => x.status))).filter((s) => s !== b.status);
      if (other.length === 0) return null;
      status = pick(rng, other);
    } else {
      priority = pick(rng, [0, 1, 2, 3, 4].filter((p) => p !== b.priority));
    }
    const short = shortTitle(b.title, OPTION_TITLE_TOKENS);
    if (!short) return null;
    return {
      id: questionId("spot_error", `${b.id}|${wrong}|${id}|${status}|${priority}`),
      type: "spot_error",
      prompt: "Which fact is wrong?",
      lines: [`"${short}"`, `id: ${id}`, `status: ${status}`, `priority: P${priority}`],
      choices: [...BEAD_FIELDS],
      answer: wrong,
      tolerance: 0,
      limitSec: LIMIT_SEC.spot_error,
      explain: `The bead is ${b.id}, status ${b.status}, priority P${b.priority}.`,
      sources: [beadRef(b)],
    };
  }
  if (src.prs.length < 2) return null;
  const p = pick(rng, src.prs);
  const wrong = pick(rng, PR_FIELDS);
  const trueTitle = shortTitle(p.title, OPTION_TITLE_TOKENS);
  if (!trueTitle) return null;
  let num = p.number;
  let date = p.date;
  let title = trueTitle;
  const others = src.prs.filter((x) => x.number !== p.number);
  if (wrong === "the number") num = pick(rng, others).number;
  else if (wrong === "the date") date = shiftDate(p.date, pick(rng, [-6, -4, -3, 3, 4, 6]));
  else {
    const alt = others.map((x) => shortTitle(x.title, OPTION_TITLE_TOKENS)).filter((t) => t && t !== trueTitle);
    if (alt.length === 0) return null;
    title = pick(rng, alt);
  }
  return {
    id: questionId("spot_error", `pr${p.number}|${wrong}|${num}|${date}|${title}`),
    type: "spot_error",
    prompt: "Which fact is wrong?",
    lines: [`number: #${num}`, `merged: ${date}`, `title: ${title}`],
    choices: [...PR_FIELDS],
    answer: wrong,
    tolerance: 0,
    limitSec: LIMIT_SEC.spot_error,
    explain: `PR #${p.number} merged ${p.date}: ${trueTitle}.`,
    sources: [prRef(p, src.repoUrl)],
  };
}

export const MAKERS: Record<QuizType, (src: WorkSources, rng: Rng) => QuizQuestion | null> = {
  recall,
  true_false: trueFalse,
  which_first: whichFirst,
  estimate,
  spot_error: spotError,
};

export function generateQuestion(src: WorkSources, seed: string, only?: QuizType): QuizQuestion | null {
  const rng = seededRng(seed);
  const order = only ? [only] : shuffle(rng, QUIZ_TYPES);
  for (const type of order) {
    const q = MAKERS[type](src, rng);
    if (q && withinLimits(q)) return q;
  }
  return null;
}

export function sourcesEmpty(src: WorkSources): boolean {
  return src.beads.length === 0 && src.prs.length === 0 && src.notes.length === 0;
}
