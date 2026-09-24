import type { RightsPolicy } from "../research-os/evidence/rights";
import { byteLength, byteSlice, sha256Hex } from "../research-os/evidence/text";
import type { IngestNodeDraft } from "../research-os/ingest/types";
import { slugifyPart } from "../research-os/ingest/types";
import type { NodeKind } from "../research-os/types";
import { bronzeRecord, type BronzeRecord, type BronzeRights } from "../research-os/medallion/bronze";
import { combineConfidence, HIDE_BELOW } from "../research-os/medallion/silver";
import { parseEdtf, parseLifespan, parseYear, type Span } from "./span";

export const HISTORY_PARSER = "history-import";
export const HISTORY_PARSER_REVISION = "history-import/1";
export const CANON_RULES = ["canon-site", "canon-figure", "canon-timeline"] as const;
export const SACRED_SNAPSHOT_DATE = "2026-09-23";
export const SACRED_DIR = `_intake/history/wikidata-sacred/${SACRED_SNAPSHOT_DATE}`;

export type HistoryRole = "born" | "died" | "flourished" | "occurred" | "founded" | "occupied" | "composed" | "published" | "arose";
export type SourceKind = "sites" | "timeline" | "figures" | "sacred" | "snapshot";

export interface HistorySource {
  repoPath: string;
  rule: string;
  kind: SourceKind;
  prior: number;
}

export const HISTORY_SOURCES: HistorySource[] = [
  { repoPath: "src/data/canon-sites.json", rule: "canon-site", kind: "sites", prior: 0.9 },
  { repoPath: "src/data/canon-timeline.json", rule: "canon-timeline", kind: "timeline", prior: 0.9 },
  { repoPath: "canon-figures/figures.json", rule: "canon-figure", kind: "figures", prior: 0.6 },
  { repoPath: `${SACRED_DIR}/timeline-events.jsonl`, rule: "wikidata-cc0", kind: "sacred", prior: 0.8 },
  { repoPath: `${SACRED_DIR}/wikidata-sacred-events.json`, rule: "wikidata-cc0", kind: "snapshot", prior: 0.8 },
];

export const COMPOSITE_FIGURES = ["watson-crick", "hodgkin-huxley"];

export interface NodeRef {
  slug: string;
  title: string;
  kind: string;
}

export type RoleFields = Span & { place_slug?: string };

export interface HistoryProposal {
  source: string;
  record: string;
  field: string;
  roles: Partial<Record<HistoryRole, RoleFields>>;
  refusal?: { reason: string; detail: string };
  subject_kind: NodeKind;
  subject_resolved: boolean;
}

export interface HistorySilver {
  source_id: string;
  source_revision: string;
  kind: "claim";
  span_start: number;
  span_end: number;
  locator: string | null;
  text_hash: string;
  text: string | null;
  parser: string;
  parser_revision: string;
  confidence: number;
  confidence_parts: Record<string, number>;
  proposal: HistoryProposal;
  subject: string;
}

export interface PlaceDraft {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  siteSlug: string | null;
  repoPath: string;
}

export interface NodeProposalDraft {
  draft: IngestNodeDraft;
  silver: HistorySilver;
}

export interface Promotion {
  silver: HistorySilver;
  preferredRoles: HistoryRole[];
}

export interface HistoryPlan {
  bronze: BronzeRecord[];
  silver: HistorySilver[];
  places: PlaceDraft[];
  proposals: NodeProposalDraft[];
  promotions: Promotion[];
  counts: Record<string, number>;
}

export interface HistoryInput {
  files: Map<string, Uint8Array>;
  policy: RightsPolicy;
  nodes: NodeRef[];
}

export function rightsFor(policy: RightsPolicy, ruleId: string): BronzeRights {
  const rule = policy.index.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`the rights policy has no rule ${ruleId}`);
  return { rule: rule.id, revision: rule.rightsRevision, allowIndex: rule.allow, permission: rule.permission };
}

export function valueSpan(text: string, recordId: string, field: string): { start: number; end: number; value: string } | null {
  const key = `"id": ${JSON.stringify(recordId)}`;
  let at = text.indexOf(key);
  while (at >= 0) {
    const after = text[at + key.length];
    if (after === "," || after === "}" || after === "\n" || after === " ") break;
    at = text.indexOf(key, at + 1);
  }
  if (at < 0) return null;
  const next = text.indexOf(`"id": `, at + key.length);
  const fieldKey = `"${field}": `;
  const f = text.indexOf(fieldKey, at + key.length);
  if (f < 0 || (next >= 0 && f > next)) return null;
  let start = f + fieldKey.length;
  let end: number;
  if (text[start] === '"') {
    start += 1;
    end = start;
    while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
  } else {
    const m = /^-?[0-9]+/.exec(text.slice(start));
    if (!m) return null;
    end = start + m[0].length;
  }
  return { start: byteLength(text.slice(0, start)), end: byteLength(text.slice(0, end)), value: text.slice(start, end) };
}

function plainAscii(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function words(s: string): string[] {
  return plainAscii(s).match(/[a-z]+/g) ?? [];
}

export function canonBranch(branch: string | undefined): string {
  if (!branch) return "08-deep-history";
  return /^\d{2}-/.test(branch) ? branch : `08-${branch}`;
}

interface Resolution {
  slug: string;
  resolved: boolean;
  match: number;
}

function resolveFigure(recordId: string, title: string, bySlug: Map<string, NodeRef>, figures: NodeRef[]): Resolution {
  const exact = `figure-${slugifyPart(recordId)}`;
  if (bySlug.get(exact)?.kind === "figure") return { slug: exact, resolved: true, match: 1 };
  const head = words(title.split(" — ")[0].split(" (")[0]);
  const last = head[head.length - 1];
  const singles = figures.filter((f) => !COMPOSITE_FIGURES.some((c) => f.slug === `figure-${c}`));
  const hits = last ? singles.filter((f) => words(f.title).includes(last)) : [];
  if (hits.length === 1) return { slug: hits[0].slug, resolved: true, match: 0.8 };
  return { slug: exact, resolved: false, match: 1 };
}

function resolveKind(slug: string, kind: NodeKind, bySlug: Map<string, NodeRef>): Resolution {
  return { slug, resolved: bySlug.get(slug)?.kind === kind, match: 1 };
}

function placeTitle(title: string): string {
  const parts = title.split(" — ");
  return (parts.length > 1 ? parts[parts.length - 1] : title).trim();
}

function silverFor(
  bronze: BronzeRecord,
  span: { start: number; end: number },
  subject: string,
  parts: Record<string, number>,
  proposal: HistoryProposal,
): HistorySilver {
  const slice = byteSlice(bronze.text, span.start, span.end);
  return {
    source_id: bronze.sourceId,
    source_revision: bronze.sourceRevision,
    kind: "claim",
    span_start: span.start,
    span_end: span.end,
    locator: `${proposal.record}#${proposal.field}`,
    text_hash: sha256Hex(slice),
    text: bronze.rights.allowIndex ? slice : null,
    parser: HISTORY_PARSER,
    parser_revision: HISTORY_PARSER_REVISION,
    confidence: combineConfidence(parts),
    confidence_parts: parts,
    proposal,
    subject,
  };
}

type Sites = { sites: { id: string; title: string; lat: number; lng: number; year: number; civilization?: string; branch?: string }[] };
type Timeline = { events: { id: string; title: string; lat: number; lng: number; year: number; branch?: string; kind: string }[] };
type SacredRow = { id: string; label: string; event_class: string; wikidata: string; date: { value: string; calendar?: string } };
type Figures = { figures: { id: string; name: string; lifespan?: string; branches?: string[]; summary?: string }[] };

const TIMELINE_ROLES: Record<string, { role: HistoryRole; kind: NodeKind; prefix: string; tier: number }> = {
  "figure-birth": { role: "born", kind: "figure", prefix: "figure", tier: 13 },
  work: { role: "composed", kind: "primary_source", prefix: "work", tier: 13 },
  "figure-event": { role: "occurred", kind: "event", prefix: "event", tier: 13 },
};

export function planHistory(input: HistoryInput): HistoryPlan {
  const bySlug = new Map(input.nodes.map((n) => [n.slug, n]));
  const figureNodes = input.nodes.filter((n) => n.kind === "figure");
  const bronze: BronzeRecord[] = [];
  const silver: HistorySilver[] = [];
  const places: PlaceDraft[] = [];
  const proposals: NodeProposalDraft[] = [];
  const counts: Record<string, number> = {};
  const bump = (k: string, by = 1) => (counts[k] = (counts[k] ?? 0) + by);
  const proposed = new Set<string>();

  const propose = (draft: IngestNodeDraft, item: HistorySilver) => {
    if (proposed.has(draft.slug)) return;
    proposed.add(draft.slug);
    proposals.push({ draft, silver: item });
  };

  for (const source of HISTORY_SOURCES) {
    const bytes = input.files.get(source.repoPath);
    if (!bytes) throw new Error(`history source missing: ${source.repoPath}`);
    const b = bronzeRecord(source.repoPath, bytes, rightsFor(input.policy, source.rule));
    bronze.push(b);
    if (source.kind === "snapshot") continue;

    if (source.kind === "sites") {
      for (const s of (JSON.parse(b.text) as Sites).sites) {
        const at = valueSpan(b.text, s.id, "year");
        if (!at) throw new Error(`${source.repoPath}: no year for ${s.id}`);
        const subject = resolveKind(`site-${slugifyPart(s.id)}`, "site", bySlug);
        const placeSlug = `bucket-site-${slugifyPart(s.id)}`;
        places.push({ slug: placeSlug, title: s.title, lat: s.lat, lng: s.lng, siteSlug: subject.resolved ? subject.slug : null, repoPath: source.repoPath });
        const parsed = parseYear(s.year, "historical");
        const roles = parsed.ok ? { founded: { ...parsed.span, place_slug: placeSlug } } : {};
        const item = silverFor(b, at, subject.slug, { prior: source.prior, parse: parsed.ok ? 1 : 0, match: subject.match }, {
          source: source.repoPath,
          record: s.id,
          field: "year",
          roles,
          ...(parsed.ok ? {} : { refusal: { reason: parsed.refusal, detail: parsed.detail } }),
          subject_kind: "site",
          subject_resolved: subject.resolved,
        });
        silver.push(item);
        bump(parsed.ok ? "sites_parsed" : "sites_refused");
        if (!subject.resolved) {
          propose({ slug: subject.slug, title: s.title, kind: "site", tier: 13, branch: canonBranch(s.branch), summary: s.civilization ?? null, labels: { en: { title: s.title } }, provenance: { type: "canon_site", site_id: s.id } }, item);
        }
      }
      continue;
    }

    if (source.kind === "sacred") {
      const rows = b.text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as SacredRow);
      for (const r of rows) {
        const at = valueSpan(b.text, r.id, "value");
        if (!at) throw new Error(`${source.repoPath}: no date value for ${r.id}`);
        const subject = resolveKind(`event-wikidata-${slugifyPart(r.wikidata)}`, "event", bySlug);
        const parsed = parseEdtf(r.date.value, { calendar: r.date.calendar === "julian" ? "julian" : "gregorian" });
        const roles = parsed.ok ? { occurred: parsed.span } : {};
        const item = silverFor(b, at, subject.slug, { prior: source.prior, parse: parsed.ok ? 1 : 0, match: subject.match }, {
          source: source.repoPath,
          record: r.id,
          field: "date.value",
          roles,
          ...(parsed.ok ? {} : { refusal: { reason: parsed.refusal, detail: parsed.detail } }),
          subject_kind: "event",
          subject_resolved: subject.resolved,
        });
        silver.push(item);
        bump(parsed.ok ? "sacred_parsed" : "sacred_refused");
        if (!subject.resolved && parsed.ok) {
          propose(
            {
              slug: subject.slug,
              title: r.label,
              kind: "event",
              tier: 13,
              branch: "08-tradition",
              summary: `${r.label}, ${r.event_class}, Wikidata ${r.wikidata}.`,
              labels: { en: { title: r.label } },
              provenance: { type: "wikidata_sacred", qid: r.wikidata, event_class: r.event_class, record: r.id },
            },
            item,
          );
        }
      }
      continue;
    }

    if (source.kind === "timeline") {
      for (const e of (JSON.parse(b.text) as Timeline).events) {
        const spec = TIMELINE_ROLES[e.kind];
        if (!spec) throw new Error(`${source.repoPath}: unknown timeline kind ${e.kind} for ${e.id}`);
        const at = valueSpan(b.text, e.id, "year");
        if (!at) throw new Error(`${source.repoPath}: no year for ${e.id}`);
        const subject =
          spec.kind === "figure" ? resolveFigure(e.id, e.title, bySlug, figureNodes) : resolveKind(`${spec.prefix}-${slugifyPart(e.id)}`, spec.kind, bySlug);
        const placeSlug = `bucket-timeline-${slugifyPart(e.id)}`;
        places.push({ slug: placeSlug, title: placeTitle(e.title), lat: e.lat, lng: e.lng, siteSlug: null, repoPath: source.repoPath });
        const parsed = parseYear(e.year, "historical");
        const roles = parsed.ok ? { [spec.role]: { ...parsed.span, place_slug: placeSlug } } : {};
        const item = silverFor(b, at, subject.slug, { prior: source.prior, parse: parsed.ok ? 1 : 0, match: subject.match }, {
          source: source.repoPath,
          record: e.id,
          field: "year",
          roles,
          ...(parsed.ok ? {} : { refusal: { reason: parsed.refusal, detail: parsed.detail } }),
          subject_kind: spec.kind,
          subject_resolved: subject.resolved,
        });
        silver.push(item);
        bump(`timeline_${spec.role}`);
        if (!subject.resolved) {
          const title = e.title.split(" — ")[0].trim() || e.title;
          propose(
            {
              slug: subject.slug,
              title: spec.kind === "figure" ? title : e.title,
              kind: spec.kind,
              tier: spec.tier,
              branch: canonBranch(e.branch),
              summary: e.title,
              labels: { en: { title: spec.kind === "figure" ? title : e.title } },
              provenance: { type: "canon_timeline", timeline_id: e.id, timeline_kind: e.kind },
            },
            item,
          );
        }
      }
      continue;
    }

    for (const f of (JSON.parse(b.text) as Figures).figures) {
      if (!f.lifespan) continue;
      const at = valueSpan(b.text, f.id, "lifespan");
      if (!at) throw new Error(`${source.repoPath}: no lifespan for ${f.id}`);
      const subject = resolveKind(`figure-${slugifyPart(f.id)}`, "figure", bySlug);
      const parsed = parseLifespan(f.lifespan);
      const roles = parsed.ok ? (parsed.roles as Partial<Record<HistoryRole, RoleFields>>) : {};
      const item = silverFor(b, at, subject.slug, { prior: source.prior, parse: parsed.ok ? 1 : 0, match: subject.match }, {
        source: source.repoPath,
        record: f.id,
        field: "lifespan",
        roles,
        ...(parsed.ok ? {} : { refusal: { reason: parsed.refusal, detail: parsed.detail } }),
        subject_kind: "figure",
        subject_resolved: subject.resolved,
      });
      silver.push(item);
      if (parsed.ok) {
        bump("figures_parsed");
        for (const role of Object.keys(parsed.roles)) bump(`figures_${role}`);
      } else {
        bump(parsed.refusal === "composite" ? "figures_composite" : "figures_refused");
      }
      if (!subject.resolved && parsed.ok) {
        propose({ slug: subject.slug, title: f.name, kind: "figure", tier: 13, branch: canonBranch(f.branches?.[0]), summary: f.summary ?? null, labels: { en: { title: f.name } }, provenance: { type: "canon_figure", figure_id: f.id } }, item);
      }
    }
  }

  const promotions = choosePromotions(silver);
  counts.silver = silver.length;
  counts.hidden = silver.filter((s) => s.confidence < HIDE_BELOW).length;
  counts.places = places.length;
  counts.proposals = proposals.length;
  counts.promotions = promotions.length;
  counts.bronze = bronze.length;
  return { bronze, silver, places, proposals, promotions, counts };
}

const SOURCE_ORDER = new Map(HISTORY_SOURCES.map((s, i) => [s.repoPath, i]));

export function choosePromotions(silver: HistorySilver[]): Promotion[] {
  const canon = new Set<string>(CANON_RULES);
  const ruleOf = new Map(HISTORY_SOURCES.map((s) => [s.repoPath, s.rule]));
  const eligible = silver.filter(
    (s) => canon.has(ruleOf.get(s.proposal.source) ?? "") && s.proposal.subject_resolved && s.confidence >= HIDE_BELOW && Object.keys(s.proposal.roles).length > 0,
  );
  const rank = (s: HistorySilver) => [-s.confidence, SOURCE_ORDER.get(s.proposal.source) ?? 99, s.span_start] as const;
  const better = (a: HistorySilver, b: HistorySilver) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] < rb[i];
    return false;
  };
  const winner = new Map<string, HistorySilver>();
  for (const s of eligible) {
    for (const role of Object.keys(s.proposal.roles)) {
      const key = `${s.subject} ${role}`;
      const held = winner.get(key);
      if (!held || better(s, held)) winner.set(key, s);
    }
  }
  return eligible.map((s) => ({
    silver: s,
    preferredRoles: (Object.keys(s.proposal.roles) as HistoryRole[]).filter((role) => winner.get(`${s.subject} ${role}`) === s),
  }));
}

export function silverKeyOf(s: Pick<HistorySilver, "source_id" | "source_revision" | "parser" | "parser_revision" | "kind" | "span_start" | "span_end" | "subject">): string {
  return [s.source_id, s.source_revision, s.parser, s.parser_revision, s.kind, s.span_start, s.span_end, s.subject].join(" ");
}
