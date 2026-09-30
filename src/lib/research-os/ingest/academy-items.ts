import { createHash } from "node:crypto";

export const LEARNING_ITEM_KINDS = ["lesson", "depth", "quiz", "resource", "equation", "source", "note"] as const;
export type LearningItemKind = (typeof LEARNING_ITEM_KINDS)[number];

export interface LearningItemDraft {
  kind: LearningItemKind;
  ordinal: number;
  body: Record<string, unknown>;
  contentHash: string;
  provenance: { type: "academy_atom"; source: string; atom_id: string; field: string; index: number | string };
}

export interface AtomContent {
  id: string;
  lesson?: unknown;
  depths?: unknown;
  quiz?: unknown;
  resources?: unknown;
  equation?: unknown;
  sources?: unknown;
  note?: unknown;
}

export const DEPTH_ORDER = ["eli5", "core", "deep"] as const;

export function contentHash(body: unknown): string {
  return createHash("sha256").update(stableJson(body)).digest("hex");
}

export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export function atomLearningItems(sourceFile: string, atom: AtomContent): LearningItemDraft[] {
  const out: LearningItemDraft[] = [];
  const push = (kind: LearningItemKind, ordinal: number, body: Record<string, unknown>, field: string, index: number | string) =>
    out.push({ kind, ordinal, body, contentHash: contentHash(body), provenance: { type: "academy_atom", source: sourceFile, atom_id: atom.id, field, index } });

  if (nonEmpty(atom.lesson)) push("lesson", 0, { markdown: atom.lesson }, "lesson", 0);
  if (atom.depths && typeof atom.depths === "object" && !Array.isArray(atom.depths)) {
    const d = atom.depths as Record<string, unknown>;
    const keys = [...DEPTH_ORDER.filter((k) => k in d), ...Object.keys(d).filter((k) => !(DEPTH_ORDER as readonly string[]).includes(k)).sort()];
    keys.forEach((k, i) => {
      if (nonEmpty(d[k])) push("depth", i, { level: k, text: d[k] }, "depths", k);
    });
  } else if (Array.isArray(atom.depths)) {
    atom.depths.forEach((t, i) => {
      if (nonEmpty(t)) push("depth", i, { level: String(i), text: t }, "depths", i);
    });
  }
  if (Array.isArray(atom.quiz)) {
    atom.quiz.forEach((q, i) => {
      const item = q as Record<string, unknown> | null;
      if (item && nonEmpty(item.prompt) && nonEmpty(item.answer)) push("quiz", i, { ...item }, "quiz", i);
    });
  }
  if (Array.isArray(atom.resources)) {
    atom.resources.forEach((r, i) => {
      const item = r as { label?: unknown; url?: unknown };
      if (nonEmpty(item?.url)) push("resource", i, { ...(item as Record<string, unknown>) }, "resources", i);
    });
  }
  if (nonEmpty(atom.equation)) push("equation", 0, { latex: atom.equation }, "equation", 0);
  if (Array.isArray(atom.sources)) {
    atom.sources.forEach((s, i) => {
      if (nonEmpty(s)) push("source", i, { citation: s }, "sources", i);
    });
  }
  if (nonEmpty(atom.note)) push("note", 0, { text: atom.note }, "note", 0);
  return out;
}

export function itemsToAtomFields(items: Pick<LearningItemDraft, "kind" | "ordinal" | "body">[]): Record<string, unknown> {
  const by = (k: LearningItemKind) => items.filter((i) => i.kind === k).sort((a, b) => a.ordinal - b.ordinal);
  const out: Record<string, unknown> = {};
  const lesson = by("lesson")[0];
  if (lesson) out.lesson = lesson.body.markdown;
  const depths = by("depth");
  if (depths.length) out.depths = Object.fromEntries(depths.map((d) => [d.body.level, d.body.text]));
  const quiz = by("quiz");
  if (quiz.length) out.quiz = quiz.map((q) => ({ ...q.body }));
  const res = by("resource");
  if (res.length) out.resources = res.map((r) => ({ ...r.body }));
  const eq = by("equation")[0];
  if (eq) out.equation = eq.body.latex;
  const src = by("source");
  if (src.length) out.sources = src.map((s) => s.body.citation);
  const note = by("note")[0];
  if (note) out.note = note.body.text;
  return out;
}
