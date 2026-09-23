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
  stage: Stage | null;
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

export function isOpenTarget(a: { status: AssignmentStatus | string; targetSlug?: string; targetHidden?: boolean }): boolean {
  return a.status !== "accepted" && !a.targetHidden && Boolean(a.targetSlug);
}

export function firstOpenTarget<T extends { status: AssignmentStatus | string; targetSlug?: string; targetHidden?: boolean }>(
  assignments: T[],
): T | null {
  return assignments.find(isOpenTarget) ?? null;
}

export function targetIsLinkable(a: { targetSlug?: string; targetHidden?: boolean }): boolean {
  return !a.targetHidden && Boolean(a.targetSlug);
}

export function assignmentTargetHref(a: { targetSlug?: string; targetHidden?: boolean }): string | null {
  if (!targetIsLinkable(a)) return null;
  return `/research-os/workspace?target=${encodeURIComponent(a.targetSlug as string)}`;
}
