"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { streamOf, type RadioStation } from "./radio";

export type NowPlaying = { station: RadioStation | null; lang: string | null; playing: boolean; buffering: boolean; error: string | null };

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
    const a = new Audio();
    a.preload = "none";
    audio.current = a;
    const on = (patch: Partial<NowPlaying>) => () => setNow((n) => ({ ...n, ...patch }));
    a.addEventListener("playing", on({ playing: true, buffering: false, error: null }));
    a.addEventListener("pause", on({ playing: false }));
    a.addEventListener("waiting", on({ buffering: true }));
    a.addEventListener("error", on({ playing: false, buffering: false, error: "This station stopped. Pick another." }));
    return () => {
      a.pause();
      a.src = "";
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
