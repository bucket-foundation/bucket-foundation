import type { AgeBand } from "./card";

export interface LeagueBoard {
  week: string;
  tier: number;
  tierName: string;
  board: { rank: number; name: string; points: number; me: boolean }[];
}

type Fetch = typeof fetch;

export function leagueEligible(band: AgeBand | null | undefined, signedIn: boolean): boolean {
  return signedIn && (band === "teen" || band === "adult");
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

export async function postLeague(f: Fetch, token: string, lobbyId: string): Promise<number | null> {
  try {
    const r = await f("/api/academy/league", { method: "POST", headers: headers(token), body: JSON.stringify({ lobbyId }) });
    return r.ok ? ((await r.json()) as { added: number }).added : null;
  } catch {
    return null;
  }
}

export async function fetchLeague(f: Fetch, token: string): Promise<LeagueBoard | null> {
  try {
    const r = await f("/api/academy/league", { headers: headers(token), cache: "no-store" });
    return r.ok ? ((await r.json()) as LeagueBoard) : null;
  } catch {
    return null;
  }
}

export function nearMe(board: LeagueBoard["board"], span = 2): LeagueBoard["board"] {
  const i = board.findIndex((r) => r.me);
  if (i < 0) return board.slice(0, 5);
  return board.slice(Math.max(0, i - span), i + span + 1);
}
