export const BONUS_PATH = "/api/academy/lobbies/bonus";

export type AtlasBonus = { kind: "atlas"; lobbyId: string; clip: number; lat: number; lon: number };
export type ForeheadBonus = { kind: "forehead"; lobbyId: string; card: number; got: boolean };
export type BonusResult = { ok: true; points?: number; km?: number; got?: boolean } | { ok: false; error: string };

export async function postBonus(f: typeof fetch, token: string, body: AtlasBonus | ForeheadBonus): Promise<BonusResult> {
  try {
    const r = await f(BONUS_PATH, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-polingual-client": "web" }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return r.ok ? { ok: true, ...data } : { ok: false, error: typeof data.error === "string" ? data.error : "sync_unavailable" };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export function gameEndOf(lobby: { startedAt: string | null; rounds: number; roundSeconds: number; revealSeconds: number }): number {
  if (!lobby.startedAt) return 0;
  return Date.parse(lobby.startedAt) + lobby.rounds * lobby.roundSeconds * 1000 + Math.max(0, lobby.rounds - 1) * lobby.revealSeconds * 1000;
}

export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
