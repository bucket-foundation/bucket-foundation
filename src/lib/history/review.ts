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
  qid: string | null;
  linked: boolean;
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

export interface IdentityCandidate {
  qid: string;
  label: string | null;
  description: string | null;
  born: number | null;
  died: number | null;
  url: string;
}

export interface IdentityLink {
  id: string;
  subject: string;
  subjectTitle: string;
  reason: "one_candidate" | "several_candidates" | "no_candidate";
  candidates: IdentityCandidate[];
}

export interface HistoryReviewQueue {
  pending: PendingFactoid[];
  pendingTotal: number;
  conflicts: HistoryConflict[];
  proposals: HistoryNodeProposal[];
  identities: IdentityLink[];
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

    const qids = Array.from(new Set(pendingAll.map((s) => s.proposal.qid).filter((q): q is string => !!q)));
    const links = await byIds<{ external_id: string; node_id: string }>(qids, (chunk, from, to) =>
      svc.from("node_external_ids").select("authority,external_id,node_id").eq("authority", "wikidata").in("external_id", chunk).order("authority").order("external_id").range(from, to),
    );
    const linkedTo = new Map(links.map((l) => [l.external_id, l.node_id]));
    const linkNodes = await byIds<{ id: string; slug: string }>(
      links.map((l) => l.node_id),
      (chunk, from, to) => svc.from("nodes").select("id,slug").in("id", chunk).order("id").range(from, to),
    );
    const slugOfNode = new Map(linkNodes.map((n) => [n.id, n.slug]));

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
      qid: s.proposal.qid ?? null,
      linked: s.proposal.qid && s.proposal.subject_kind === "figure" ? slugOfNode.get(linkedTo.get(s.proposal.qid) ?? "") === s.subject : true,
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

    const identityRows = await readAll<{ id: string; node_id: string; reason: IdentityLink["reason"]; candidates: IdentityCandidate[] }>((from, to) =>
      svc.from("external_id_proposals").select("id,node_id,reason,candidates").eq("status", "pending").order("id").range(from, to),
    );
    const identityNodes = await byIds<{ id: string; slug: string; title: string }>(
      identityRows.map((r) => r.node_id),
      (chunk, from, to) => svc.from("nodes").select("id,slug,title").in("id", chunk).order("id").range(from, to),
    );
    const identityNode = new Map(identityNodes.map((n) => [n.id, n]));
    const identities: IdentityLink[] = identityRows
      .flatMap((r) => {
        const n = identityNode.get(r.node_id);
        return n ? [{ id: r.id, subject: n.slug, subjectTitle: n.title, reason: r.reason, candidates: r.candidates }] : [];
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));

    return { ok: true, value: { pending, pendingTotal: pendingAll.length, conflicts, proposals: Array.from(bySlug.values()).sort((x, y) => x.slug.localeCompare(y.slug)), identities } };
  } catch (err) {
    console.error("[history-review] read failed:", err instanceof Error ? err.message : String(err));
    return { ok: false, status: 500, error: "read_failed" };
  }
}

export type HistoryDecision =
  | { action: "approve"; silverId: string }
  | { action: "reject"; silverId: string; reason: string }
  | { action: "prefer"; silverId: string; role: string }
  | { action: "link"; proposalId: string; qid: string }
  | { action: "reject-link"; proposalId: string; reason: string }
  | { action: "withdraw-link"; qid: string; reason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseHistoryDecision(body: unknown): { ok: true; value: HistoryDecision } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 500) : "";
  if (b.action === "withdraw-link") {
    const qid = typeof b.qid === "string" ? b.qid.trim() : "";
    if (!/^Q[0-9]+$/.test(qid)) return { ok: false, error: "qid must be a Wikidata QID" };
    if (!reason) return { ok: false, error: "a reason is required to withdraw a link" };
    return { ok: true, value: { action: "withdraw-link", qid, reason } };
  }
  if (b.action === "link" || b.action === "reject-link") {
    const proposalId = typeof b.proposalId === "string" ? b.proposalId.trim() : "";
    if (!UUID.test(proposalId)) return { ok: false, error: "proposalId must be a uuid" };
    if (b.action === "reject-link") {
      if (!reason) return { ok: false, error: "a reason is required to reject a link" };
      return { ok: true, value: { action: "reject-link", proposalId, reason } };
    }
    const qid = typeof b.qid === "string" ? b.qid.trim() : "";
    if (!/^Q[0-9]+$/.test(qid)) return { ok: false, error: "qid must be a Wikidata QID" };
    return { ok: true, value: { action: "link", proposalId, qid } };
  }
  const silverId = typeof b.silverId === "string" ? b.silverId.trim() : "";
  if (!UUID.test(silverId)) return { ok: false, error: "silverId must be a uuid" };
  if (b.action === "approve") return { ok: true, value: { action: "approve", silverId } };
  if (b.action === "reject") {
    if (!reason) return { ok: false, error: "a reason is required to reject" };
    return { ok: true, value: { action: "reject", silverId, reason } };
  }
  if (b.action === "prefer") {
    const role = typeof b.role === "string" ? b.role.trim() : "";
    if (!role) return { ok: false, error: "role is required to prefer" };
    return { ok: true, value: { action: "prefer", silverId, role } };
  }
  return { ok: false, error: "action must be approve, reject, prefer, link, reject-link or withdraw-link" };
}

export async function decideHistory(svc: SupabaseClient, reviewerId: string, d: HistoryDecision): Promise<Result<Record<string, unknown>>> {
  if (d.action === "withdraw-link") {
    const { data, error } = await svc.rpc("withdraw_external_id", { p_qid: d.qid, p_reviewer: reviewerId, p_reason: d.reason });
    if (error) return { ok: false, status: 500, error: "withdraw_failed" };
    const r = data as { ok: boolean; error?: string; queued?: number };
    return r.ok ? { ok: true, value: { decision: "withdrawn", queued: r.queued ?? 0 } } : { ok: false, status: 404, error: r.error ?? "link_not_found" };
  }
  if (d.action === "link" || d.action === "reject-link") {
    const { data, error } = await svc.rpc("decide_external_id", {
      p_proposal: d.proposalId,
      p_reviewer: reviewerId,
      p_qid: d.action === "link" ? d.qid : null,
      p_reason: d.action === "reject-link" ? d.reason : null,
    });
    if (error) return { ok: false, status: 500, error: "link_failed" };
    const r = data as { ok: boolean; error?: string; changed?: boolean; status?: string };
    return r.ok ? { ok: true, value: { decision: r.status, changed: r.changed } } : { ok: false, status: r.error === "proposal_not_found" ? 404 : 409, error: r.error ?? "link_refused" };
  }
  if (d.action === "reject") {
    const { data, error } = await svc.rpc("reject_history_silver", { p_silver: d.silverId, p_reviewer: reviewerId, p_reason: d.reason });
    if (error) return { ok: false, status: 500, error: "reject_failed" };
    const r = data as { ok: boolean; error?: string; changed?: boolean };
    return r.ok ? { ok: true, value: { decision: "rejected", changed: r.changed } } : { ok: false, status: r.error === "silver_not_found" ? 404 : 409, error: r.error ?? "reject_refused" };
  }
  if (d.action === "prefer") {
    const { data, error } = await svc.rpc("prefer_history_factoid", { p_silver: d.silverId, p_role: d.role, p_reviewer: reviewerId });
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
  if (s.proposal.qid && s.proposal.subject_kind === "figure") {
    const { data: link, error: linkErr } = await svc
      .from("node_external_ids")
      .select("node_id")
      .eq("authority", "wikidata")
      .eq("external_id", s.proposal.qid)
      .maybeSingle();
    if (linkErr) return { ok: false, status: 500, error: "read_failed" };
    if (!link || (link as { node_id: string }).node_id !== (node as { id: string }).id) return { ok: false, status: 409, error: "identity_not_linked" };
  }
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
    const { error: prefErr } = await svc.rpc("prefer_history_factoid", { p_silver: d.silverId, p_role: role, p_reviewer: reviewerId });
    if (prefErr) return { ok: false, status: 500, error: "prefer_failed" };
    preferred.push(role);
  }
  return { ok: true, value: { decision: "approved", inserted: p.inserted ?? 0, factoids: p.factoids ?? [], preferred } };
}
