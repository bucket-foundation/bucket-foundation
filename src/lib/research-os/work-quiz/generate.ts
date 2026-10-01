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

function prRef(pr: PrFact, repoUrl: string | null): SourceRef {
  return { kind: "pr", ref: `#${pr.number}`, label: `PR #${pr.number}: ${prTitle(pr.title)}`, href: repoUrl ? `${repoUrl}/pull/${pr.number}` : null };
}

function beadRef(b: BeadFact): SourceRef {
  return { kind: "bead", ref: b.id, label: `bead ${b.id}: ${b.title}`, href: null };
}

function noteRef(n: NoteFact): SourceRef {
  return { kind: "note", ref: `${n.file}#${n.heading}`, label: `${n.file}, ${n.heading}`, href: null };
}

const STOP = new Set(["about", "after", "again", "every", "their", "there", "these", "those", "which", "while", "where", "with", "without", "under", "until", "before", "being"]);

function clozeWords(title: string): string[] {
  return (title.match(/[A-Za-z][A-Za-z-]{4,}/g) ?? []).filter((w) => !STOP.has(w.toLowerCase()));
}

const PRIORITY_WORDS = ["top", "high", "medium", "low", "lowest"];

function plainStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function plainPriority(priority: number): string {
  return `${PRIORITY_WORDS[priority] ?? "unranked"} priority`;
}

function recall(src: WorkSources, rng: Rng): QuizQuestion | null {
  const items: { text: string; ref: SourceRef; key: string }[] = [
    ...src.prs.map((p) => ({ text: prTitle(p.title), ref: prRef(p, src.repoUrl), key: `pr${p.number}` })),
    ...src.beads.map((b) => ({ text: b.title, ref: beadRef(b), key: b.id })),
  ].filter((it) => clozeWords(it.text).length > 0);
  if (items.length < 2) return null;
  const item = pick(rng, items);
  const words = clozeWords(item.text);
  const once = words.filter((w) => words.filter((x) => x.toLowerCase() === w.toLowerCase()).length === 1);
  if (once.length === 0) return null;
  const answer = pick(rng, once);
  const inTitle = new Set(clozeWords(item.text).map((w) => w.toLowerCase()));
  const pool = Array.from(new Set(items.flatMap((it) => clozeWords(it.text)))).filter((w) => !inTitle.has(w.toLowerCase()));
  const byLower = new Map<string, string>();
  for (const w of shuffle(rng, pool)) if (!byLower.has(w.toLowerCase())) byLower.set(w.toLowerCase(), w);
  const distractors = Array.from(byLower.values()).slice(0, 3);
  if (distractors.length < 3) return null;
  const blanked = item.text.replace(new RegExp(`(^|[^A-Za-z-])${answer.replace(/-/g, "\\-")}(?![A-Za-z-])`), "$1____");
  return {
    id: questionId("recall", `${item.key}|${answer}`),
    type: "recall",
    prompt: `Which word fills the blank in this ${item.ref.kind === "pr" ? "merged change" : "task"}?`,
    lines: [blanked],
    choices: shuffle(rng, [answer, ...distractors]),
    answer,
    tolerance: 0,
    limitSec: LIMIT_SEC.recall,
    explain: `The title reads: ${item.text}`,
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
    return {
      id: questionId("true_false", `${b.id}|status|${claimed}`),
      type: "true_false",
      prompt: "True or false?",
      lines: [`The task "${b.title}" is ${plainStatus(claimed)}.`],
      choices: ["true", "false"],
      answer: claimed === b.status ? "true" : "false",
      tolerance: 0,
      limitSec: LIMIT_SEC.true_false,
      explain: `That task is ${plainStatus(b.status)}.`,
      sources: [beadRef(b)],
    };
  }
  if (src.prs.length === 0) return null;
  const p = pick(rng, src.prs);
  const offset = claimTrue ? 0 : pick(rng, [-5, -3, -2, 2, 3, 5]);
  const claimed = shiftDate(p.date, offset);
  return {
    id: questionId("true_false", `pr${p.number}|date|${claimed}`),
    type: "true_false",
    prompt: "True or false?",
    lines: [`The change "${prTitle(p.title)}" merged on ${claimed}.`],
    choices: ["true", "false"],
    answer: offset === 0 ? "true" : "false",
    tolerance: 0,
    limitSec: LIMIT_SEC.true_false,
    explain: `That change merged on ${p.date}.`,
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
    const choices = shuffle(rng, [older.heading, newer.heading]);
    if (choices[0] === choices[1]) return null;
    return {
      id: questionId("which_first", `${older.file}#${older.heading}|${newer.file}#${newer.heading}`),
      type: "which_first",
      prompt: "Which idea was written down first?",
      lines: [],
      choices,
      answer: older.heading,
      tolerance: 0,
      limitSec: LIMIT_SEC.which_first,
      explain: `${older.heading} is from ${older.date}; ${newer.heading} is from ${newer.date}.`,
      sources: [noteRef(older), noteRef(newer)],
    };
  }
  if (src.prs.length < 2) return null;
  const a = pick(rng, src.prs);
  const others = src.prs.filter((p) => p.number !== a.number && Math.abs(p.order - a.order) <= 60);
  if (others.length === 0) return null;
  const b = pick(rng, others);
  const [older, newer] = a.order < b.order ? [a, b] : [b, a];
  const label = (p: PrFact) => prTitle(p.title);
  if (label(older) === label(newer)) return null;
  return {
    id: questionId("which_first", `pr${older.number}|pr${newer.number}`),
    type: "which_first",
    prompt: "Which of these changes merged first?",
    lines: [],
    choices: shuffle(rng, [label(older), label(newer)]),
    answer: label(older),
    tolerance: 0,
    limitSec: LIMIT_SEC.which_first,
    explain: `"${label(older)}" merged ${older.date}; "${label(newer)}" merged ${newer.date}.`,
    sources: [prRef(older, src.repoUrl), prRef(newer, src.repoUrl)],
  };
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function estimate(src: WorkSources, rng: Rng): QuizQuestion | null {
  const options: { key: string; prompt: string; count: number; explain: string; refs: SourceRef[] }[] = [];
  for (const status of Array.from(new Set(src.beads.map((b) => b.status)))) {
    const n = src.beads.filter((b) => b.status === status).length;
    options.push({ key: `beads-status-${status}`, prompt: `How many of your tasks are ${plainStatus(status)}?`, count: n, explain: `${n} of ${src.beads.length} tasks are ${plainStatus(status)}.`, refs: [] });
  }
  for (const p of Array.from(new Set(src.beads.map((b) => b.priority)))) {
    const n = src.beads.filter((b) => b.priority === p).length;
    options.push({ key: `beads-priority-${p}`, prompt: `How many of your tasks are ${plainPriority(p)}?`, count: n, explain: `${n} of ${src.beads.length} tasks are ${plainPriority(p)}.`, refs: [] });
  }
  for (const m of Array.from(new Set(src.prs.map((p) => monthOf(p.date))))) {
    const n = src.prs.filter((p) => monthOf(p.date) === m).length;
    options.push({ key: `prs-month-${m}`, prompt: `How many changes merged during ${m}?`, count: n, explain: `${n} changes merged during ${m}.`, refs: [] });
  }
  const feats = src.prs.filter((p) => /^feat/i.test(p.title)).length;
  if (src.prs.length > 0) options.push({ key: "prs-feat", prompt: "Of your merged changes, how many add a feature?", count: feats, explain: `${feats} of ${src.prs.length} merged changes add a feature.`, refs: [] });
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
    sources: o.refs,
  };
}

function spotError(src: WorkSources, rng: Rng): QuizQuestion | null {
  const useBead = src.beads.length > 1 && (src.prs.length < 2 || rng() < 0.5);
  if (useBead) {
    const b = pick(rng, src.beads);
    const fields = ["the status", "the priority"] as const;
    const wrong = pick(rng, fields);
    let status = b.status;
    let priority = b.priority;
    if (wrong === "the status") {
      const other = Array.from(new Set(src.beads.map((x) => x.status))).filter((s) => s !== b.status);
      if (other.length === 0) return null;
      status = pick(rng, other);
    } else {
      priority = pick(rng, [0, 1, 2, 3, 4].filter((p) => p !== b.priority));
    }
    return {
      id: questionId("spot_error", `${b.id}|${wrong}|${status}|${priority}`),
      type: "spot_error",
      prompt: "One of these facts about a task is wrong. Which one?",
      lines: [`"${b.title}"`, `status: ${plainStatus(status)}`, `priority: ${plainPriority(priority)}`],
      choices: [...fields],
      answer: wrong,
      tolerance: 0,
      limitSec: LIMIT_SEC.spot_error,
      explain: `The task is "${b.title}", ${plainStatus(b.status)}, ${plainPriority(b.priority)}.`,
      sources: [beadRef(b)],
    };
  }
  if (src.prs.length < 2) return null;
  const p = pick(rng, src.prs);
  const fields = ["the number", "the date", "the title"] as const;
  const wrong = pick(rng, fields);
  let num = p.number;
  let date = p.date;
  let title = prTitle(p.title);
  const others = src.prs.filter((x) => x.number !== p.number);
  if (wrong === "the number") num = pick(rng, others).number;
  else if (wrong === "the date") date = shiftDate(p.date, pick(rng, [-6, -4, -3, 3, 4, 6]));
  else {
    const alt = others.map((x) => prTitle(x.title)).filter((t) => t !== title);
    if (alt.length === 0) return null;
    title = pick(rng, alt);
  }
  return {
    id: questionId("spot_error", `pr${p.number}|${wrong}|${num}|${date}|${title}`),
    type: "spot_error",
    prompt: "One of these facts about a merged change is wrong. Which one?",
    lines: [`number: #${num}`, `merged: ${date}`, `title: ${title}`],
    choices: [...fields],
    answer: wrong,
    tolerance: 0,
    limitSec: LIMIT_SEC.spot_error,
    explain: `Change #${p.number} merged ${p.date}: ${prTitle(p.title)}.`,
    sources: [prRef(p, src.repoUrl)],
  };
}

const MAKERS: Record<QuizType, (src: WorkSources, rng: Rng) => QuizQuestion | null> = {
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
    if (q) return q;
  }
  return null;
}

export function sourcesEmpty(src: WorkSources): boolean {
  return src.beads.length === 0 && src.prs.length === 0 && src.notes.length === 0;
}
