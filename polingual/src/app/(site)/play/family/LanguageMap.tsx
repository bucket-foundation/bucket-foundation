"use client";

import { useEffect, useMemo, useState } from "react";
import { langName } from "@academy/lang-systems";
import type { WebLobbyState } from "@/lib/lobby/client";
import { flagEmoji, langFlag } from "@/lib/lobby/client";
import { fetchCards, sendCard, setSharing } from "@/lib/family/cards-api";
import { roomLanguageMap, suggestedRound, type SeatCard } from "@/lib/family/langmap";
import { currentCard } from "@/lib/family/session";
import { keepsData } from "@/lib/family/card";
import { Button, ButtonLink } from "@/ui";
import { kidSeat, kidSeatHref } from "@/lib/family/kid";
import { readFamily, type SavedFamily } from "@/lib/family/group";
import { local } from "@/lib/storage";
import f from "./family.module.css";

const POLL_MS = 4000;
const bound = () => window.fetch.bind(window);

export function useRoomCards(lobby: Pick<WebLobbyState, "id" | "players">, token: string | null): { seats: SeatCard[]; share: boolean; setShare: (on: boolean) => void } {
  const [rows, setRows] = useState<{ cards: Omit<SeatCard, "name">[]; share: boolean }>({ cards: [], share: true });
  useEffect(() => {
    if (!token) return;
    let live = true;
    const pull = () => void fetchCards(bound(), token, lobby.id).then((r) => live && r && setRows(r));
    pull();
    const t = window.setInterval(pull, POLL_MS);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [lobby.id, token]);
  const seats = useMemo(() => rows.cards.flatMap((c) => {
    const p = lobby.players.find((x) => x.userId === c.userId);
    return p ? [{ ...c, name: p.name }] : [];
  }), [rows.cards, lobby.players]);
  const setShare = (on: boolean) => {
    setRows((r) => ({ ...r, share: on }));
    if (token) void setSharing(bound(), token, lobby.id, on);
  };
  return { seats, share: rows.share, setShare };
}

function Lang({ lang, extra }: { lang: string; extra?: string }) {
  return (
    <>
      <span aria-hidden="true">{flagEmoji(langFlag(lang)) || "🌐"}</span>
      {langName(lang)}
      {extra ? <b>{extra}</b> : null}
    </>
  );
}

export function RoomLanguageMap({ seats }: { seats: SeatCard[] }) {
  const map = roomLanguageMap(seats);
  const pick = suggestedRound(map);
  if (!seats.length) return <p className={f.muted} data-testid="language-map-empty">Player cards show up here as phones join.</p>;
  return (
    <div className={f.map} data-testid="language-map">
      {map.shared.length ? (
        <>
          <p className={f.step}>The room speaks</p>
          <ul className={f.chips}>{map.shared.map((s) => <li key={s.lang}><Lang lang={s.lang} extra={`×${s.count}`} /></li>)}</ul>
        </>
      ) : null}
      {map.wanted.length ? (
        <>
          <p className={f.step}>Most wanted</p>
          <ul className={f.chips}>{map.wanted.map((w, i) => <li key={w.lang} data-top={i === 0}><Lang lang={w.lang} extra={`×${w.count}`} /></li>)}</ul>
        </>
      ) : null}
      {pick ? <p className={f.muted} data-testid="suggested-round">Suggested round: {langName(pick)}</p> : null}
      <ul className={f.people}>
        {map.people.map((p) => (
          <li key={p.userId}>
            <span className={f.who}>{p.name}</span>
            {p.speaks.map((s) => <span key={s.lang} title={langName(s.lang)}>{flagEmoji(langFlag(s.lang)) || s.lang}{s.level === 4 ? "🏠" : ""}</span>)}
            {p.learn.length ? <span>→ {p.learn.map((l) => flagEmoji(langFlag(l)) || l).join(" ")}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoomLanguageCard({ lobby, token }: { lobby: Pick<WebLobbyState, "id" | "players">; token: string | null }) {
  const { seats } = useRoomCards(lobby, token);
  return (
    <section className={f.card} aria-label="Room languages">
      <p className={f.step}>Room languages</p>
      <RoomLanguageMap seats={seats} />
    </section>
  );
}

export default function FamilyWaiting({ lobby, token }: { lobby: WebLobbyState; token: string | null }) {
  const { seats, share, setShare } = useRoomCards(lobby, token);
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    const card = currentCard();
    const round = `${lobby.id}|${lobby.startedAt ?? ""}`;
    if (!token || !card || !keepsData(card.band) || sent === round || lobby.status !== "lobby") return;
    setSent(round);
    void sendCard(bound(), token, lobby.id, card);
  }, [lobby.id, lobby.startedAt, lobby.status, token, sent]);
  return (
    <section className={f.card} aria-label="Room languages" data-testid="family-waiting">
      <p className={f.step}>Room languages</p>
      <RoomLanguageMap seats={seats} />
      <RememberedFamily />
      {kidSeat() ? null : <ButtonLink variant="ghost" size="md" href={kidSeatHref(lobby.code)} target="_blank" rel="noopener" data-testid="add-kid">Add a kid seat on this phone</ButtonLink>}
      {lobby.isHost ? (
        <Button variant="quiet" size="sm" onClick={() => setShare(!share)} aria-pressed={!share} data-testid="share-toggle">
          {share ? "Sharing on: tap to turn off" : "Sharing off: tap to turn on"}
        </Button>
      ) : null}
    </section>
  );
}

function RememberedFamily() {
  const [family, setFamily] = useState<SavedFamily | null>(null);
  useEffect(() => setFamily(readFamily(local())), []);
  return family ? <p className={f.muted} data-testid="family-welcome">Welcome back, {family.name}.</p> : null;
}
