"use client";

import { useEffect, useRef, useState } from "react";
import { ATLAS_CLIPS, type Interlude } from "@academy/lobbies";
import type { LatLon, NightAtlasRound } from "@academy/voice-atlas";
import type { WebLobbyState } from "@/lib/lobby/client";
import { postBonus, secondsLeft } from "@/lib/family/bonus";
import { tvPlayable, type ScreenRole } from "@/lib/family/rounds";
import { bcp47, play as speak } from "@/lib/speak";
import { Button } from "@/ui";
import { langName } from "../langs";
import AtlasMap from "../voice-atlas/AtlasMap";
import s from "./rounds.module.css";

type Slot = Extract<Interlude, { kind: "voice-atlas" }>;
type Result = { clip: number; text: string };

function useAtlasRounds(lobby: WebLobbyState, token: string | null, clip: number): NightAtlasRound[] | null {
  const [rounds, setRounds] = useState<NightAtlasRound[] | null>(null);
  useEffect(() => {
    let stop = false;
    fetch(`/api/academy/lobbies/atlas?lobbyId=${encodeURIComponent(lobby.id)}`, { headers: token ? { authorization: `Bearer ${token}`, "x-polingual-client": "web" } : {} })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { rounds: NightAtlasRound[] }) => !stop && setRounds(d.rounds))
      .catch(() => !stop && setRounds((have) => have ?? []));
    return () => {
      stop = true;
    };
  }, [lobby.id, lobby.startedAt, token, clip]);
  return rounds;
}

export function AtlasInterlude({ lobby, token, role, now, slot }: { lobby: WebLobbyState; token: string | null; role: ScreenRole; now: number; slot: Slot }) {
  const rounds = useAtlasRounds(lobby, token, slot.clip);
  const round = rounds?.[slot.clip] ?? null;
  const [pin, setPin] = useState<LatLon | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const played = useRef(-1);
  const last = slot.clip > 0 ? rounds?.[slot.clip - 1] ?? null : null;
  const listen = () => round?.lang && void speak({ id: `room-atlas:${slot.clip}`, text: round.form, lang: bcp47(round.lang) });
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
      setResult({ clip: slot.clip, text: r.ok ? `Placed: ${r.km} km away, +${r.points}` : "That guess did not count." });
    });
  };
  const done = result?.clip === slot.clip;
  return (
    <section className={s.round} data-role={role} data-testid="atlas-round">
      <p className={s.note}>Voice Atlas, clip {slot.clip + 1} of {ATLAS_CLIPS} · {secondsLeft(slot.endsAt, now)}s</p>
      <h3 className={s.prompt}>Where is this language spoken?</h3>
      {last?.lang ? <p className={s.note} data-testid="atlas-reveal">Last clip was {langName(last.lang)}.</p> : null}
      {round?.lang && tvPlayable({ licence: round.licence }, true) ? (
        <Button variant="ghost" size="md" onClick={listen} data-testid="atlas-listen">Play the voice</Button>
      ) : (
        <p className={s.note}>Listen to the TV.</p>
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
