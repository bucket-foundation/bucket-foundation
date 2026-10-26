import type { Staff } from "./gate";

export const ADMIN_ACTIONS = ["disable", "enable", "delete"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: AdminAction;
  targetUserId: string;
  targetEmail: string | null;
  reason: string;
  outcome: "requested" | "ok" | "failed";
  detail: string | null;
}

export interface AuditRow extends AuditEntry {
  id: number;
  createdAt: string;
}

export interface ActionDeps {
  lookup: (userId: string) => Promise<{ email: string | null } | null>;
  setDisabled: (userId: string, disabled: boolean) => Promise<void>;
  revokeApple: (userId: string) => Promise<{ failed: boolean }>;
  deleteUser: (userId: string) => Promise<void>;
  audit: (entry: AuditEntry) => Promise<void>;
}

export interface ActionInput {
  action: string;
  targetUserId: string;
  reason: string;
  confirm?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: "bad_action" | "reason_required" | "self_action" | "not_found" | "confirm_mismatch" | "action_failed" | "audit_failed" };

function isAction(v: string): v is AdminAction {
  return (ADMIN_ACTIONS as readonly string[]).includes(v);
}

export async function runUserAction(deps: ActionDeps, actor: Staff, input: ActionInput): Promise<ActionResult> {
  if (!isAction(input.action)) return { ok: false, error: "bad_action" };
  const reason = input.reason.trim().slice(0, 500);
  if (reason.length < 3) return { ok: false, error: "reason_required" };
  if (input.targetUserId === actor.id) return { ok: false, error: "self_action" };
  const target = await deps.lookup(input.targetUserId);
  if (!target) return { ok: false, error: "not_found" };
  if (input.action === "delete") {
    const typed = (input.confirm ?? "").trim().toLowerCase();
    const want = [input.targetUserId.toLowerCase(), (target.email ?? "").toLowerCase()].filter(Boolean);
    if (!want.includes(typed)) return { ok: false, error: "confirm_mismatch" };
  }
  const entry = { actorId: actor.id, actorEmail: actor.email, action: input.action, targetUserId: input.targetUserId, targetEmail: target.email, reason };
  try {
    await deps.audit({ ...entry, outcome: "requested", detail: null });
  } catch (err) {
    console.error("[admin] intent audit failed, action not run", input.action, input.targetUserId, err instanceof Error ? err.message : err);
    return { ok: false, error: "audit_failed" };
  }
  let failure: string | null = null;
  try {
    if (input.action === "delete") {
      if ((await deps.revokeApple(input.targetUserId)).failed) throw new Error("apple_revoke_failed");
      await deps.deleteUser(input.targetUserId);
    } else await deps.setDisabled(input.targetUserId, input.action === "disable");
  } catch (err) {
    failure = (err instanceof Error ? err.message : String(err)).slice(0, 500);
  }
  try {
    await deps.audit({ ...entry, outcome: failure ? "failed" : "ok", detail: failure });
  } catch (err) {
    console.error("[admin] audit write failed after", input.action, input.targetUserId, err instanceof Error ? err.message : err);
    return { ok: false, error: "audit_failed" };
  }
  return failure ? { ok: false, error: "action_failed" } : { ok: true };
}
