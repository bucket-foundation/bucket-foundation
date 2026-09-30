import type { NextRequest } from "next/server";
import { awardProgress, graphService, inChunks, verifyLearnerIdentity } from "./db";
import { authorizeNode, authorizeNodes } from "./read-access";
import { canAssign, canManageMembers, canOverride, rolesIn, validateOverride, type Membership, type Role } from "./roles";
import { assignmentStatus, validateAssignment, type Assignment, type AssignmentStatus, type NewAssignment } from "./assignments";
import type { Stage } from "./types";

type MemberRow = { class_id: string; learner_id: string; role: Role; related_learner_id: string | null };
type AssignmentRow = {
  id: string;
  class_id: string;
  target_node_id: string;
  assigned_by: string | null;
  title: string;
  instructions: string | null;
  due_at: string | null;
  required: boolean;
  requires_production: boolean;
  closed_at: string | null;
  created_at: string;
};

function assignmentFromRow(r: AssignmentRow): Assignment & { assignedBy: string | null; createdAt: string } {
  return {
    id: r.id,
    classId: r.class_id,
    targetNodeId: r.target_node_id,
    title: r.title,
    instructions: r.instructions,
    dueAt: r.due_at,
    required: r.required,
    requiresProduction: r.requires_production,
    closedAt: r.closed_at,
    assignedBy: r.assigned_by,
    createdAt: r.created_at,
  };
}

export async function loadMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await graphService().from("class_members").select("class_id,learner_id,role,related_learner_id").eq("learner_id", userId);
  if (error) throw new Error(`loadMemberships: class_members read failed: ${error.message}`);
  if (!data) return [];
  return (data as MemberRow[]).map((r) => ({ classId: r.class_id, userId: r.learner_id, role: (r.role || "learner") as Role, relatedLearnerId: r.related_learner_id }));
}

export async function loadClassMemberships(classId: string): Promise<Membership[]> {
  const { data, error } = await graphService().from("class_members").select("class_id,learner_id,role,related_learner_id").eq("class_id", classId);
  if (error) throw new Error(`loadClassMemberships: class_members read failed: ${error.message}`);
  if (!data) return [];
  return (data as MemberRow[]).map((r) => ({ classId: r.class_id, userId: r.learner_id, role: (r.role || "learner") as Role, relatedLearnerId: r.related_learner_id }));
}

export interface ClassStaff {
  id: string;
  email: string | null;
  roles: Role[];
}

export type StaffCheck = { ok: true; staff: ClassStaff | null } | { ok: false; reason: "unavailable" };

export async function verifyClassStaff(req: NextRequest, classId: string): Promise<StaffCheck> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity) return { ok: true, staff: null };
  const svc = graphService();
  const { data: cls, error } = await svc.from("classes").select("id,reviewer_email").eq("id", classId).maybeSingle();
  if (error) {
    console.error("[research-os/class] classes read failed:", error.message);
    return { ok: false, reason: "unavailable" };
  }
  if (!cls) return { ok: true, staff: null };
  const roles: Role[] = [];
  if (identity.email && (cls as { reviewer_email: string }).reviewer_email?.toLowerCase() === identity.email.toLowerCase()) roles.push("teacher");
  let memberships: Membership[];
  try {
    memberships = await loadMemberships(identity.id);
  } catch (err) {
    console.error("[research-os/class] memberships read failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }
  for (const r of rolesIn(memberships, classId, identity.id)) if (!roles.includes(r)) roles.push(r);
  if (roles.length === 0) return { ok: true, staff: null };
  return { ok: true, staff: { id: identity.id, email: identity.email, roles } };
}

export type StaffAssignments =
  | { ok: true; assignments: (Assignment & { assignedBy: string | null; createdAt: string })[] }
  | { ok: false; reason: "unavailable" };

export async function listAssignments(classId: string): Promise<StaffAssignments> {
  try {
    const rows = await inChunks<AssignmentRow>([classId], (chunk, page) =>
      graphService()
        .from("assignments")
        .select("id,class_id,target_node_id,assigned_by,title,instructions,due_at,required,requires_production,closed_at,created_at")
        .in("class_id", chunk)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: AssignmentRow[] | null; error: { message: string } | null }>,
    );
    return { ok: true, assignments: rows.map(assignmentFromRow) };
  } catch (err) {
    console.error("[research-os] staff assignment read failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }
}

export interface LearnerAssignment extends Assignment {
  className: string;
  targetSlug: string;
  targetTitle: string;
  targetHidden: boolean;
  status: AssignmentStatus;
}

export type LearnerAssignments = { ok: true; assignments: LearnerAssignment[] } | { ok: false; reason: "unavailable" };

export async function listAssignmentsForLearner(learnerId: string): Promise<LearnerAssignments> {
  const svc = graphService();
  const memberships = await loadMemberships(learnerId);
  const classIds = Array.from(new Set(memberships.map((m) => m.classId)));
  if (classIds.length === 0) return { ok: true, assignments: [] };
  let rows: AssignmentRow[];
  try {
    rows = await inChunks<AssignmentRow>(classIds, (chunk, page) =>
      svc
        .from("assignments")
        .select("id,class_id,target_node_id,assigned_by,title,instructions,due_at,required,requires_production,closed_at,created_at")
        .in("class_id", chunk)
        .is("closed_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: AssignmentRow[] | null; error: { message: string } | null }>,
    );
  } catch (err) {
    console.error("[research-os] assignment read failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }
  const assignments = rows.map(assignmentFromRow);
  if (assignments.length === 0) return { ok: true, assignments: [] };
  const nodeIds = Array.from(new Set(assignments.map((a) => a.targetNodeId)));
  let nodes: { id: string; slug: string; title: string }[];
  let classes: { id: string; name: string }[];
  let states: { node_id: string; stage: Stage }[];
  let productions: { target_node_id: string; status: string }[];
  try {
    [nodes, classes, states, productions] = await Promise.all([
      inChunks<{ id: string; slug: string; title: string }>(nodeIds, (chunk, page) =>
        svc.from("nodes").select("id,slug,title").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; slug: string; title: string }[] | null; error: { message: string } | null }>,
      ),
      inChunks<{ id: string; name: string }>(classIds, (chunk, page) =>
        svc.from("classes").select("id,name").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; name: string }[] | null; error: { message: string } | null }>,
      ),
      inChunks<{ node_id: string; stage: Stage }>(nodeIds, (chunk, page) =>
        svc.from("learner_node_state").select("node_id,stage").eq("learner_id", learnerId).in("node_id", chunk).order("node_id").range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; stage: Stage }[] | null; error: { message: string } | null }>,
      ),
      inChunks<{ target_node_id: string; status: string }>(nodeIds, (chunk, page) =>
        svc.from("productions").select("id,target_node_id,status").eq("learner_id", learnerId).in("target_node_id", chunk).order("target_node_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: { target_node_id: string; status: string }[] | null; error: { message: string } | null }>,
      ),
    ]);
  } catch (err) {
    console.error("[research-os] assignment read failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }
  const readableTargets = await authorizeNodes(nodeIds, { id: learnerId }, "view");
  if (!readableTargets.ok) return { ok: false, reason: "unavailable" };
  const visibleTargets = new Set(readableTargets.allowed);
  const nodeById = new Map(nodes.filter((n) => visibleTargets.has(n.id)).map((n) => [n.id, n]));
  const classById = new Map(classes.map((c) => [c.id, c.name]));
  const stageByNode = new Map(states.map((s) => [s.node_id, s.stage]));
  const prodsByNode = new Map<string, { status: string }[]>();
  for (const p of productions) {
    prodsByNode.set(p.target_node_id, [...(prodsByNode.get(p.target_node_id) ?? []), { status: p.status }]);
  }
  return {
    ok: true,
    assignments: assignments.map((a) => ({
      ...a,
      className: classById.get(a.classId) ?? "class",
      targetSlug: nodeById.get(a.targetNodeId)?.slug ?? "",
      targetTitle: nodeById.get(a.targetNodeId)?.title ?? "",
      targetHidden: !visibleTargets.has(a.targetNodeId),
      status: assignmentStatus(a, { stage: stageByNode.get(a.targetNodeId) ?? null, productions: prodsByNode.get(a.targetNodeId) ?? [] }),
    })),
  };
}

export type ClassResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function createAssignment(staff: ClassStaff, classId: string, targetSlug: string, input: NewAssignment): Promise<ClassResult<Assignment>> {
  if (!canAssign(staff.roles)) return { ok: false, error: "forbidden" };
  const v = validateAssignment(input);
  if (!v.ok) return { ok: false, error: v.error };
  const svc = graphService();
  const { data: node, error: nodeErr } = await svc.from("nodes").select("id").eq("slug", targetSlug).maybeSingle();
  if (nodeErr) {
    console.error("[research-os/class] target node read failed:", nodeErr.message);
    return { ok: false, error: "unavailable" };
  }
  if (!node) return { ok: false, error: "target_not_found" };
  const staffMayRead = await authorizeNode((node as { id: string }).id, { id: staff.id }, "view");
  if (!staffMayRead.ok) return { ok: false, error: staffMayRead.reason === "unavailable" ? "write_failed" : "target_not_found" };
  const { data, error } = await svc
    .from("assignments")
    .insert({
      class_id: classId,
      target_node_id: (node as { id: string }).id,
      assigned_by: staff.id,
      title: v.value.title,
      instructions: v.value.instructions,
      due_at: v.value.dueAt,
      required: v.value.required,
      requires_production: v.value.requiresProduction,
    })
    .select("id,class_id,target_node_id,assigned_by,title,instructions,due_at,required,requires_production,closed_at,created_at")
    .single();
  if (error || !data) return { ok: false, error: "write_failed" };
  return { ok: true, value: assignmentFromRow(data as AssignmentRow) };
}

export async function closeAssignment(staff: ClassStaff, classId: string, assignmentId: string): Promise<ClassResult<null>> {
  if (!canAssign(staff.roles)) return { ok: false, error: "forbidden" };
  const { error } = await graphService().from("assignments").update({ closed_at: new Date().toISOString() }).eq("id", assignmentId).eq("class_id", classId);
  if (error) return { ok: false, error: "write_failed" };
  return { ok: true, value: null };
}

export async function overrideLevel(
  staff: ClassStaff,
  classId: string,
  learnerId: string,
  nodeId: string,
  toStage: Stage,
  reason: string
): Promise<ClassResult<{ fromStage: Stage | null; toStage: Stage }>> {
  if (!canOverride(staff.roles)) return { ok: false, error: "forbidden" };
  const svc = graphService();
  const { data: member, error: memberErr } = await svc.from("class_members").select("learner_id").eq("class_id", classId).eq("learner_id", learnerId).maybeSingle();
  if (memberErr) {
    console.error("[research-os/class] class_members read failed:", memberErr.message);
    return { ok: false, error: "unavailable" };
  }
  if (!member) return { ok: false, error: "not_a_member" };
  const { data: state, error: stateErr } = await svc.from("learner_node_state").select("stage").eq("learner_id", learnerId).eq("node_id", nodeId).maybeSingle();
  if (stateErr) {
    console.error("[research-os/class] learner_node_state read failed:", stateErr.message);
    return { ok: false, error: "unavailable" };
  }
  const fromStage = ((state as { stage: Stage } | null)?.stage ?? null) as Stage | null;
  const v = validateOverride({ fromStage, toStage, reason });
  if (!v.ok) return { ok: false, error: v.error };
  const { data, error } = await svc.rpc("override_level", {
    p_learner: learnerId,
    p_node: nodeId,
    p_set_by: staff.id,
    p_class: classId,
    p_to_stage: toStage,
    p_reason: reason.trim(),
  });
  if (error) {
    const code = (error as { code?: string }).code ?? null;
    if (code === "55P03" || code === "40001" || code === "40P01") return { ok: false, error: "busy" };
    return { ok: false, error: "write_failed" };
  }
  const applied = (data || {}) as {
    ok?: boolean;
    error?: string;
    prior_stage?: Stage | null;
    stage?: Stage;
    awards?: boolean;
    award_from?: Stage | null;
  };
  if (!applied.ok) return { ok: false, error: applied.error === "same_level" ? "same_level" : "write_failed" };

  if (applied.stage) {
    try {
      await awardProgress(learnerId, nodeId, applied.award_from ?? null, applied.stage, { xp: applied.awards === true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("update failed")) {
        console.warn(`[research-os] override award failed for learner ${learnerId} node ${nodeId}: ${message}`);
      }
    }
  }
  return { ok: true, value: { fromStage: applied.prior_stage ?? null, toStage: (applied.stage ?? toStage) as Stage } };
}

export async function setMemberRole(
  staff: ClassStaff,
  classId: string,
  userId: string,
  role: Role,
  relatedLearnerId?: string | null
): Promise<ClassResult<Membership>> {
  if (!canManageMembers(staff.roles)) return { ok: false, error: "forbidden" };
  const { data, error } = await graphService()
    .from("class_members")
    .upsert({ class_id: classId, learner_id: userId, role, related_learner_id: relatedLearnerId ?? null }, { onConflict: "class_id,learner_id" })
    .select("class_id,learner_id,role,related_learner_id")
    .single();
  if (error || !data) return { ok: false, error: "write_failed" };
  const r = data as MemberRow;
  return { ok: true, value: { classId: r.class_id, userId: r.learner_id, role: r.role, relatedLearnerId: r.related_learner_id } };
}

export { loadClassMemberships as listMembers };
