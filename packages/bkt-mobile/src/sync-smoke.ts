import type { MobileSync } from "../../../src/lib/academy/mobile-sync";
import { MemoryVault, type TokenVault } from "../../../src/lib/academy/token-store";

export const SMOKE_CARD = "es:smoke-phone";
const STEP_MS = 30_000;

function within<T>(label: string, p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), STEP_MS))]);
}

export interface SmokeInput {
  make: (vault: TokenVault) => MobileSync;
  secure: TokenVault;
  refreshToken: string;
  userId: string;
  probe: () => Promise<number>;
}

export async function runSyncSmoke(input: SmokeInput): Promise<void> {
  const say = (status: string, detail: unknown) => {
    const line = `BKT_SMOKE ${status} ${JSON.stringify(detail)}`;
    console.log(line);
    console.error(line);
  };
  const seed = { access_token: "expired", refresh_token: input.refreshToken, expires_at: 0, user_id: input.userId, device_id: "mobile", supabase_url: "", anon_key: "" };
  let sync: { pending: number; cards: string[] } | null = null;
  try {
    if (!input.refreshToken || !input.userId) return say("fail", { error: "no smoke session" });
    say("step", { probe: await within("probe", input.probe()) });
    const vault = new MemoryVault();
    await vault.set(seed);
    const mobile = input.make(vault);
    if (!(await within("refresh", mobile.accessToken()))) return say("fail", { error: "refresh through /api/academy/session failed" });
    say("step", { refreshed: true });
    const appended = await within("append", mobile.route("/local/review-log", "POST", JSON.stringify({ branch: "lang", review: { card_id: SMOKE_CARD, rating: 3, level: "recall", reviewed_at: Date.now(), tz: "UTC", atoms_version: "lang" } })));
    if (appended?.status !== 200) return say("fail", { error: "append", status: appended?.status });
    say("step", { appended: true });
    const pulled = (await (await within("pull", mobile.route("/local/review-log", "GET", null)))!.json()) as { reviews: { card_id: string }[] | null; pending: number };
    sync = { pending: pulled.pending, cards: (pulled.reviews ?? []).map((r) => r.card_id).sort() };
    say("step", { sync });
    if (pulled.pending !== 0 || !pulled.reviews) return say("fail", sync);
  } catch (e) {
    return say("fail", { error: e instanceof Error ? e.message : String(e) });
  }
  try {
    await within("secure storage write", input.secure.set(seed));
    const back = await within("secure storage read", input.secure.get());
    await within("secure storage clear", input.secure.clear());
    if (back?.refresh_token !== input.refreshToken) return say("fail", { ...sync, error: "secure storage read back a different session" });
    say("ok", { ...sync, secure_storage: true });
  } catch (e) {
    say("fail", { ...sync, error: e instanceof Error ? e.message : String(e) });
  }
}
