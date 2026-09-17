/**
 * Research OS, assignments (the Class step of INTEGRATION-PLAN.md section
 * 10; decision 6): a teacher or librarian assigns a frontier target to a
 * class; the finished paper is the production and can be required; a
 * production's acceptance into the public graph is never required.
 * Pure rules, no I/O.
 */
import { STAGE_ORDER, type Stage } from "./types";

export interface Assignment {
  id: string;
  classId: string;
  targetNodeId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  required: boolean;
  requiresProduction: boolean;
  closedAt?: string | null;
}

export type AssignmentStatus = "not_started" | "in_progress" | "produced" | "accepted" | "overdue";

export interface LearnerProgressInput {
  /** The learner's level on the target node, if any. */
  stage: Stage | null;
  /** Productions the learner has on the target node. */
  productions: { status: string }[];
}

export function assignmentStatus(a: Assignment, progress: LearnerProgressInput, now: Date = new Date()): AssignmentStatus {
  const accepted = progress.productions.some((p) => p.status === "accepted");
  if (accepted) return "accepted";
  const produced = progress.productions.length > 0;
  if (produced) return a.requiresProduction ? "produced" : "accepted";
  const started = progress.stage !== null && STAGE_ORDER.indexOf(progress.stage) > STAGE_ORDER.indexOf("access");
  if (a.dueAt && Date.parse(a.dueAt) < now.getTime()) return "overdue";
  if (!a.requiresProduction && progress.stage !== null && STAGE_ORDER.indexOf(progress.stage) >= STAGE_ORDER.indexOf("understanding")) return "accepted";
  return started ? "in_progress" : "not_started";
}

export interface NewAssignment {
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  required?: boolean;
  requiresProduction?: boolean;
}

export function validateAssignment(input: NewAssignment): { ok: true; value: Required<Pick<NewAssignment, "title" | "required" | "requiresProduction">> & NewAssignment } | { ok: false; error: string } {
  const title = (input.title || "").trim();
  if (title.length < 3) return { ok: false, error: "title_required" };
  if (title.length > 200) return { ok: false, error: "title_too_long" };
  if (input.dueAt && !Number.isFinite(Date.parse(input.dueAt))) return { ok: false, error: "bad_due_at" };
  return {
    ok: true,
    value: {
      title,
      instructions: (input.instructions || "").trim().slice(0, 4000) || null,
      dueAt: input.dueAt || null,
      required: input.required ?? true,
      requiresProduction: input.requiresProduction ?? true,
    },
  };
}
