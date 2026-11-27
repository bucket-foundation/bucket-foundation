"use client";

import { useEffect, useRef, useState } from "react";
import { ATLAS_CLIPS, type Interlude } from "@academy/lobbies";
import type { AtlasRound, LatLon } from "@academy/voice-atlas";
import type { WebLobbyState } from "@/lib/lobby/client";
import { gameEndOf, postBonus, secondsLeft } from "@/lib/family/bonus";
import { tvPlayable, type ScreenRole } from "@/lib/family/rounds";
import { bcp47, play as speak } from "@/lib/speak";
import { Button } from "@/ui";
import { langName } from "../langs";
import AtlasMap from "../voice-atlas/AtlasMap";
import s from "./rounds.module.css";

type Slot = Extract<Interlude, { kind: "voice-atlas" }>;
type Result = { clip: number; text: string };

function useAtlasRounds(lobby: WebLobbyState): AtlasRound[] | null {
  const [rounds, setRounds] = useState<AtlasRound[] | null>(null);
  const date = new Date(gameEndOf(lobby)).toISOString().slice(0, 10);
  useEffect(() => {
    let stop = false;
    fetch(`/api/academy/voice-atlas?date=${date}&root=${encodeURIComponent(lobby.root)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { rounds: AtlasRound[] }) => !stop && setRounds(d.rounds))
      .catch(() => !stop && setRounds([]));
    return () => {
      stop = true;
    };
  }, [date, lobby.root]);
  return rounds;
}

export function AtlasInterlude({ lobby, token, role, now, slot }: { lobby: WebLobbyState; token: string | null; role: ScreenRole; now: number; slot: Slot }) {
  const rounds = useAtlasRounds(lobby);
  const round = rounds?.[slot.clip] ?? null;
  const [pin, setPin] = useState<LatLon | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const played = useRef(-1);
  const listen = () => round && void speak({ id: `room-atlas:${slot.clip}`, text: round.form, lang: bcp47(round.lang) });
  useEffect(() => {
    if (role !== "tv" || !round || played.current === slot.clip || !tvPlayable({ licence: round.licence }, true)) return;
    played.current = slot.clip;
    listen();
  });
  useEffect(() => setPin(null), [slot.clip]);
  const guess = (p: LatLon) => {
    if (!token || result?.clip === slot.clip) return;
    setPin(p);
    void postBonus(fetch.bind(globalThis), token, { kind: "atlas", lobbyId: lobby.id, clip: slot.clip, lat: p[0], lon: p[1] }).then((r) => {
      setResult({ clip: slot.clip, text: r.ok ? `${r.lang ? langName(r.lang) : "Placed"}: ${r.km} km away, +${r.points}` : "That guess did not count." });
    });
  };
  const done = result?.clip === slot.clip;
  return (
    <section className={s.round} data-role={role} data-testid="atlas-round">
      <p className={s.note}>Voice Atlas, clip {slot.clip + 1} of {ATLAS_CLIPS} · {secondsLeft(slot.endsAt, now)}s</p>
      <h3 className={s.prompt}>Where is this language spoken?</h3>
      {round && (role !== "tv" || tvPlayable({ licence: round.licence }, true)) ? (
        <Button variant="ghost" size="md" onClick={listen} data-testid="atlas-listen">Play the voice</Button>
      ) : (
        <p className={s.note}>This clip plays on phones only.</p>
      )}
      {role === "tv" ? null : (
        <>
          <AtlasMap pin={pin} home={null} onPin={done ? null : guess} />
          {done ? <p className={s.note} data-testid="atlas-result">{result.text}</p> : <p className={s.note}>Tap the map where you think it is spoken.</p>}
        </>
      )}
    </section>
  );
}
