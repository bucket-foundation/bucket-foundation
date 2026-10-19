import type { MobileSync } from "../../../src/lib/academy/mobile-sync";
import type { TokenVault } from "../../../src/lib/academy/token-store";

export const SMOKE_CARD = "es:smoke-phone";
const STEP_MS = 30_000;

function within<T>(label: string, p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), STEP_MS))]);
}

export async function runSyncSmoke(mobile: MobileSync, vault: TokenVault, refreshToken: string, userId: string, probe?: () => Promise<number>): Promise<void> {
  const say = (status: string, detail: unknown) => {
    const line = `BKT_SMOKE ${status} ${JSON.stringify(detail)}`;
    console.log(line);
    console.error(line);
  };
  try {
    if (!refreshToken || !userId) return say("fail", { error: "no smoke session" });
    if (probe) say("step", { probe: await within("probe", probe()) });
    await within("secure storage", vault.set({ access_token: "expired", refresh_token: refreshToken, expires_at: 0, user_id: userId, device_id: "mobile", supabase_url: "", anon_key: "" }));
    say("step", { stored: true });
    if (!(await within("refresh", mobile.accessToken()))) return say("fail", { error: "refresh through /api/academy/session failed" });
    say("step", { refreshed: true });
    const appended = await within("append", mobile.route("/local/review-log", "POST", JSON.stringify({ branch: "lang", review: { card_id: SMOKE_CARD, rating: 3, level: "recall", reviewed_at: Date.now(), tz: "UTC", atoms_version: "lang" } })));
    if (appended?.status !== 200) return say("fail", { error: "append", status: appended?.status });
    const pulled = (await (await within("pull", mobile.route("/local/review-log", "GET", null)))!.json()) as { reviews: { card_id: string }[] | null; pending: number };
    say(pulled.pending === 0 && pulled.reviews ? "ok" : "fail", { pending: pulled.pending, cards: (pulled.reviews ?? []).map((r) => r.card_id).sort() });
  } catch (e) {
    say("fail", { error: e instanceof Error ? e.message : String(e) });
  }
}
