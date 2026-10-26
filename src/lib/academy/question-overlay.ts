import type { Question, QuestionDeck } from "./question-types";

export const OVERLAY_FIELDS = ["prompt", "options", "steps", "pairs", "fix", "explain"] as const;
export type OverlayField = (typeof OVERLAY_FIELDS)[number];

export interface OverlayReview {
  reviewed_by: string;
  reviewed_at: string;
}

export interface OverlayQuestion {
  prompt?: string;
  options?: string[];
  steps?: string[];
  pairs?: { term: string; meaning: string }[];
  fix?: string;
  explain?: string;
  review?: OverlayReview;
}

export interface QuestionOverlay {
  locale: string;
  branch: string;
  questions: Record<string, OverlayQuestion>;
}

export interface LocalizedDeck {
  deck: QuestionDeck;
  locale: string;
  fallbacks: { id: string; field: OverlayField; reason: "missing" | "unreviewed" | "unaligned" }[];
}

const ALLOWED = new Set<string>([...OVERLAY_FIELDS, "review"]);

export function isReviewed(q: OverlayQuestion | undefined): boolean {
  const r = q?.review;
  return Boolean(r && typeof r.reviewed_by === "string" && r.reviewed_by.trim() && typeof r.reviewed_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_at));
}

function digits(s: string): string[] {
  return (s.match(/\d+/g) || []).sort();
}

function mathSpans(s: string): string[] {
  const latex = s.match(/\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g) || [];
  const rest = s.replace(/\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g, " ");
  const tokens = rest.match(/[^\s,;:()]*[\^_=][^\s,;:()]*/g) || [];
  return [...latex, ...tokens.map((t) => t.replace(/[.]+$/, ""))].sort();
}

function sameMultiset(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function textPairs(base: Question, field: OverlayField, tr: OverlayQuestion): [string, string, string][] | string {
  const b = base as unknown as Record<string, unknown>;
  const t = tr[field];
  if (field === "pairs") {
    const bp = b.pairs as { term: string; meaning: string }[] | undefined;
    const tp = t as { term: string; meaning: string }[];
    if (!bp) return "pairs has no English counterpart";
    if (!Array.isArray(tp) || tp.length !== bp.length) return `pairs count ${Array.isArray(tp) ? tp.length : "?"} differs from English ${bp.length}`;
    if (tp.some((p) => !p || typeof p.term !== "string" || typeof p.meaning !== "string")) return "pairs entries need term and meaning strings";
    return bp.flatMap((p, i) => [[`pairs[${i}].term`, p.term, tp[i].term], [`pairs[${i}].meaning`, p.meaning, tp[i].meaning]] as [string, string, string][]);
  }
  if (field === "options" || field === "steps") {
    const bl = b[field] as string[] | undefined;
    const tl = t as string[];
    if (!bl) return `${field} has no English counterpart`;
    if (!Array.isArray(tl) || tl.length !== bl.length) return `${field} count ${Array.isArray(tl) ? tl.length : "?"} differs from English ${bl.length}`;
    if (tl.some((x) => typeof x !== "string" || !x.trim())) return `${field} entries must be non-empty strings`;
    return bl.map((x, i) => [`${field}[${i}]`, x, tl[i]] as [string, string, string]);
  }
  const bs = b[field];
  if (typeof bs !== "string") return `${field} has no English counterpart`;
  if (typeof t !== "string" || !t.trim()) return `${field} must be a non-empty string`;
  return [[field, bs, t]];
}

export function fieldErrors(base: Question, field: OverlayField, tr: OverlayQuestion): string[] {
  const pairs = textPairs(base, field, tr);
  if (typeof pairs === "string") return [pairs];
  const errs: string[] = [];
  for (const [where, en, xx] of pairs) {
    if (!sameMultiset(digits(en), digits(xx))) errs.push(`${where}: numerals [${digits(en).join(" ")}] in English, [${digits(xx).join(" ")}] in translation`);
    const em = mathSpans(en);
    const missing = em.filter((m) => !xx.includes(m));
    if (missing.length) errs.push(`${where}: math spans missing from translation: ${missing.join(" | ")}`);
  }
  return errs;
}

export function checkOverlay(base: QuestionDeck, raw: unknown): string[] {
  const o = raw as QuestionOverlay;
  if (!o || typeof o !== "object" || typeof o.locale !== "string" || typeof o.questions !== "object" || !o.questions) return ["overlay: needs locale and questions"];
  const errs: string[] = [];
  if (o.branch !== base.branch) errs.push(`overlay: branch ${o.branch} differs from English ${base.branch}`);
  const byId = new Map(base.questions.map((q) => [q.id, q]));
  for (const [id, tr] of Object.entries(o.questions)) {
    const q = byId.get(id);
    if (!q) {
      errs.push(`${id}: no English question with this id`);
      continue;
    }
    for (const k of Object.keys(tr)) if (!ALLOWED.has(k)) errs.push(`${id}: field ${k} is outside the allowed set ${Array.from(ALLOWED).join(", ")}`);
    if (tr.review !== undefined && !isReviewed(tr)) errs.push(`${id}: review needs reviewed_by and reviewed_at as YYYY-MM-DD`);
    for (const f of OVERLAY_FIELDS) if (tr[f] !== undefined) errs.push(...fieldErrors(q, f, tr).map((e) => `${id}: ${e}`));
  }
  return errs;
}

export function localizeDeck(base: QuestionDeck, overlay: QuestionOverlay | undefined, locale: string): LocalizedDeck {
  const fallbacks: LocalizedDeck["fallbacks"] = [];
  if (!overlay || /^en\b/i.test(locale) || overlay.locale !== locale) return { deck: base, locale, fallbacks };
  const questions = base.questions.map((q) => {
    const tr = overlay.questions[q.id];
    const present = OVERLAY_FIELDS.filter((f) => (q as unknown as Record<string, unknown>)[f] !== undefined);
    if (!tr) {
      for (const f of present) fallbacks.push({ id: q.id, field: f, reason: "missing" });
      return q;
    }
    const reviewed = isReviewed(tr);
    const out = { ...q } as unknown as Record<string, unknown>;
    for (const f of present) {
      if (tr[f] === undefined) fallbacks.push({ id: q.id, field: f, reason: "missing" });
      else if (!reviewed) fallbacks.push({ id: q.id, field: f, reason: "unreviewed" });
      else if (fieldErrors(q, f, tr).length) fallbacks.push({ id: q.id, field: f, reason: "unaligned" });
      else out[f] = tr[f];
    }
    return out as unknown as Question;
  });
  return { deck: { ...base, questions }, locale, fallbacks };
}
