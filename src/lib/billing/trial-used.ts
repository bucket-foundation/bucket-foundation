import type { EntitlementEvent } from "@/lib/app-store/entitlement";

export type TrialStore = "web" | "app_store" | "play";
export const TRIAL_STORES: readonly TrialStore[] = ["web", "app_store", "play"];

export interface TrialSources {
  flag: () => Promise<TrialStore | null>;
  webRow: () => Promise<boolean>;
  appStoreEvents: () => Promise<EntitlementEvent[]>;
}

const PAID_KINDS = new Set(["trial", "subscribe", "renew", "cancel", "uncancel", "expire", "refund", "revoke", "billing_issue"]);

export async function trialUsed(src: TrialSources): Promise<boolean> {
  if (await src.flag()) return true;
  if (await src.webRow()) return true;
  return (await src.appStoreEvents()).some((e) => PAID_KINDS.has(e.kind));
}

export interface TrialUsedDeps {
  userId: () => Promise<string | null>;
  sources: (userId: string) => TrialSources;
  mark: (userId: string, store: TrialStore) => Promise<void>;
  reminderEmail: () => Promise<boolean>;
}

export type Reply = { status: number; body: Record<string, unknown> };

export async function handleTrialUsedGet(deps: TrialUsedDeps): Promise<Reply> {
  const uid = await deps.userId();
  if (!uid) return { status: 401, body: { error: "unauthorized" } };
  return { status: 200, body: { used: await trialUsed(deps.sources(uid)), reminderEmail: await deps.reminderEmail() } };
}

export async function handleTrialUsedPost(deps: TrialUsedDeps, body: unknown): Promise<Reply> {
  const uid = await deps.userId();
  if (!uid) return { status: 401, body: { error: "unauthorized" } };
  const store = (body && typeof body === "object" ? (body as Record<string, unknown>).store : null) as unknown;
  if (!TRIAL_STORES.includes(store as TrialStore)) return { status: 400, body: { error: "bad_store" } };
  await deps.mark(uid, store as TrialStore);
  return { status: 200, body: { used: true } };
}
