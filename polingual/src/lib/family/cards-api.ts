import type { PlayerCard } from "./card";
import type { SeatCard } from "./langmap";

const PATH = "/api/academy/lobby-cards";
type Fetch = typeof fetch;

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", "x-polingual-client": "web" };
}

export async function sendCard(f: Fetch, token: string, lobbyId: string, card: PlayerCard): Promise<boolean> {
  try {
    const body = { lobbyId, card: { band: card.band, speaks: card.speaks, learn: card.learn, surprise: card.surprise } };
    return (await f(PATH, { method: "POST", headers: headers(token), body: JSON.stringify(body) })).ok;
  } catch {
    return false;
  }
}

export async function setSharing(f: Fetch, token: string, lobbyId: string, share: boolean): Promise<boolean> {
  try {
    return (await f(PATH, { method: "POST", headers: headers(token), body: JSON.stringify({ lobbyId, share }) })).ok;
  } catch {
    return false;
  }
}

export async function fetchCards(f: Fetch, token: string, lobbyId: string): Promise<{ cards: Omit<SeatCard, "name">[]; share: boolean } | null> {
  try {
    const r = await f(`${PATH}?lobby=${encodeURIComponent(lobbyId)}`, { headers: headers(token), cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as { cards: Omit<SeatCard, "name">[]; share: boolean };
  } catch {
    return null;
  }
}
