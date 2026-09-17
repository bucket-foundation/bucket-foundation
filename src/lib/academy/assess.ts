/**
 * "Test yourself", a port of learning/app/js/assess.js: a sealed run of
 * quiz items answered before the answer is shown, graded on the spot where
 * the canonical answer reduces to a number or a short symbolic value, and
 * self-checked otherwise. Internal signal that sharpens the proficiency
 * estimate; never a credential. Pure.
 */
import type { Atom, Depth } from "./engine";
import type { Card, Rating } from "./fsrs";

export const ASSESS = {
  NUM_REL_TOL: 0.01,
  NUM_ABS_TOL: 1e-9,
  SYMBOLIC_MAX_LEN: 24,
  DEFAULT_RUN_SIZE: 10,
  MIN_RUN_SIZE: 3,
  RATING_CORRECT: 3 as Rating,
  RATING_INCORRECT: 1 as Rating,
  LEVELS: ["recall", "apply", "derive", "teach"] as Depth[],
};

const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

export function asciiMath(input: unknown): string {
  let s = String(input == null ? "" : input);
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (run) => "^" + Array.from(run).map((ch) => SUP[ch] ?? "").join(""));
  return s
    .replace(/[×·∙*]/g, "x")
    .replace(/[−–—]/g, "-")
    .replace(/[≈~≃≅]/g, "")
    .replace(/\xa0/g, " ")
    .replace(/[,](?=\d{3}\b)/g, "");
}

export function normSymbolic(s: unknown): string {
  return asciiMath(s).toLowerCase().replace(/\s+/g, "").replace(/[.;]+$/, "");
}

export function parseNumber(tok: unknown): number | null {
  if (tok == null) return null;
  let s = asciiMath(String(tok)).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/\s*x\s*10\s*\^\s*([+-]?\d+)/g, "e$1");
  s = s.replace(/(^|[^0-9.])10\s*\^\s*([+-]?\d+)/g, "$11e$2");
  s = s.replace(/\s+/g, "");
  const fr = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fr) {
    const d = parseFloat(fr[2]);
    if (d === 0) return null;
    return parseFloat(fr[1]) / d;
  }
  if (/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

export function normUnit(u: string): string {
  if (!u) return "";
  return String(u).toLowerCase().replace(/\s|\./g, "").replace(/µ|μ/g, "u");
}

export interface Salient {
  value: number;
  unit: string;
}

/** The last number (with its unit) after the last "=", or in the whole string. */
export function extractSalientNumber(str: unknown): Salient | null {
  const s = asciiMath(str);
  const eq = s.lastIndexOf("=");
  const region = eq >= 0 ? s.slice(eq + 1) : s;
  const re = /([+-]?\d+(?:\.\d+)?(?:\s*[ex]\s*10\s*\^\s*[+-]?\d+|\s*e[+-]?\d+|\s*\^\s*[+-]?\d+)?)\s*(%|[a-zµμ°Ω/·-]+(?:\^?[+-]?\d+)?)?/gi;
  const matches: Salient[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(region)) !== null) {
    const val = parseNumber(mm[1]);
    if (val == null) continue;
    let unit = (mm[2] || "").trim();
    if (/^(so|the|of|is|a|an|to|and|or|it)$/i.test(unit)) unit = "";
    matches.push({ value: val, unit: normUnit(unit) });
  }
  return matches.length ? matches[matches.length - 1] : null;
}

export function numbersClose(a: number, b: number, opts: { rel?: number; abs?: number } = {}): boolean {
  const rel = opts.rel ?? ASSESS.NUM_REL_TOL;
  const abs = opts.abs ?? ASSESS.NUM_ABS_TOL;
  const diff = Math.abs(a - b);
  if (diff <= abs) return true;
  return diff <= rel * Math.max(Math.abs(a), Math.abs(b));
}

const fmt = (n: Salient | string | null): string => (n == null ? "" : typeof n === "string" ? n : n.value + (n.unit ? " " + n.unit : ""));

export interface Verdict {
  gradable: boolean;
  correct?: boolean;
  kind: "numeric" | "symbolic" | "open";
  expected: string;
  got: string;
  reason: string;
}

/** Grade typed input against the corpus answer: numeric with tolerance and loose units, short symbolic by normalized equality, else not gradable. */
export function gradeAnswer(userInput: unknown, canonicalAnswer: unknown, opts: { rel?: number; abs?: number } = {}): Verdict {
  const raw = userInput == null ? "" : String(userInput).trim();
  const canon = canonicalAnswer == null ? "" : String(canonicalAnswer).trim();
  const cNum = extractSalientNumber(canon);
  if (cNum) {
    if (!raw) return { gradable: true, correct: false, kind: "numeric", expected: fmt(cNum), got: "", reason: "blank" };
    const uNum = extractSalientNumber(raw);
    if (!uNum) return { gradable: false, kind: "numeric", expected: fmt(cNum), got: raw, reason: "no_number_in_input" };
    const ok = numbersClose(uNum.value, cNum.value, opts) && (!uNum.unit || !cNum.unit || uNum.unit === cNum.unit);
    return { gradable: true, correct: ok, kind: "numeric", expected: fmt(cNum), got: fmt(uNum), reason: ok ? "match" : "value_or_unit_mismatch" };
  }
  if (canon && canon.length <= ASSESS.SYMBOLIC_MAX_LEN) {
    if (!raw) return { gradable: true, correct: false, kind: "symbolic", expected: canon, got: "", reason: "blank" };
    const nc = normSymbolic(canon);
    const nu = normSymbolic(raw);
    if (!nc) return { gradable: false, kind: "symbolic", expected: canon, got: raw, reason: "empty_canonical" };
    const ncRhs = nc.includes("=") ? nc.slice(nc.lastIndexOf("=") + 1) : nc;
    const nuRhs = nu.includes("=") ? nu.slice(nu.lastIndexOf("=") + 1) : nu;
    const ok = nu === nc || nuRhs === ncRhs || nu === ncRhs || nuRhs === nc;
    return { gradable: true, correct: ok, kind: "symbolic", expected: canon, got: raw, reason: ok ? "match" : "mismatch" };
  }
  return { gradable: false, kind: "open", expected: canon, got: raw, reason: "not_auto_gradable" };
}

export interface RunItem {
  atomId: string;
  title: string;
  level: Depth;
  prompt: string;
  answer: string;
  shell?: string;
}

export interface Run {
  items: RunItem[];
  conceptCount: number;
  createdAt: number;
}

/** A sealed spread across started (else all) atoms, due ones first, one item per atom then a harder second pass, levels round-robin. */
export function buildRun(atoms: Atom[], cardFor: (id: string) => Card | null | undefined, opts: { size?: number; conceptIds?: string[]; levels?: Depth[]; rng?: () => number; now?: number } = {}): Run {
  const size = Math.max(ASSESS.MIN_RUN_SIZE, opts.size ?? ASSESS.DEFAULT_RUN_SIZE);
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? Date.now();
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const askable = (a: Atom | undefined): a is Atom => Boolean(a && a.quiz && a.quiz.length);
  let pool: Atom[];
  if (opts.conceptIds?.length) pool = opts.conceptIds.map((id) => byId.get(id)).filter(askable);
  else {
    const started = atoms.filter((a) => askable(a) && cardFor(a.id));
    pool = started.length ? started : atoms.filter(askable);
  }
  if (!pool.length) return { items: [], conceptCount: 0, createdAt: now };
  const dueness = (a: Atom) => {
    const c = cardFor(a.id);
    return c && c.due != null && c.due <= now ? now - c.due : -1;
  };
  const ranked = pool.slice().sort((a, b) => {
    const da = dueness(a);
    const db = dueness(b);
    if (da >= 0 !== db >= 0) return db - da;
    return (b.leverage ?? 0) - (a.leverage ?? 0) || rng() - 0.5;
  });
  const levelCycle = opts.levels?.length ? opts.levels.slice() : ASSESS.LEVELS.slice();
  const items: RunItem[] = [];
  const used = new Map<string, Depth[]>();
  const pickItemFor = (atom: Atom, prefer: Depth): RunItem | null => {
    const order = [prefer, ...ASSESS.LEVELS.filter((l) => l !== prefer)];
    for (const lvl of order) {
      const q = (atom.quiz ?? []).find((x) => x.level === lvl);
      if (q) return { atomId: atom.id, title: atom.title || atom.id, level: q.level as Depth, prompt: q.prompt, answer: q.answer, shell: atom.shell };
    }
    return null;
  };
  let li = 0;
  for (let i = 0; i < ranked.length && items.length < size; i++) {
    const lvl = levelCycle[li % levelCycle.length];
    li++;
    const it = pickItemFor(ranked[i], lvl);
    if (it) {
      items.push(it);
      used.set(ranked[i].id, [...(used.get(ranked[i].id) ?? []), it.level]);
    }
  }
  let di = 0;
  while (items.length < size && ranked.length) {
    const a2 = ranked[di % ranked.length];
    di++;
    if (di > ranked.length * ASSESS.LEVELS.length) break;
    const u = used.get(a2.id) ?? [];
    const unused = ASSESS.LEVELS.filter((l) => !u.includes(l));
    if (!unused.length) continue;
    const it2 = pickItemFor(a2, unused[unused.length - 1]);
    if (it2 && !u.includes(it2.level)) {
      items.push(it2);
      used.set(a2.id, [...u, it2.level]);
    }
  }
  return { items, conceptCount: used.size, createdAt: now };
}

export interface RunResult {
  atomId: string;
  level: Depth;
  correct: boolean;
  autoGraded: boolean;
  latencyMs?: number;
}

export interface RunSummary {
  total: number;
  correct: number;
  score: number;
  auto: { total: number; correct: number };
  self: { total: number; correct: number };
  byLevel: Record<string, { total: number; correct: number }>;
  weakConcepts: string[];
  trust: "high" | "mixed" | "self";
}

export function summarize(results: RunResult[]): RunSummary {
  const auto = { total: 0, correct: 0 };
  const self = { total: 0, correct: 0 };
  const byLevel: Record<string, { total: number; correct: number }> = {};
  const weak: string[] = [];
  const seen = new Set<string>();
  let correct = 0;
  results.forEach((r) => {
    if (r.correct) correct++;
    const bucket = r.autoGraded ? auto : self;
    bucket.total++;
    if (r.correct) bucket.correct++;
    const lv = r.level || "recall";
    byLevel[lv] = byLevel[lv] ?? { total: 0, correct: 0 };
    byLevel[lv].total++;
    if (r.correct) byLevel[lv].correct++;
    if (!r.correct && r.atomId && !seen.has(r.atomId)) {
      seen.add(r.atomId);
      weak.push(r.atomId);
    }
  });
  const trust: RunSummary["trust"] = auto.total === 0 ? "self" : self.total === 0 ? "high" : "mixed";
  return { total: results.length, correct, score: results.length ? correct / results.length : 0, auto, self, byLevel, weakConcepts: weak, trust };
}

export function ratingFor(correct: boolean): Rating {
  return correct ? ASSESS.RATING_CORRECT : ASSESS.RATING_INCORRECT;
}
