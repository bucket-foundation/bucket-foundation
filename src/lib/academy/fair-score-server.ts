import { service } from "./groups-server";
import { fairPoints, seatBand, timeFactor, windowSeconds, type FairCard } from "./fair-score";

export async function familyPoints(lobbyId: string, uid: string, round: number, roundSeconds: number, decision: { correct: boolean; ms: number; points: number }): Promise<number> {
  const cards = await service().from("lobby_cards").select("user_id,card").eq("lobby_id", lobbyId);
  if (cards.error || !cards.data?.length) return decision.points;
  const mine = (cards.data as { user_id: string; card: FairCard }[]).find((c) => c.user_id === uid)?.card ?? null;
  const first = round > 0 ? await service().from("lobby_answers").select("ms").eq("lobby_id", lobbyId).eq("user_id", uid).eq("round", 0).maybeSingle() : null;
  const firstMs = round === 0 ? decision.ms : ((first?.data as { ms?: number } | null)?.ms ?? null);
  const factor = timeFactor({ band: seatBand(mine) }, firstMs, roundSeconds);
  return fairPoints(decision.correct, decision.ms, windowSeconds(roundSeconds, factor), round);
}
