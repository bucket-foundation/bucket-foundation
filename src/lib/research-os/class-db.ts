/**
 * Research OS, class layer DB access (ros-27, the Class step): memberships
 * with roles, assignments, level overrides. Same contract as db.ts: routes
 * verify the caller, these wrappers read and write through the service-role
 * client bound to the private `graph` schema. Never import from a client
 * component.
 */
import type { NextRequest } from "next/server";
import { awardProgress, graphService, verifyLearnerIdentity } from "./db";
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
  if (error || !data) return [];
  return (data as MemberRow[]).map((r) => ({ classId: r.class_id, userId: r.learner_id, role: (r.role || "learner") as Role, relatedLearnerId: r.related_learner_id }));
}

export async function loadClassMemberships(classId: string): Promise<Membership[]> {
  const { data, error } = await graphService().from("class_members").select("class_id,learner_id,role,related_learner_id").eq("class_id", classId);
  if (error || !data) return [];
  return (data as MemberRow[]).map((r) => ({ classId: r.class_id, userId: r.learner_id, role: (r.role || "learner") as Role, relatedLearnerId: r.related_learner_id }));
}

export interface ClassStaff {
  id: string;
  email: string | null;
  roles: Role[];
}

/**
 * Who runs a class: the class's reviewer_email (the Phase 0 teacher
 * identity) or a membership with role teacher or librarian. Returns the
 * caller's roles in the class, or null when they hold none.
 */
export async function verifyClassStaff(req: NextRequest, classId: string): Promise<ClassStaff | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity) return null;
  const svc = graphService();
  const { data: cls } = await svc.from("classes").select("id,reviewer_email").eq("id", classId).maybeSingle();
  if (!cls) return null;
  const roles: Role[] = [];
  if (identity.email && (cls as { reviewer_email: string }).reviewer_email?.toLowerCase() === identity.email.toLowerCase()) roles.push("teacher");
  const memberships = await loadMemberships(identity.id);
  for (const r of rolesIn(memberships, classId, identity.id)) if (!roles.includes(r)) roles.push(r);
  if (roles.length === 0) return null;
  return { id: identity.id, email: identity.email, roles };
}

export async function listAssignments(classId: string): Promise<(Assignment & { assignedBy: string | null; createdAt: string })[]> {
  const { data, error } = await graphService()
    .from("assignments")
    .select("id,class_id,target_node_id,assigned_by,title,instructions,due_at,required,requires_production,closed_at,created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as AssignmentRow[]).map(assignmentFromRow);
}

export interface LearnerAssignment extends Assignment {
  className: string;
  targetSlug: string;
  targetTitle: string;
  status: AssignmentStatus;
}

/** Open assignments across every class the learner belongs to, with status. */
export async function listAssignmentsForLearner(learnerId: string): Promise<LearnerAssignment[]> {
  const svc = graphService();
  const memberships = await loadMemberships(learnerId);
  const classIds = Array.from(new Set(memberships.map((m) => m.classId)));
  if (classIds.length === 0) return [];
  const { data: rows } = await svc
    .from("assignments")
    .select("id,class_id,target_node_id,assigned_by,title,instructions,due_at,required,requires_production,closed_at,created_at")
    .in("class_id", classIds)
    .is("closed_at", null)
    .order("created_at", { ascending: false });
  const assignments = ((rows as AssignmentRow[]) || []).map(assignmentFromRow);
  if (assignments.length === 0) return [];
  const nodeIds = Array.from(new Set(assignments.map((a) => a.targetNodeId)));
  const [{ data: nodes }, { data: classes }, { data: states }, { data: productions }] = await Promise.all([
    svc.from("nodes").select("id,slug,title").in("id", nodeIds),
    svc.from("classes").select("id,name").in("id", classIds),
    svc.from("learner_node_state").select("node_id,stage").eq("learner_id", learnerId).in("node_id", nodeIds),
    svc.from("productions").select("target_node_id,status").eq("learner_id", learnerId).in("target_node_id", nodeIds),
  ]);
  // An assignment names a node, and its title reaches the learner, so a
  // node they may not read carries no title or slug here (Bucket critic
  // C27). The assignment itself stays in the list: it is theirs, and the
  // class staff who set it can see what it points at.
  const readableTargets = await authorizeNodes(nodeIds, { id: learnerId }, "view");
  const visibleTargets = readableTargets.ok ? new Set(readableTargets.allowed) : new Set<string>();
  const nodeById = new Map(
    ((nodes as { id: string; slug: string; title: string }[]) || [])
      .filter((n) => visibleTargets.has(n.id))
      .map((n) => [n.id, n]),
  );
  const classById = new Map(((classes as { id: string; name: string }[]) || []).map((c) => [c.id, c.name]));
  const stageByNode = new Map(((states as { node_id: string; stage: Stage }[]) || []).map((s) => [s.node_id, s.stage]));
  const prodsByNode = new Map<string, { status: string }[]>();
  for (const p of (productions as { target_node_id: string; status: string }[]) || []) {
    prodsByNode.set(p.target_node_id, [...(prodsByNode.get(p.target_node_id) ?? []), { status: p.status }]);
  }
  return assignments.map((a) => ({
    ...a,
    className: classById.get(a.classId) ?? "class",
    targetSlug: nodeById.get(a.targetNodeId)?.slug ?? "",
    targetTitle: nodeById.get(a.targetNodeId)?.title ?? "",
    status: assignmentStatus(a, { stage: stageByNode.get(a.targetNodeId) ?? null, productions: prodsByNode.get(a.targetNodeId) ?? [] }),
  }));
}

export type ClassResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function createAssignment(staff: ClassStaff, classId: string, targetSlug: string, input: NewAssignment): Promise<ClassResult<Assignment>> {
  if (!canAssign(staff.roles)) return { ok: false, error: "forbidden" };
  const v = validateAssignment(input);
  if (!v.ok) return { ok: false, error: v.error };
  const svc = graphService();
  const { data: node } = await svc.from("nodes").select("id").eq("slug", targetSlug).maybeSingle();
  if (!node) return { ok: false, error: "target_not_found" };
  // Staff assign what they may read: resolving a slug is a read, and a
  // node hidden from them cannot become an assignment.
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
  const { data: member } = await svc.from("class_members").select("learner_id").eq("class_id", classId).eq("learner_id", learnerId).maybeSingle();
  if (!member) return { ok: false, error: "not_a_member" };
  const { data: state } = await svc.from("learner_node_state").select("stage").eq("learner_id", learnerId).eq("node_id", nodeId).maybeSingle();
  const fromStage = ((state as { stage: Stage } | null)?.stage ?? null) as Stage | null;
  const v = validateOverride({ fromStage, toStage, reason });
  if (!v.ok) return { ok: false, error: v.error };
  // A teacher override is the one write that lowers a stage, and its two
  // writes belong together: graph.override_level locks the state row,
  // appends the evidence event built from the stage it locked, and writes
  // the audit row in the same transaction. An audit insert that failed
  // after a committed append left a demotion nobody could account for.
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
    // A lock wait or a serialization failure is worth another attempt from
    // the caller; anything else is a refusal.
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

  // The append's award rule runs here, since the RPC wrote the row: the
  // teacher's action keeps the learner's activity current, and XP follows
  // the node's high-water mark, which a demotion does not move.
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

/** True when the person holds a staff role (teacher or librarian) in any class; the app shell shows the Teach group on it. */
export async function isClassStaffAnywhere(userId: string): Promise<boolean> {
  try {
    const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", userId).in("role", ["teacher", "librarian"]).limit(1);
    if (error || !data) return false;
    return data.length > 0;
  } catch {
    return false;
  }
}
