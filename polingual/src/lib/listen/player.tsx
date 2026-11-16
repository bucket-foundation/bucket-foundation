"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { stationAudio } from "@/lib/speak";
import { streamOf, type RadioStation } from "./radio";

type NowPlaying = { station: RadioStation | null; lang: string | null; playing: boolean; buffering: boolean; error: string | null };

type Player = NowPlaying & { play: (s: RadioStation, lang: string) => void; toggle: () => void; stop: () => void };

const Ctx = createContext<Player | null>(null);

export function usePlayer(): Player {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer needs PlayerProvider");
  return p;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<NowPlaying>({ station: null, lang: null, playing: false, buffering: false, error: null });

  useEffect(() => {
    const a = stationAudio();
    audio.current = a;
    const handlers: [string, () => void][] = [
      ["playing", () => setNow((n) => ({ ...n, playing: true, buffering: false, error: null }))],
      ["pause", () => setNow((n) => ({ ...n, playing: false }))],
      ["waiting", () => setNow((n) => ({ ...n, buffering: true }))],
      ["error", () => setNow((n) => ({ ...n, playing: false, buffering: false, error: n.station ? "This station stopped. Pick another." : null }))],
    ];
    for (const [e, h] of handlers) a.addEventListener(e, h);
    return () => {
      for (const [e, h] of handlers) a.removeEventListener(e, h);
      a.pause();
    };
  }, []);

  const play = useCallback((s: RadioStation, lang: string) => {
    const a = audio.current;
    const url = streamOf(s);
    if (!a || !url) return setNow((n) => ({ ...n, station: s, lang, error: "This station stopped. Pick another." }));
    if (a.src !== url) a.src = url;
    setNow({ station: s, lang, playing: false, buffering: true, error: null });
    void a.play().catch(() => setNow((n) => ({ ...n, buffering: false, playing: false, error: "Tap play to start the station." })));
  }, []);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !now.station) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }, [now.station]);

  const stop = useCallback(() => {
    audio.current?.pause();
    setNow({ station: null, lang: null, playing: false, buffering: false, error: null });
  }, []);

  return <Ctx.Provider value={{ ...now, play, toggle, stop }}>{children}</Ctx.Provider>;
}
