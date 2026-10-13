export const REVIEW_SLUG = "atom-alignment";
export const REVIEW_SCHEMA = "bucket.alignment-review/1";
export const REASONS = ["wrong level", "broader", "narrower", "different topic in the same field"] as const;
export type Reason = (typeof REASONS)[number];
export const DECISIONS = ["right", "partly", "wrong", "added", "no-match"] as const;
export type DecisionKind = (typeof DECISIONS)[number];
export const QUEUES = ["review-first", "review-second"] as const;
export type Queue = (typeof QUEUES)[number];

export interface Link {
  id: string;
  atom: string;
  row: string | null;
  table: string | null;
  level: string | null;
  match: string;
  score: number;
  method: string;
  url: string | null;
  code: string | null;
}

export interface Decision {
  schema: typeof REVIEW_SCHEMA;
  atom: string;
  link: string | null;
  row: string | null;
  decision: DecisionKind;
  reason: Reason | null;
  reviewer: string;
  at: string;
  previous?: Earlier[];
}

export interface Earlier {
  decision: DecisionKind;
  reason: Reason | null;
  reviewer: string;
  at: string;
}

export const HISTORY_CAP = 10;

export interface Edge {
  prerequisite: string;
  dependent: string;
  queue: string;
}

const ATOM = /^atom:([a-z0-9][a-z0-9-]{0,63})\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export function atomParts(id: string): { deck: string; slug: string } | null {
  const m = ATOM.exec(id);
  return m ? { deck: m[1], slug: m[2] } : null;
}

function lines<T>(text: string, read: (raw: Record<string, unknown>) => T | null): T[] {
  const out: T[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = read(JSON.parse(line) as Record<string, unknown>);
      if (row) out.push(row);
    } catch {
      continue;
    }
  }
  return out;
}

export function parseLinks(text: string): Link[] {
  return lines(text, (r) => {
    const id = str(r.id);
    const atom = str(r.atom);
    if (!id || !atom || !atomParts(atom)) return null;
    return { id, atom, row: str(r.progression_id), table: str(r.table), level: str(r.level), match: str(r.match) ?? "none", score: typeof r.score === "number" ? r.score : 0, method: str(r.method) ?? "", url: str(r.source_url), code: str(r.course_code) };
  });
}

export function parseEdges(text: string): Edge[] {
  return lines(text, (r) => {
    const prerequisite = str(r.prerequisite);
    const dependent = str(r.dependent);
    const queue = str(r.queue);
    return prerequisite && dependent && queue ? { prerequisite, dependent, queue } : null;
  });
}

export function parseDecisions(text: string): Decision[] {
  return lines(text, (r) => {
    const atom = str(r.atom);
    const decision = DECISIONS.find((d) => d === r.decision);
    const reviewer = str(r.reviewer);
    const at = str(r.at);
    if (r.schema !== REVIEW_SCHEMA || !atom || !atomParts(atom) || !decision || !reviewer || !at || !DAY.test(at)) return null;
    const reason = REASONS.find((x) => x === r.reason) ?? null;
    if (decision === "partly" && !reason) return null;
    const previous = (Array.isArray(r.previous) ? r.previous : []).flatMap((raw): Earlier[] => {
      const e = raw as Record<string, unknown> | null;
      const kind = DECISIONS.find((d) => d === e?.decision);
      const who = str(e?.reviewer);
      const when = str(e?.at);
      return kind && who && when && DAY.test(when) ? [{ decision: kind, reason: REASONS.find((x) => x === e?.reason) ?? null, reviewer: who, at: when }] : [];
    });
    return { schema: REVIEW_SCHEMA, atom, link: str(r.link), row: str(r.row), decision, reason: decision === "partly" ? reason : null, reviewer, at, ...(previous.length ? { previous: previous.slice(0, HISTORY_CAP) } : {}) };
  });
}

const earlier = (d: Decision): Earlier => ({ decision: d.decision, reason: d.reason, reviewer: d.reviewer, at: d.at });
const sameCall = (a: Earlier, b: Earlier) => a.decision === b.decision && a.reason === b.reason && a.reviewer === b.reviewer;

export const decisionKey = (d: Pick<Decision, "atom" | "link" | "row" | "decision">): string => `${d.atom}|${d.decision === "no-match" ? "none" : (d.link ?? `row:${d.row ?? ""}`)}`;

export function cleanReviewer(name: string): string {
  return name.replace(/[\u0000-\u001F\u007F-\u009F؜​-‏‪-‮⁠-⁩﻿]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function serializeDecisions(all: Decision[]): string {
  const sorted = [...all].sort((a, b) => (decisionKey(a) < decisionKey(b) ? -1 : decisionKey(a) > decisionKey(b) ? 1 : 0));
  return sorted.map((d) => JSON.stringify({ schema: d.schema, atom: d.atom, link: d.link, row: d.row, decision: d.decision, reason: d.reason, reviewer: d.reviewer, at: d.at, ...(d.previous?.length ? { previous: d.previous } : {}) })).join("\n") + (sorted.length ? "\n" : "");
}

export function applyDecision(text: string, next: Decision | { remove: string }): string {
  const all = parseDecisions(text);
  const key = "remove" in next ? next.remove : decisionKey(next);
  const kept = all.filter((d) => decisionKey(d) !== key);
  if ("remove" in next) return serializeDecisions(kept);
  const old = all.find((d) => decisionKey(d) === key);
  const history = old ? [...(sameCall(earlier(old), earlier(next)) ? [] : [earlier(old)]), ...(old.previous ?? [])].slice(0, HISTORY_CAP) : [];
  return serializeDecisions([...kept, { ...next, ...(history.length ? { previous: history } : {}) }]);
}

export function mergeDecisions(mine: string, theirs: string): { text: string; added: number; differing: number } {
  const own = new Map(parseDecisions(mine).map((d) => [decisionKey(d), d]));
  let added = 0;
  let differing = 0;
  for (const d of parseDecisions(theirs)) {
    const key = decisionKey(d);
    const kept = own.get(key);
    if (!kept) {
      own.set(key, d);
      added += 1;
    } else if (!sameCall(earlier(kept), earlier(d)) && !(kept.previous ?? []).some((p) => sameCall(p, earlier(d)) && p.at === d.at)) {
      if (kept.decision !== d.decision || kept.reason !== d.reason) differing += 1;
      own.set(key, { ...kept, previous: [...(kept.previous ?? []), earlier(d)].slice(0, HISTORY_CAP) });
    }
  }
  return { text: serializeDecisions([...own.values()]), added, differing };
}

export interface Sample {
  links: number;
  right: number;
  partly: number;
  wrong: number;
}

export function qualitySamples(text: string, table: string): Sample[] {
  try {
    const entry = (JSON.parse(text) as Record<string, Record<string, unknown> | undefined>)[table.split("/").pop() ?? ""];
    if (!entry) return [];
    return Object.values(entry).flatMap((v): Sample[] => {
      const s = v as Record<string, unknown> | null;
      if (!s || typeof s !== "object" || ![s.right, s.partly, s.wrong].every((n) => Number.isInteger(n) && (n as number) >= 0)) return [];
      const sum = (s.right as number) + (s.partly as number) + (s.wrong as number);
      return sum > 0 ? [{ links: sum, right: s.right as number, partly: s.partly as number, wrong: s.wrong as number }] : [];
    });
  } catch {
    return [];
  }
}

export const UNREVIEWED = "Unreviewed proposals. Nobody has checked these links yet, and none is a fact until you mark it.";
export const QUALITY_MISSING = "The measured quality of these proposals is missing from this copy of Bucket.";

export function qualityLine(samples: Sample[]): string {
  if (samples.length === 0) return QUALITY_MISSING;
  const each = (pick: (s: Sample) => number) => samples.map((s) => `${pick(s)} of ${s.links}`).join(" and ");
  const lead = samples.length === 1 ? "One sample was judged by hand" : `${samples.length === 2 ? "Two" : samples.length} samples were judged by hand`;
  return `${lead}: ${each((s) => s.right)} right, ${each((s) => s.partly)} partly right, ${each((s) => s.wrong)} wrong. These counts come from the quality file kept beside the links.`;
}

export interface AtomState {
  links: Link[];
  decided: number;
  none: boolean;
  added: Decision[];
  done: boolean;
}

export function atomState(atom: string, links: Link[], decisions: Map<string, Decision>): AtomState {
  const own = links.filter((l) => l.atom === atom && l.row !== null);
  const decided = own.filter((l) => decisions.has(`${atom}|${l.id}`)).length;
  const none = decisions.has(`${atom}|none`);
  const added = [...decisions.values()].filter((d) => d.atom === atom && d.decision === "added");
  return { links: own, decided, none, added, done: own.length > 0 ? decided === own.length : none || added.length > 0 };
}

export interface DeckProgress {
  deck: string;
  atoms: number;
  done: number;
  links: number;
  decided: number;
  right: number;
}

export function deckProgress(links: Link[], decisions: Map<string, Decision>): DeckProgress[] {
  const atoms = new Map<string, string[]>();
  for (const l of links) {
    const deck = atomParts(l.atom)!.deck;
    const list = atoms.get(deck) ?? [];
    if (!list.includes(l.atom)) list.push(l.atom);
    atoms.set(deck, list);
  }
  return [...atoms.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([deck, ids]) => {
      const states = ids.map((id) => atomState(id, links, decisions));
      const right = [...decisions.values()].filter((d) => d.decision === "right" && atomParts(d.atom)?.deck === deck).length;
      return { deck, atoms: ids.length, done: states.filter((s) => s.done).length, links: states.reduce((n, s) => n + s.links.length, 0), decided: states.reduce((n, s) => n + s.decided, 0), right };
    });
}

export function queuedAtoms(edges: Edge[], queue: Queue): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.queue !== queue) continue;
    out.add(e.prerequisite);
    out.add(e.dependent);
  }
  return out;
}

const ascii = (text: string) => JSON.stringify(text).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
const STATE = /"verified": (?:false|true), "verification": \{[^{}]*\}/;

export function verifiedTable(shipped: string, decisions: Decision[]): { text: string; verified: number } {
  const right = new Map(decisions.filter((d) => d.decision === "right" && d.link).map((d) => [d.link as string, d]));
  let verified = 0;
  const out = shipped.split("\n").map((line) => {
    if (!line.trim() || right.size === 0) return line;
    const id = /^\{"schema": "[^"]*", "id": ("(?:[^"\\]|\\.)*")/.exec(line)?.[1];
    const by = id ? right.get(JSON.parse(id) as string) : undefined;
    if (!by || !STATE.test(line)) return line;
    verified += 1;
    return line.replace(STATE, `"verified": true, "verification": {"status": "verified", "by": ${ascii(by.reviewer)}, "at": ${ascii(by.at)}}`);
  });
  return { text: out.join("\n"), verified };
}

export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
