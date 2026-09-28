import { createHmac, randomBytes } from "node:crypto";

export type WorkbenchRole = "founder" | "staff";
export type WorkbenchAction = "tools" | "run" | "runs" | "cancel";

export const WORKBENCH_ACTIONS: readonly WorkbenchAction[] = ["tools", "run", "runs", "cancel"];
export const SIGNATURE_TTL_S = 60;
export const MIN_KEY_LENGTH = 32;

export interface WorkbenchRequest {
  action: WorkbenchAction;
  tool?: string;
  args?: Record<string, unknown>;
  run_id?: string;
}

export function parseSigningKeys(raw: string | undefined): string[] {
  const keys = (raw || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.some((k) => k.length < MIN_KEY_LENGTH)) throw new Error("workbench signing key shorter than 32 characters");
  return keys;
}

export function workbenchRole(
  email: string | null | undefined,
  isStaff: (email: string) => boolean,
  founderEmail: string | undefined,
): WorkbenchRole | null {
  if (!email || !isStaff(email)) return null;
  const founder = (founderEmail || "").trim().toLowerCase();
  return founder && email.trim().toLowerCase() === founder ? "founder" : "staff";
}

export function parseWorkbenchRequest(value: unknown): WorkbenchRequest | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.action !== "string" || !WORKBENCH_ACTIONS.includes(v.action as WorkbenchAction)) return null;
  const out: WorkbenchRequest = { action: v.action as WorkbenchAction };
  if (out.action === "run") {
    if (typeof v.tool !== "string" || !/^[a-z0-9_]{1,64}$/.test(v.tool)) return null;
    if (v.args !== undefined && (typeof v.args !== "object" || v.args === null || Array.isArray(v.args))) return null;
    out.tool = v.tool;
    out.args = (v.args as Record<string, unknown>) ?? {};
  }
  if (out.action === "cancel") {
    if (typeof v.run_id !== "string" || !/^[a-f0-9]{32}$/.test(v.run_id)) return null;
    out.run_id = v.run_id;
  }
  return out;
}

export function signWorkbenchRequest(
  user: string,
  role: WorkbenchRole,
  req: WorkbenchRequest,
  key: string,
  nowS: number = Date.now() / 1000,
  nonce: string = randomBytes(16).toString("hex"),
): { body: string; signature: string } {
  const { action: _action, ...rest } = req;
  const body = JSON.stringify({ ...rest, user: user.trim().toLowerCase(), role, exp: nowS + SIGNATURE_TTL_S, nonce });
  return { body, signature: createHmac("sha256", key).update(body).digest("hex") };
}
