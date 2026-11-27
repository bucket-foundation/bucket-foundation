import { langCorpus, service } from "./groups-server";
import type { LobbyPromptRow, LobbyRow } from "./lobbies";
import type { FairCard } from "./fair-score";
import { seatPrompt } from "./seat-prompts";

export async function seatCard(lobbyId: string, uid: string): Promise<FairCard | null> {
  const res = await service().from("lobby_cards").select("card").eq("lobby_id", lobbyId).eq("user_id", uid).maybeSingle();
  return res.error || !res.data ? null : (res.data as { card: FairCard }).card;
}

export async function seatRows<T extends LobbyPromptRow>(lobby: Pick<LobbyRow, "id" | "root" | "seed">, uid: string, rows: T[]): Promise<T[]> {
  if (!rows.some((r) => r.mode === "form")) return rows;
  const card = await seatCard(lobby.id, uid);
  const corpus = langCorpus();
  if (!card || !corpus) return rows;
  return rows.map((r) => seatPrompt(r, corpus.items, (id) => corpus.byId.get(id), card, lobby.root, `${lobby.seed}|${uid}`) as T);
}
