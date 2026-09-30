export const MODULE_KINDS = ["recall", "drill", "worked", "quiz", "path"] as const;
export type ModuleKind = (typeof MODULE_KINDS)[number];

export interface CtxNode {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  tier: number;
  origin?: string | null;
  workedExample?: { text: string; source: string };
}

export interface CtxEdge {
  id?: string;
  fromId: string;
  toId: string;
}

export interface CtxItem {
  id: string;
  kind: string;
  ordinal: number;
  body: Record<string, unknown>;
}

export interface ModuleContext {
  node: CtxNode;
  items: CtxItem[];
  nodes: CtxNode[];
  prerequisites: CtxEdge[];
}

export interface Provenance {
  kind: "item" | "edge" | "node";
  ref: string;
}

export interface ModuleItem {
  id: string;
  prompt: string;
  lines: string[];
  choices: string[] | null;
  answer: string;
  explain: string;
  provenance: Provenance[];
}

export interface PathStep {
  id: string;
  slug: string;
  title: string;
  tier: number;
}

export interface LearningModule {
  kind: ModuleKind;
  nodeId: string;
  items: ModuleItem[];
  steps: PathStep[];
  lesson: { markdown: string | null; depths: { level: string; text: string }[] } | null;
}

type Rng = () => number;

export const MIN_KIN = 3;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rngFor(seed: string): Rng {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = Array.from(xs);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function itemId(kind: ModuleKind, ...parts: string[]): string {
  return `${kind}:${hash(parts.join("|")).toString(36)}`;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export interface Graph {
  byId: Map<string, CtxNode>;
  parents: Map<string, CtxEdge[]>;
  children: Map<string, CtxEdge[]>;
}

export function indexGraph(ctx: ModuleContext): Graph {
  const byId = new Map(ctx.nodes.map((n) => [n.id, n]));
  byId.set(ctx.node.id, ctx.node);
  const parents = new Map<string, CtxEdge[]>();
  const children = new Map<string, CtxEdge[]>();
  for (const e of ctx.prerequisites) {
    if (!byId.has(e.fromId) || !byId.has(e.toId)) continue;
    parents.set(e.toId, [...(parents.get(e.toId) ?? []), e]);
    children.set(e.fromId, [...(children.get(e.fromId) ?? []), e]);
  }
  return { byId, parents, children };
}

export function ancestorIds(g: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of g.parents.get(cur) ?? []) {
      if (!seen.has(e.fromId)) {
        seen.add(e.fromId);
        stack.push(e.fromId);
      }
    }
  }
  return seen;
}

export function descendantIds(g: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of g.children.get(cur) ?? []) {
      if (!seen.has(e.toId)) {
        seen.add(e.toId);
        stack.push(e.toId);
      }
    }
  }
  return seen;
}

function unrelated(ctx: ModuleContext, g: Graph, keepAncestors = false): CtxNode[] {
  const anc = keepAncestors ? new Set<string>() : ancestorIds(g, ctx.node.id);
  const pool = ctx.nodes.filter((n) => n.id !== ctx.node.id && !anc.has(n.id));
  const kin = pool.filter((n) => (n.origin ?? null) === (ctx.node.origin ?? null));
  return (kin.length >= MIN_KIN ? kin : pool)
    .slice()
    .sort((a, b) => Math.abs(a.tier - ctx.node.tier) - Math.abs(b.tier - ctx.node.tier) || a.slug.localeCompare(b.slug));
}

function authoredQuiz(ctx: ModuleContext, levels: (level: string) => boolean): ModuleItem[] {
  return ctx.items
    .filter((i) => i.kind === "quiz" && levels(str(i.body.level) ?? "recall"))
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((i) => {
      const prompt = str(i.body.prompt);
      const answer = str(i.body.answer);
      if (!prompt || !answer) return [];
      return [{ id: `quiz-item:${i.id}`, prompt, lines: [], choices: null, answer, explain: answer, provenance: [{ kind: "item" as const, ref: i.id }] }];
    });
}

const STOP = new Set(["about", "which", "there", "their", "these", "those", "where", "while", "other", "being", "under", "between", "through", "because"]);

function summaryCloze(ctx: ModuleContext, rng: Rng): ModuleItem | null {
  const summary = str(ctx.node.summary);
  if (!summary) return null;
  const words = (summary.match(/[A-Za-z][A-Za-z-]{5,}/g) ?? []).filter((w) => !STOP.has(w.toLowerCase()));
  const once = words.filter((w) => words.filter((x) => x.toLowerCase() === w.toLowerCase()).length === 1);
  if (once.length === 0) return null;
  const answer = once.slice().sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
  const pool = new Map<string, string>();
  for (const n of ctx.nodes) {
    for (const w of str(n.summary)?.match(/[A-Za-z][A-Za-z-]{5,}/g) ?? []) {
      const k = w.toLowerCase();
      if (k !== answer.toLowerCase() && !STOP.has(k) && !summary.toLowerCase().includes(k)) pool.set(k, w);
    }
  }
  const distractors = shuffle(rng, Array.from(pool.values()).sort()).slice(0, 3);
  const blanked = summary.replace(new RegExp(`(^|[^A-Za-z-])${answer.replace(/-/g, "\\-")}(?![A-Za-z-])`), "$1____");
  return {
    id: itemId("recall", ctx.node.id, "cloze", answer),
    prompt: `Fill the blank in the summary of ${ctx.node.title}.`,
    lines: [blanked],
    choices: distractors.length === 3 ? shuffle(rng, [answer, ...distractors]) : null,
    answer,
    explain: summary,
    provenance: [{ kind: "node", ref: ctx.node.id }],
  };
}

function recallModule(ctx: ModuleContext, rng: Rng): ModuleItem[] {
  const authored = authoredQuiz(ctx, (l) => l === "recall");
  const cloze = summaryCloze(ctx, rng);
  return authored.length > 0 ? authored : cloze ? [cloze] : [];
}

function matchItem(ctx: ModuleContext, g: Graph, target: CtxNode, rng: Rng): ModuleItem | null {
  const summary = str(target.summary);
  if (!summary) return null;
  const others = unrelated(ctx, g, true).filter((n) => n.id !== target.id && n.title !== target.title).slice(0, 8);
  const distractors = shuffle(rng, others).slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    id: itemId("drill", ctx.node.id, "match", target.id),
    prompt: "Which concept does this describe?",
    lines: [summary],
    choices: shuffle(rng, [target.title, ...distractors.map((d) => d.title)]),
    answer: target.title,
    explain: `${target.title}: ${summary}`,
    provenance: [{ kind: "node", ref: target.id }, ...distractors.map((d) => ({ kind: "node" as const, ref: d.id }))],
  };
}

function prerequisiteItem(ctx: ModuleContext, g: Graph, rng: Rng): ModuleItem | null {
  const parents = (g.parents.get(ctx.node.id) ?? []).slice().sort((a, b) => a.fromId.localeCompare(b.fromId));
  if (parents.length === 0) return null;
  const edge = parents[Math.floor(rng() * parents.length)];
  const parent = g.byId.get(edge.fromId)!;
  const distractors = shuffle(rng, unrelated(ctx, g).filter((n) => n.title !== parent.title).slice(0, 8)).slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    id: itemId("drill", ctx.node.id, "prereq", parent.id),
    prompt: `Which of these do you need before ${ctx.node.title}?`,
    lines: [],
    choices: shuffle(rng, [parent.title, ...distractors.map((d) => d.title)]),
    answer: parent.title,
    explain: `${parent.title} is a prerequisite of ${ctx.node.title}.`,
    provenance: [{ kind: "edge", ref: edge.id ?? `${edge.fromId}>${edge.toId}` }, ...distractors.map((d) => ({ kind: "node" as const, ref: d.id }))],
  };
}

function orderItem(ctx: ModuleContext, g: Graph, rng: Rng): ModuleItem | null {
  for (const e1 of (g.parents.get(ctx.node.id) ?? []).slice().sort((a, b) => a.fromId.localeCompare(b.fromId))) {
    const e2 = (g.parents.get(e1.fromId) ?? []).slice().sort((a, b) => a.fromId.localeCompare(b.fromId))[0];
    if (!e2) continue;
    const first = g.byId.get(e2.fromId)!;
    const mid = g.byId.get(e1.fromId)!;
    if (new Set([first.title, mid.title, ctx.node.title]).size < 3) continue;
    return {
      id: itemId("drill", ctx.node.id, "order", first.id, mid.id),
      prompt: `Which of these comes first on the path to ${ctx.node.title}?`,
      lines: [],
      choices: shuffle(rng, [first.title, mid.title, ctx.node.title]),
      answer: first.title,
      explain: `${first.title}, then ${mid.title}, then ${ctx.node.title}.`,
      provenance: [
        { kind: "edge", ref: e2.id ?? `${e2.fromId}>${e2.toId}` },
        { kind: "edge", ref: e1.id ?? `${e1.fromId}>${e1.toId}` },
      ],
    };
  }
  return null;
}

function drillModule(ctx: ModuleContext, g: Graph, rng: Rng): ModuleItem[] {
  const out: ModuleItem[] = [];
  const self = matchItem(ctx, g, ctx.node, rng);
  if (self) out.push(self);
  for (const e of (g.parents.get(ctx.node.id) ?? []).slice().sort((a, b) => a.fromId.localeCompare(b.fromId)).slice(0, 2)) {
    const m = matchItem(ctx, g, g.byId.get(e.fromId)!, rng);
    if (m) out.push(m);
  }
  const p = prerequisiteItem(ctx, g, rng);
  if (p) out.push(p);
  const o = orderItem(ctx, g, rng);
  if (o) out.push(o);
  return out;
}

function workedModule(ctx: ModuleContext): ModuleItem[] {
  const out: ModuleItem[] = [];
  const w = ctx.node.workedExample;
  if (w) {
    out.push({ id: itemId("worked", ctx.node.id, "example"), prompt: `Work through this example of ${ctx.node.title}.`, lines: [w.text], choices: null, answer: w.text, explain: `Source: ${w.source}`, provenance: [{ kind: "node", ref: ctx.node.id }] });
  }
  return [...out, ...authoredQuiz(ctx, (l) => l !== "recall")];
}

function edgeFacts(ctx: ModuleContext, g: Graph, rng: Rng): ModuleItem[] {
  const out: ModuleItem[] = [];
  const parents = (g.parents.get(ctx.node.id) ?? []).slice().sort((a, b) => a.fromId.localeCompare(b.fromId));
  const others = unrelated(ctx, g);
  if (parents.length > 0) {
    const e = parents[Math.floor(rng() * parents.length)];
    const p = g.byId.get(e.fromId)!;
    out.push({ id: itemId("quiz", ctx.node.id, "fact-true", p.id), prompt: "True or false?", lines: [`You need ${p.title} before ${ctx.node.title}.`], choices: ["true", "false"], answer: "true", explain: `${p.title} is a prerequisite of ${ctx.node.title}.`, provenance: [{ kind: "edge", ref: e.id ?? `${e.fromId}>${e.toId}` }] });
  }
  if (others.length > 0) {
    const o = others[Math.floor(rng() * Math.min(others.length, 8))];
    out.push({ id: itemId("quiz", ctx.node.id, "fact-false", o.id), prompt: "True or false?", lines: [`You need ${o.title} before ${ctx.node.title}.`], choices: ["true", "false"], answer: "false", explain: `${o.title} is not on the prerequisite path of ${ctx.node.title} in this graph.`, provenance: [{ kind: "node", ref: o.id }, { kind: "node", ref: ctx.node.id }] });
  }
  return out;
}

function quizModule(ctx: ModuleContext, g: Graph, rng: Rng): ModuleItem[] {
  return [...authoredQuiz(ctx, () => true), ...edgeFacts(ctx, g, rng)];
}

export function pathSteps(g: Graph, nodeId: string, mastered: ReadonlySet<string> = new Set()): PathStep[] {
  return Array.from(ancestorIds(g, nodeId))
    .filter((id) => !mastered.has(id))
    .map((id) => g.byId.get(id)!)
    .sort((a, b) => a.tier - b.tier || a.slug.localeCompare(b.slug))
    .map((n) => ({ id: n.id, slug: n.slug, title: n.title, tier: n.tier }));
}

function lessonOf(ctx: ModuleContext): LearningModule["lesson"] {
  const lesson = ctx.items.find((i) => i.kind === "lesson");
  const depths = ctx.items
    .filter((i) => i.kind === "depth")
    .sort((a, b) => a.ordinal - b.ordinal)
    .flatMap((i) => (str(i.body.text) ? [{ level: String(i.body.level ?? i.ordinal), text: String(i.body.text) }] : []));
  const markdown = lesson ? str(lesson.body.markdown) : null;
  return markdown || depths.length ? { markdown, depths } : null;
}

export function generateModule(ctx: ModuleContext, kind: ModuleKind, mastered: ReadonlySet<string> = new Set()): LearningModule {
  const rng = rngFor(`${ctx.node.id}|${kind}`);
  const g = indexGraph(ctx);
  const base: LearningModule = { kind, nodeId: ctx.node.id, items: [], steps: [], lesson: null };
  if (kind === "recall") return { ...base, items: recallModule(ctx, rng) };
  if (kind === "drill") return { ...base, items: drillModule(ctx, g, rng) };
  if (kind === "worked") return { ...base, items: workedModule(ctx) };
  if (kind === "quiz") return { ...base, items: quizModule(ctx, g, rng) };
  return { ...base, steps: pathSteps(g, ctx.node.id, mastered), lesson: lessonOf(ctx) };
}

export function generateModules(ctx: ModuleContext, mastered: ReadonlySet<string> = new Set()): LearningModule[] {
  return MODULE_KINDS.map((k) => generateModule(ctx, k, mastered));
}
