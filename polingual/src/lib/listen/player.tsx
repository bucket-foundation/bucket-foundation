"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { stationAudio } from "@/lib/speak";
import { streamOf, type RadioStation } from "./radio";

type NowPlaying = { station: RadioStation | null; lang: string | null; playing: boolean; buffering: boolean; error: string | null };

export type Heard = { stationId: string; lang: string; startedAt: number; ms: number };

type Player = NowPlaying & { play: (s: RadioStation, lang: string) => void; toggle: () => void; stop: () => void; heard: Heard[]; takeHeard: (pick: (h: Heard) => boolean) => Heard[] };

export const HEARD_FLUSH_MS = 300_000;

type Listening = { stationId: string; lang: string; startedAt: number; since: number | null; ms: number };

export function settle(l: Listening | null, now: number): Listening | null {
  if (!l || l.since === null) return l;
  return { ...l, ms: l.ms + Math.max(0, now - l.since), since: null };
}

export function heardOf(l: Listening | null): Heard | null {
  return l && l.ms >= 1000 ? { stationId: l.stationId, lang: l.lang, startedAt: l.startedAt, ms: l.ms } : null;
}

const Ctx = createContext<Player | null>(null);

export function usePlayer(): Player {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer needs PlayerProvider");
  return p;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<NowPlaying>({ station: null, lang: null, playing: false, buffering: false, error: null });
  const listening = useRef<Listening | null>(null);
  const heardList = useRef<Heard[]>([]);
  const [heard, setHeard] = useState<Heard[]>([]);

  const close = useCallback((keep: boolean) => {
    const t = Date.now();
    const l = settle(listening.current, t);
    const h = heardOf(l);
    if (h) {
      heardList.current = [...heardList.current, h];
      setHeard(heardList.current);
    }
    listening.current = keep && l ? { ...l, startedAt: t, ms: 0, since: null } : null;
  }, []);

  const takeHeard = useCallback((pick: (h: Heard) => boolean) => {
    const out = heardList.current.filter(pick);
    heardList.current = heardList.current.filter((h) => !pick(h));
    setHeard(heardList.current);
    return out;
  }, []);

  useEffect(() => {
    if (!now.playing) return;
    const id = setInterval(() => {
      const keep = listening.current;
      close(true);
      if (listening.current && keep?.since !== null) listening.current = { ...listening.current, since: Date.now() };
    }, HEARD_FLUSH_MS);
    return () => clearInterval(id);
  }, [now.playing, close]);

  useEffect(() => {
    const a = stationAudio();
    audio.current = a;
    const handlers: [string, () => void][] = [
      ["playing", () => {
        if (listening.current && listening.current.since === null) listening.current = { ...listening.current, since: Date.now() };
        setNow((n) => ({ ...n, playing: true, buffering: false, error: null }));
      }],
      ["pause", () => {
        close(true);
        setNow((n) => ({ ...n, playing: false }));
      }],
      ["waiting", () => setNow((n) => ({ ...n, buffering: true }))],
      ["error", () => close(true)],
      ["error", () => setNow((n) => ({ ...n, playing: false, buffering: false, error: n.station ? "This station stopped. Pick another." : null }))],
    ];
    for (const [e, h] of handlers) a.addEventListener(e, h);
    return () => {
      for (const [e, h] of handlers) a.removeEventListener(e, h);
      a.pause();
    };
  }, [close]);

  const play = useCallback((s: RadioStation, lang: string) => {
    const a = audio.current;
    const url = streamOf(s);
    if (!a || !url) return setNow((n) => ({ ...n, station: s, lang, error: "This station stopped. Pick another." }));
    if (a.src !== url) a.src = url;
    if (listening.current?.stationId !== s.stationuuid || listening.current?.lang !== lang) {
      close(false);
      listening.current = { stationId: s.stationuuid, lang, startedAt: Date.now(), since: null, ms: 0 };
    }
    setNow({ station: s, lang, playing: false, buffering: true, error: null });
    void a.play().catch(() => setNow((n) => ({ ...n, buffering: false, playing: false, error: "Tap play to start the station." })));
  }, [close]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !now.station) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }, [now.station]);

  const stop = useCallback(() => {
    audio.current?.pause();
    close(false);
    setNow({ station: null, lang: null, playing: false, buffering: false, error: null });
  }, [close]);

  return <Ctx.Provider value={{ ...now, play, toggle, stop, heard, takeHeard }}>{children}</Ctx.Provider>;
}
