import { service } from "./groups-server";
import { apnsConfig, pushCheer, withBudget, type CheerPushKind, type PushDevice, type PushEnv, type PushStore, type SendResult } from "./apns";

export const PUSH_DEVICES = "push_devices";

export const supabasePushStore: PushStore = {
  async devices(userId) {
    const res = await service().from(PUSH_DEVICES).select("token,env,bundle_id").eq("user_id", userId);
    if (res.error) throw new Error(`push devices read: ${res.error.message}`);
    return (res.data ?? []) as PushDevice[];
  },
  async prune(token) {
    await service().from(PUSH_DEVICES).delete().eq("token", token);
  },
  async setEnv(token, env) {
    await service().from(PUSH_DEVICES).update({ env, updated_at: new Date().toISOString() }).eq("token", token);
  },
};

export async function registerDevice(userId: string, token: string, env: PushEnv, bundleId: string): Promise<void> {
  const res = await service()
    .from(PUSH_DEVICES)
    .upsert({ token, user_id: userId, env, bundle_id: bundleId, updated_at: new Date().toISOString() }, { onConflict: "token" });
  if (res.error) throw new Error(`push register: ${res.error.message}`);
}

export async function unregisterDevice(userId: string, token: string): Promise<void> {
  const res = await service().from(PUSH_DEVICES).delete().eq("user_id", userId).eq("token", token);
  if (res.error) throw new Error(`push unregister: ${res.error.message}`);
}

export const PUSH_BUDGET_MS = 3000;

export function pushCheerToDevices(cheer: { group_id: string; to_id: string; kind: CheerPushKind }, fromName: string): Promise<SendResult | null> {
  return withBudget(pushCheer(cheer, fromName, { cfg: apnsConfig(), store: supabasePushStore }), PUSH_BUDGET_MS);
}
