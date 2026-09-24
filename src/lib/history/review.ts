import type { SupabaseClient } from "@supabase/supabase-js";
import { inChunks, pagedRead } from "../research-os/paging";
import { HISTORY_PARSER, type HistoryProposal } from "./importer";

export const SHOW_FROM = 0.5;
export const REVIEW_LIMIT = 500;

interface SilverRow {
  id: string;
  source_id: string;
  source_revision: string;
  span_start: number;
  span_end: number;
  text: string | null;
  confidence: number;
  subject: string;
  status: string;
  proposal: HistoryProposal;
}

interface FactoidRow {
  id: string;
  subject_id: string;
  role: string;
  edtf: string;
  start_min: number;
  end_max: number;
  preferred: boolean;
  status: string;
  silver_item_id: string;
  place_id: string | null;
  confidence: number;
}

export interface ReviewRole {
  role: string;
  edtf: string;
  startMin: number;
  endMax: number;
  place: { slug: string; title: string; lat: number; lng: number } | null;
}

export interface PendingFactoid {
  silverId: string;
  subject: string;
  subjectTitle: string | null;
  subjectExists: boolean;
  source: string;
  rule: string | null;
  span: { start: number; end: number; text: string | null };
  confidence: number;
  roles: ReviewRole[];
}

export interface ConflictSide {
  factoidId: string;
  silverId: string;
  edtf: string;
  startMin: number;
  endMax: number;
  preferred: boolean;
  source: string;
  confidence: number;
  place: string | null;
}

export interface HistoryConflict {
  subject: string;
  subjectTitle: string;
  role: string;
  disjointSpans: boolean;
  differentPlaces: boolean;
  a: ConflictSide;
  b: ConflictSide;
}

export interface HistoryNodeProposal {
  id: string;
  slug: string;
  title: string;
  kind: string;
  branch: string;
  silverIds: string[];
}

export interface HistoryReviewQueue {
  pending: PendingFactoid[];
  pendingTotal: number;
  conflicts: HistoryConflict[];
  proposals: HistoryNodeProposal[];
}

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

function readAll<T>(run: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  return pagedRead<T>((page) => run(page.from, page.to) as Promise<{ data: T[] | null; error: { message: string } | null }>);
}

function byIds<T>(ids: string[], run: (chunk: string[], from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  return inChunks<T>(Array.from(new Set(ids)), (chunk, page) => run(chunk, page.from, page.to) as Promise<{ data: T[] | null; error: { message: string } | null }>);
}

export async function listHistoryReview(svc: SupabaseClient): Promise<Result<HistoryReviewQueue>> {
  try {
    const candidates = await readAll<SilverRow>((from, to) =>
      svc
        .from("silver_items")
        .select("id,source_id,source_revision,span_start,span_end,text,confidence,subject,status,proposal")
        .eq("parser", HISTORY_PARSER)
        .in("status", ["candidate", "promoted"])
        .gte("confidence", SHOW_FROM)
        .order("id")
        .range(from, to),
    );
    const withRoles = candidates.filter((s) => Object.keys(s.proposal?.roles ?? {}).length > 0);
    const decided = new Set(
      (
        await byIds<{ silver_item_id: string }>(
          withRoles.map((s) => s.id),
          (chunk, from, to) => svc.from("factoids").select("id,silver_item_id").in("silver_item_id", chunk).order("id").range(from, to),
        )
      ).map((f) => f.silver_item_id),
    );
    const pendingAll = withRoles.filter((s) => !decided.has(s.id));

    const conflictRows = await readAll<{ subject_id: string; role: string; factoid_a: string; factoid_b: string; disjoint_spans: boolean; different_places: boolean }>((from, to) =>
      svc.from("factoid_conflicts").select("subject_id,role,factoid_a,factoid_b,disjoint_spans,different_places").order("factoid_a").order("factoid_b").range(from, to),
    );
    const factoids = await byIds<FactoidRow>(
      conflictRows.flatMap((c) => [c.factoid_a, c.factoid_b]),
      (chunk, from, to) => svc.from("factoids").select("id,subject_id,role,edtf,start_min,end_max,preferred,status,silver_item_id,place_id,confidence").in("id", chunk).order("id").range(from, to),
    );
    const factoidById = new Map(factoids.map((f) => [f.id, f]));
    const conflictSilver = await byIds<SilverRow>(
      factoids.map((f) => f.silver_item_id),
      (chunk, from, to) => svc.from("silver_items").select("id,source_id,source_revision,span_start,span_end,text,confidence,subject,status,proposal").in("id", chunk).order("id").range(from, to),
    );
    const silverById = new Map([...pendingAll, ...conflictSilver].map((s) => [s.id, s]));

    const proposals = await readAll<{ id: string; key: string; title: string; branch: string; silver_item_id: string | null; draft: { slug?: string; kind?: string } | null }>((from, to) =>
      svc.from("node_proposals").select("id,key,title,branch,silver_item_id,draft").eq("status", "pending").not("silver_item_id", "is", null).order("id").range(from, to),
    );
    const historySilverIds = new Set(pendingAll.map((s) => s.id));
    const historyProposals = proposals.filter((p) => p.silver_item_id && historySilverIds.has(p.silver_item_id) && p.draft?.slug);

    const slugs = [...pendingAll.map((s) => s.subject), ...historyProposals.map((p) => p.draft!.slug!)];
    const nodes = await byIds<{ id: string; slug: string; title: string }>(slugs, (chunk, from, to) => svc.from("nodes").select("id,slug,title").in("slug", chunk).order("id").range(from, to));
    const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));
    const conflictNodes = await byIds<{ id: string; slug: string; title: string }>(
      conflictRows.map((c) => c.subject_id),
      (chunk, from, to) => svc.from("nodes").select("id,slug,title").in("id", chunk).order("id").range(from, to),
    );
    const nodeById = new Map(conflictNodes.map((n) => [n.id, n]));

    const placeSlugs = pendingAll.flatMap((s) => Object.values(s.proposal.roles).map((r) => r?.place_slug).filter((v): v is string => !!v));
    const places = await byIds<{ id: string; slug: string; title: string; lat: number; lng: number; status: string }>(placeSlugs, (chunk, from, to) =>
      svc.from("places").select("id,slug,title,lat,lng,status").in("slug", chunk).order("id").range(from, to),
    );
    const placeIds = factoids.map((f) => f.place_id).filter((v): v is string => !!v);
    const placesById = await byIds<{ id: string; slug: string; title: string; lat: number; lng: number; status: string }>(placeIds, (chunk, from, to) =>
      svc.from("places").select("id,slug,title,lat,lng,status").in("id", chunk).order("id").range(from, to),
    );
    const placeBySlug = new Map(places.filter((p) => p.status === "active").map((p) => [p.slug, p]));
    const placeById = new Map(placesById.map((p) => [p.id, p]));

    const admissions = await byIds<{ source_id: string; source_revision: string; rights_rule: string }>(
      Array.from(silverById.values()).map((s) => s.source_id),
      (chunk, from, to) => svc.from("evidence_source_admissions").select("source_id,source_revision,rights_rule").in("source_id", chunk).order("source_id").order("source_revision").range(from, to),
    );
    const ruleOf = new Map(admissions.map((a) => [`${a.source_id} ${a.source_revision}`, a.rights_rule]));

    const sorted = pendingAll.sort((a, b) => b.confidence - a.confidence || a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id));
    const pending: PendingFactoid[] = sorted.slice(0, REVIEW_LIMIT).map((s) => ({
      silverId: s.id,
      subject: s.subject,
      subjectTitle: nodeBySlug.get(s.subject)?.title ?? null,
      subjectExists: nodeBySlug.has(s.subject),
      source: s.proposal.source,
      rule: ruleOf.get(`${s.source_id} ${s.source_revision}`) ?? null,
      span: { start: s.span_start, end: s.span_end, text: s.text },
      confidence: s.confidence,
      roles: Object.entries(s.proposal.roles).map(([role, r]) => {
        const place = r?.place_slug ? placeBySlug.get(r.place_slug) : undefined;
        return { role, edtf: r!.edtf, startMin: r!.start_min, endMax: r!.end_max, place: place ? { slug: place.slug, title: place.title, lat: place.lat, lng: place.lng } : null };
      }),
    }));

    const side = (id: string): ConflictSide | null => {
      const f = factoidById.get(id);
      if (!f) return null;
      const place = f.place_id ? placeById.get(f.place_id) : undefined;
      return {
        factoidId: f.id,
        silverId: f.silver_item_id,
        edtf: f.edtf,
        startMin: f.start_min,
        endMax: f.end_max,
        preferred: f.preferred,
        source: silverById.get(f.silver_item_id)?.proposal?.source ?? "unknown",
        confidence: f.confidence,
        place: place && place.status === "active" ? place.title : null,
      };
    };
    const conflicts: HistoryConflict[] = conflictRows.flatMap((c) => {
      const a = side(c.factoid_a);
      const b = side(c.factoid_b);
      const node = nodeById.get(c.subject_id);
      if (!a || !b || !node) return [];
      return [{ subject: node.slug, subjectTitle: node.title, role: c.role, disjointSpans: c.disjoint_spans, differentPlaces: c.different_places, a, b }];
    });

    const bySlug = new Map<string, HistoryNodeProposal>();
    const silverBySubject = new Map<string, string[]>();
    for (const s of pendingAll) silverBySubject.set(s.subject, [...(silverBySubject.get(s.subject) ?? []), s.id]);
    for (const p of historyProposals) {
      const slug = p.draft!.slug!;
      if (nodeBySlug.has(slug) || bySlug.has(slug)) continue;
      bySlug.set(slug, { id: p.id, slug, title: p.title, kind: p.draft!.kind ?? "unknown", branch: p.branch, silverIds: silverBySubject.get(slug) ?? [] });
    }

    return { ok: true, value: { pending, pendingTotal: pendingAll.length, conflicts, proposals: Array.from(bySlug.values()).sort((x, y) => x.slug.localeCompare(y.slug)) } };
  } catch (err) {
    console.error("[history-review] read failed:", err instanceof Error ? err.message : String(err));
    return { ok: false, status: 500, error: "read_failed" };
  }
}

export type HistoryDecision =
  | { action: "approve"; silverId: string }
  | { action: "reject"; silverId: string; reason: string }
  | { action: "prefer"; silverId: string; role: string };

export function parseHistoryDecision(body: unknown): { ok: true; value: HistoryDecision } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const silverId = typeof b.silverId === "string" ? b.silverId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(silverId)) return { ok: false, error: "silverId must be a uuid" };
  if (b.action === "approve") return { ok: true, value: { action: "approve", silverId } };
  if (b.action === "reject") {
    const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 500) : "";
    if (!reason) return { ok: false, error: "a reason is required to reject" };
    return { ok: true, value: { action: "reject", silverId, reason } };
  }
  if (b.action === "prefer") {
    const role = typeof b.role === "string" ? b.role.trim() : "";
    if (!role) return { ok: false, error: "role is required to prefer" };
    return { ok: true, value: { action: "prefer", silverId, role } };
  }
  return { ok: false, error: "action must be approve, reject or prefer" };
}

export async function decideHistory(svc: SupabaseClient, reviewerId: string, d: HistoryDecision): Promise<Result<Record<string, unknown>>> {
  if (d.action === "reject") {
    const { data, error } = await svc.rpc("reject_history_silver", { p_silver: d.silverId, p_reviewer: reviewerId, p_reason: d.reason });
    if (error) return { ok: false, status: 500, error: "reject_failed" };
    const r = data as { ok: boolean; error?: string; changed?: boolean };
    return r.ok ? { ok: true, value: { decision: "rejected", changed: r.changed } } : { ok: false, status: r.error === "silver_not_found" ? 404 : 409, error: r.error ?? "reject_refused" };
  }
  if (d.action === "prefer") {
    const { data, error } = await svc.rpc("prefer_history_factoid", { p_silver: d.silverId, p_role: d.role });
    if (error) return { ok: false, status: 500, error: "prefer_failed" };
    const r = data as { ok: boolean; error?: string; changed?: boolean };
    return r.ok ? { ok: true, value: { decision: "preferred", changed: r.changed } } : { ok: false, status: r.error === "factoid_not_found" ? 404 : 409, error: r.error ?? "prefer_refused" };
  }
  const { data: item, error: readErr } = await svc.from("silver_items").select("id,subject,parser,status,proposal").eq("id", d.silverId).maybeSingle();
  if (readErr) return { ok: false, status: 500, error: "read_failed" };
  if (!item) return { ok: false, status: 404, error: "silver_not_found" };
  const s = item as { subject: string; parser: string; status: string; proposal: HistoryProposal };
  if (s.parser !== HISTORY_PARSER) return { ok: false, status: 409, error: "not_history" };
  if (s.status === "rejected" || s.status === "withdrawn") return { ok: false, status: 409, error: `silver_${s.status}` };
  const { data: node, error: nodeErr } = await svc.from("nodes").select("id").eq("slug", s.subject).maybeSingle();
  if (nodeErr) return { ok: false, status: 500, error: "read_failed" };
  if (!node) return { ok: false, status: 409, error: "subject_node_missing" };
  const { data: promoted, error: promoteErr } = await svc.rpc("promote_history_factoid", { p_silver: d.silverId, p_reviewer: reviewerId, p_preferred: false });
  if (promoteErr) return { ok: false, status: 409, error: "promote_refused" };
  const p = promoted as { ok: boolean; error?: string; factoids?: string[]; inserted?: number };
  if (!p.ok) return { ok: false, status: 409, error: p.error ?? "promote_refused" };
  const preferred: string[] = [];
  for (const role of Object.keys(s.proposal.roles ?? {})) {
    const { count, error } = await svc
      .from("factoids")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", (node as { id: string }).id)
      .eq("role", role)
      .eq("preferred", true)
      .eq("status", "active");
    if (error) return { ok: false, status: 500, error: "read_failed" };
    if ((count ?? 0) > 0) continue;
    const { error: prefErr } = await svc.rpc("prefer_history_factoid", { p_silver: d.silverId, p_role: role });
    if (prefErr) return { ok: false, status: 500, error: "prefer_failed" };
    preferred.push(role);
  }
  return { ok: true, value: { decision: "approved", inserted: p.inserted ?? 0, factoids: p.factoids ?? [], preferred } };
}
