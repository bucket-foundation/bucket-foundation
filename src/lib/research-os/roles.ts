/**
 * Research OS, roles as grants on a class (ros-27). Pure rules, no I/O.
 * INTEGRATION-PLAN.md section 4: learner, teacher, librarian, parent, peer,
 * reviewer, researcher; a person can hold several; the library is a venue
 * so a librarian runs a class the way a teacher does.
 */
import { STAGE_ORDER, type Stage } from "./types";

export type Role = "learner" | "teacher" | "librarian" | "parent" | "peer" | "reviewer" | "researcher";

export const ROLES: Role[] = ["learner", "teacher", "librarian", "parent", "peer", "reviewer", "researcher"];

export interface Membership {
  classId: string;
  userId: string;
  role: Role;
  /** For a parent: the learner they see. */
  relatedLearnerId?: string | null;
}

/** Teachers and librarians run a class: assign targets, override levels, manage members. */
export function runsClass(role: Role): boolean {
  return role === "teacher" || role === "librarian";
}

/** Who may review productions for a class. */
export function reviewsForClass(role: Role): boolean {
  return runsClass(role) || role === "reviewer";
}

/** The learner ids a member may see work for, given the class roster. */
export function visibleLearnerIds(member: Membership, classLearnerIds: string[]): string[] {
  if (runsClass(member.role) || member.role === "reviewer" || member.role === "researcher") return classLearnerIds;
  if (member.role === "parent") return member.relatedLearnerId ? classLearnerIds.filter((id) => id === member.relatedLearnerId) : [];
  if (member.role === "peer") return classLearnerIds; // shared nodes only; access.ts decides per node
  return classLearnerIds.filter((id) => id === member.userId);
}

/** Roles of the given user across memberships in one class. */
export function rolesIn(memberships: Membership[], classId: string, userId: string): Role[] {
  return memberships.filter((m) => m.classId === classId && m.userId === userId).map((m) => m.role);
}

export function canAssign(roles: Role[]): boolean {
  return roles.some(runsClass);
}

export function canOverride(roles: Role[]): boolean {
  return roles.some(runsClass);
}

export function canManageMembers(roles: Role[]): boolean {
  return roles.some(runsClass);
}

export interface OverrideInput {
  fromStage: Stage | null;
  toStage: Stage;
  reason: string;
}

/** An override needs a level and a reason; setting the same level is a no-op. */
export function validateOverride(input: OverrideInput): { ok: true } | { ok: false; error: string } {
  if (!STAGE_ORDER.includes(input.toStage)) return { ok: false, error: "bad_level" };
  if (!input.reason || input.reason.trim().length < 3) return { ok: false, error: "reason_required" };
  if (input.fromStage === input.toStage) return { ok: false, error: "same_level" };
  return { ok: true };
}

/** The evidence event an override writes on learner_node_state. */
export function overrideEvent(input: OverrideInput & { setBy: string; classId?: string | null }, now: Date = new Date()) {
  return {
    kind: "override" as const,
    at: now.toISOString(),
    from: input.fromStage,
    to: input.toStage,
    reason: input.reason.trim(),
    setBy: input.setBy,
    classId: input.classId ?? null,
  };
}
