"use client";

import { useEffect, useState } from "react";
import type { ForeheadCard } from "@academy/forehead";
import { foreheadHolder, type Interlude } from "@academy/lobbies";
import type { WebLobbyState } from "@/lib/lobby/client";
import { postBonus, secondsLeft } from "@/lib/family/bonus";
import type { ScreenRole } from "@/lib/family/rounds";
import { cardFit } from "@/lib/lobby/forehead-play";
import { Button } from "@/ui";
import s from "./rounds.module.css";

type Slot = Extract<Interlude, { kind: "forehead" }>;

function useDeck(lobby: WebLobbyState): ForeheadCard[] | null {
  const [cards, setCards] = useState<ForeheadCard[] | null>(null);
  const seed = `${lobby.seed}${(lobby.startedAt ?? "").replace(/\D/g, "").slice(-6)}`;
  const langs = lobby.targets.join(",");
  useEffect(() => {
    let stop = false;
    fetch(`/api/academy/forehead?langs=${langs}&seed=${seed}&root=${encodeURIComponent(lobby.root)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { cards: ForeheadCard[] }) => !stop && setCards(d.cards))
      .catch(() => !stop && setCards([]));
    return () => {
      stop = true;
    };
  }, [langs, seed, lobby.root]);
  return cards;
}

export function ForeheadInterlude({ lobby, token, role, now, slot }: { lobby: WebLobbyState; token: string | null; role: ScreenRole; now: number; slot: Slot }) {
  const cards = useDeck(lobby);
  const card = cards?.[slot.card % Math.max(1, cards.length)] ?? null;
  const holderId = foreheadHolder(lobby.players.map((p) => ({ user_id: p.userId, is_bot: p.bot })), slot.card);
  const holder = lobby.players.find((p) => p.userId === holderId);
  const me = lobby.players.find((p) => p.isMe);
  const [marked, setMarked] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [slot.card]);
  const mark = (got: boolean) => {
    if (!token || busy || marked[slot.card]) return;
    setBusy(true);
    void postBonus(fetch.bind(globalThis), token, { kind: "forehead", lobbyId: lobby.id, card: slot.card, got }).then((r) => {
      setMarked((m) => ({ ...m, [slot.card]: r.ok ? (got ? `${holder?.name ?? "They"} got it! +100` : "Skipped") : "Too late for that card." }));
    });
  };
  const holding = !!me && me.userId === holderId;
  return (
    <section className={s.round} data-role={role} data-testid="forehead-round">
      <p className={s.note}>Forehead · card {slot.card + 1} · {secondsLeft(slot.endsAt, now)}s</p>
      {holding && card ? (
        <div className={s.forehead} data-testid="forehead-card" style={{ fontSize: `${cardFit(card.form)}px` }}>{card.form}</div>
      ) : (
        <h3 className={s.prompt}>{holder ? `${holder.name} holds the phone up. Give clues in any language!` : "Waiting for players"}</h3>
      )}
      {holding ? <p className={s.note}>Hold your phone on your forehead. The room gives you clues.</p> : null}
      {lobby.isHost && !holding ? (
        <div className={s.row}>
          <Button size="lg" disabled={busy || !!marked[slot.card]} onClick={() => mark(true)} data-testid="forehead-got">Got it</Button>
          <Button variant="ghost" size="lg" disabled={busy || !!marked[slot.card]} onClick={() => mark(false)} data-testid="forehead-skip">Skip</Button>
        </div>
      ) : null}
      {marked[slot.card] ? <p className={s.note} data-testid="forehead-mark">{marked[slot.card]}</p> : null}
    </section>
  );
}
