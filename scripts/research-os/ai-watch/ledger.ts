/**
 * The daily AI watch's ledger (ros-ai-watch, learning/research-os/ai/
 * EVALUATION.md, "Industry news and plan updates").
 *
 * The watch already runs once a day as the operator's scheduled task. It
 * appends to an operator-local JSONL ledger, and this module holds the
 * ledger to the plan's rules: every assessed item carries its primary
 * sources, mechanism, evidence level, closest work, Bucket component,
 * rights and compute, a falsifiable test and a disposition; items are
 * deduplicated by source URL plus model or code revision, and a new
 * revision reopens its source; every run records what it checked and what
 * failed, so an unavailable feed never reads as an all-clear; and a
 * milestone takes at most one proposed amendment.
 *
 * A line is an `item`, a `run` or a `selection`. Lines are append-only;
 * the latest line for an item key is its current assessment and the
 * earlier ones are its history.
 */
import { createHash } from "node:crypto";

export const EVIDENCE_LEVELS = ["vendor-claim", "preprint", "peer-reviewed", "independent-benchmark", "reproduced-here"] as const;
export const DISPOSITIONS = ["ignore", "prior-art", "evaluate", "propose-amendment"] as const;
export const COMPONENTS = ["evidence-search", "encoder", "reranker", "passage-extraction", "tutor", "engine", "graph", "imports", "none"] as const;
/** EVALUATION.md: up to twelve candidates a run, then at most four deep reads. */
export const MAX_CANDIDATES = 12;
export const MAX_DEEP_READS = 4;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export type Disposition = (typeof DISPOSITIONS)[number];
export type Component = (typeof COMPONENTS)[number];

export interface ItemLine {
  kind: "item";
  sourceUrl: string;
  /** A model, code or document revision; empty for an announcement with none. */
  revision: string;
  title: string;
  releasedAt: string;
  discoveredAt: string;
  assessedAt: string;
  primarySources: string[];
  mechanism: string;
  evidenceLevel: EvidenceLevel;
  closestWork: string;
  component: Component;
  rightsCompute: { license: string; weightsAvailable: boolean; paid: boolean; compute: string };
  test: string;
  disposition: Disposition;
  notes?: string;
}

export interface RunLine {
  kind: "run";
  runAt: string;
  window: { from: string; to: string };
  sourcesChecked: string[];
  failures: { source: string; error: string }[];
  candidates: number;
  deepReads: number;
}

export interface SelectionLine {
  kind: "selection";
  milestone: string;
  itemKey: string;
  selectedAt: string;
  selectedBy: string;
  replaces: string;
}

export type Line = ItemLine | RunLine | SelectionLine;

const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z)?$/;
const isDate = (v: unknown) => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));
const text = (v: unknown, min = 1) => typeof v === "string" && v.trim().length >= min;

/** An https URL without fragment or trailing slash, so one page is one key. */
export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    const s = u.toString();
    return s.endsWith("/") && u.pathname !== "/" ? s.slice(0, -1) : s;
  } catch {
    return null;
  }
}

/** The dedup key: the source and the revision it describes. */
export function itemKey(item: Pick<ItemLine, "sourceUrl" | "revision">): string {
  const url = canonicalUrl(item.sourceUrl) ?? item.sourceUrl;
  return createHash("sha256").update(`${url}\u0000${item.revision.trim()}`).digest("hex").slice(0, 16);
}

/** Every rule one line breaks. An empty list means the line is sound. */
export function lineProblems(line: unknown): string[] {
  const l = line as Record<string, unknown>;
  if (!l || typeof l !== "object") return ["not an object"];
  const p: string[] = [];
  if (l.kind === "item") {
    const i = l as unknown as ItemLine;
    if (!canonicalUrl(String(i.sourceUrl ?? ""))) p.push("sourceUrl is an https URL");
    if (typeof i.revision !== "string") p.push("revision is a string, empty when there is none");
    if (!text(i.title)) p.push("title is required");
    for (const k of ["releasedAt", "discoveredAt", "assessedAt"] as const) if (!isDate(i[k])) p.push(`${k} is a date`);
    if (isDate(i.releasedAt) && isDate(i.discoveredAt) && Date.parse(i.discoveredAt) < Date.parse(i.releasedAt)) p.push("discoveredAt precedes releasedAt");
    if (!Array.isArray(i.primarySources) || i.primarySources.length === 0 || !i.primarySources.every((s) => canonicalUrl(String(s)))) {
      p.push("primarySources lists at least one https URL");
    }
    if (!text(i.mechanism, 20)) p.push("mechanism says in a sentence how it works");
    if (!EVIDENCE_LEVELS.includes(i.evidenceLevel)) p.push(`evidenceLevel is one of ${EVIDENCE_LEVELS.join(", ")}`);
    if (!text(i.closestWork)) p.push("closestWork names the nearest known work, or says none was found");
    if (!COMPONENTS.includes(i.component)) p.push(`component is one of ${COMPONENTS.join(", ")}`);
    const rc = i.rightsCompute;
    if (!rc || !text(rc.license) || typeof rc.weightsAvailable !== "boolean" || typeof rc.paid !== "boolean" || !text(rc.compute)) {
      p.push("rightsCompute carries license, weightsAvailable, paid and compute");
    }
    if (!text(i.test, 20)) p.push("test states a falsifiable experiment");
    if (!DISPOSITIONS.includes(i.disposition)) p.push(`disposition is one of ${DISPOSITIONS.join(", ")}`);
    // The allowance for paid calls is zero, so paid work is a proposal with a budget.
    if (rc?.paid && i.disposition === "evaluate") p.push("paid work cannot be evaluated within the current scope; propose an amendment with a budget");
  } else if (l.kind === "run") {
    const r = l as unknown as RunLine;
    if (!isDate(r.runAt)) p.push("runAt is a date");
    if (!r.window || !isDate(r.window.from) || !isDate(r.window.to) || Date.parse(r.window.from) > Date.parse(r.window.to)) p.push("window runs from a date to a later one");
    if (!Array.isArray(r.sourcesChecked) || r.sourcesChecked.length === 0) p.push("sourcesChecked lists what the run read");
    if (!Array.isArray(r.failures) || !r.failures.every((f) => text(f?.source) && text(f?.error))) p.push("failures lists each source and its error");
    if (!Number.isInteger(r.candidates) || r.candidates < 0 || r.candidates > MAX_CANDIDATES) p.push(`candidates is 0 to ${MAX_CANDIDATES}`);
    if (!Number.isInteger(r.deepReads) || r.deepReads < 0 || r.deepReads > MAX_DEEP_READS) p.push(`deepReads is 0 to ${MAX_DEEP_READS}`);
    if (Number.isInteger(r.deepReads) && Number.isInteger(r.candidates) && r.deepReads > r.candidates) p.push("deepReads cannot exceed candidates");
  } else if (l.kind === "selection") {
    const s = l as unknown as SelectionLine;
    if (!text(s.milestone)) p.push("milestone is required");
    if (!/^[0-9a-f]{16}$/.test(String(s.itemKey ?? ""))) p.push("itemKey is an item's 16-character key");
    if (!isDate(s.selectedAt)) p.push("selectedAt is a date");
    if (!text(s.selectedBy)) p.push("selectedBy names who chose");
    if (!text(s.replaces)) p.push("replaces names the comparison arm the item takes over");
  } else {
    p.push(`unknown line kind ${String(l.kind)}`);
  }
  return p;
}

export interface Ledger {
  /** The latest assessment per item key, with how many versions it has. */
  items: Map<string, { current: ItemLine; versions: number; reopens: string | null }>;
  runs: RunLine[];
  selections: SelectionLine[];
  problems: string[];
}

/** Reads and checks a ledger file's text. */
export function readLedger(textIn: string): Ledger {
  const items: Ledger["items"] = new Map();
  const runs: RunLine[] = [];
  const selections: SelectionLine[] = [];
  const problems: string[] = [];
  const bySource = new Map<string, string>();
  textIn.split("\n").forEach((raw, n) => {
    if (!raw.trim()) return;
    let line: Line;
    try {
      line = JSON.parse(raw) as Line;
    } catch {
      problems.push(`line ${n + 1}: not JSON`);
      return;
    }
    const bad = lineProblems(line);
    if (bad.length) {
      problems.push(...bad.map((b) => `line ${n + 1}: ${b}`));
      return;
    }
    if (line.kind === "item") {
      const key = itemKey(line);
      const prev = items.get(key);
      const url = canonicalUrl(line.sourceUrl)!;
      // A new revision of a source already assessed reopens it under a new key.
      const earlier = bySource.get(url);
      const reopens = prev ? prev.reopens : earlier && earlier !== key ? earlier : null;
      items.set(key, { current: line, versions: (prev?.versions ?? 0) + 1, reopens });
      bySource.set(url, key);
    } else if (line.kind === "run") {
      runs.push(line);
    } else {
      if (selections.some((s) => s.milestone === line.milestone)) {
        problems.push(`line ${n + 1}: milestone ${line.milestone} already has its one selection`);
        return;
      }
      if (!items.has(line.itemKey)) problems.push(`line ${n + 1}: selection names item ${line.itemKey}, which the ledger does not hold before it`);
      else if (items.get(line.itemKey)!.current.disposition !== "propose-amendment") problems.push(`line ${n + 1}: item ${line.itemKey} is not a proposed amendment`);
      selections.push(line);
    }
  });
  return { items, runs, selections, problems };
}

/** Whether an appended item line adds anything: new key, or a changed assessment. */
export function isDuplicate(ledger: Ledger, item: ItemLine): boolean {
  const cur = ledger.items.get(itemKey(item))?.current;
  if (!cur) return false;
  const strip = (x: ItemLine) => JSON.stringify({ ...x, assessedAt: "", discoveredAt: "" });
  return strip(cur) === strip(item);
}

export interface Report {
  notify: boolean;
  reasons: string[];
  lastRun: RunLine | null;
  newSince: ItemLine[];
  byDisposition: Record<Disposition, number>;
  openProposals: { key: string; title: string; component: Component }[];
}

/**
 * What changed since `since`. Quiet when nothing material happened; loud
 * on a failed source, an item to evaluate, a proposed amendment, or a day
 * with no run at all.
 */
export function report(ledger: Ledger, since: string, now: string): Report {
  const t = Date.parse(since);
  const newSince = Array.from(ledger.items.values())
    .map((v) => v.current)
    .filter((i) => Date.parse(i.assessedAt) >= t);
  const byDisposition = Object.fromEntries(DISPOSITIONS.map((d) => [d, newSince.filter((i) => i.disposition === d).length])) as Record<Disposition, number>;
  const selected = new Set(ledger.selections.map((s) => s.itemKey));
  const openProposals = Array.from(ledger.items.entries())
    .filter(([k, v]) => v.current.disposition === "propose-amendment" && !selected.has(k))
    .map(([k, v]) => ({ key: k, title: v.current.title, component: v.current.component }));
  const runs = ledger.runs.filter((r) => Date.parse(r.runAt) >= t).sort((a, b) => Date.parse(a.runAt) - Date.parse(b.runAt));
  const lastRun = runs.length ? runs[runs.length - 1] : null;
  const reasons: string[] = [];
  if (!lastRun) reasons.push(`no watch run recorded since ${since}`);
  else if (Date.parse(now) - Date.parse(lastRun.runAt) > 36 * 3600 * 1000) reasons.push(`the last run was ${lastRun.runAt}, more than 36 hours ago`);
  for (const r of runs) for (const f of r.failures) reasons.push(`${r.runAt}: ${f.source} failed: ${f.error}`);
  if (byDisposition.evaluate) reasons.push(`${byDisposition.evaluate} to evaluate within current scope`);
  if (byDisposition["propose-amendment"]) reasons.push(`${byDisposition["propose-amendment"]} proposed amendments`);
  if (ledger.problems.length) reasons.push(`${ledger.problems.length} ledger lines break the contract`);
  return { notify: reasons.length > 0, reasons, lastRun, newSince, byDisposition, openProposals };
}
