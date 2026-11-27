"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { stationAudio } from "@/lib/speak";
import { local } from "@/lib/storage";
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

export const HEARD_KEY = "polingual.radio.heard";
const MAX_HEARD = 200;

export function parseHeard(raw: string | null): Heard[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((h): h is Heard => !!h && typeof h.stationId === "string" && typeof h.lang === "string" && Number.isFinite(h.startedAt) && Number.isFinite(h.ms) && h.ms >= 1000)
      .slice(-MAX_HEARD);
  } catch {
    return [];
  }
}

function saveHeard(list: Heard[]) {
  try {
    const s = local();
    if (!s) return;
    if (list.length) s.setItem(HEARD_KEY, JSON.stringify(list.slice(-MAX_HEARD)));
    else s.removeItem(HEARD_KEY);
  } catch {
    return;
  }
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

function restoreHeard(): Heard[] {
  try {
    return parseHeard(local()?.getItem(HEARD_KEY) ?? null);
  } catch {
    return [];
  }
}

function usePageHide(onHide: () => void) {
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [onHide]);
}

function useListening(playing: boolean) {
  const listening = useRef<Listening | null>(null);
  const heardList = useRef<Heard[]>([]);
  const [heard, setHeard] = useState<Heard[]>([]);

  const keepHeard = useCallback((next: Heard[]) => {
    heardList.current = next;
    saveHeard(next);
    setHeard(next);
  }, []);

  const close = useCallback((keep: boolean) => {
    const t = Date.now();
    const l = settle(listening.current, t);
    const h = heardOf(l);
    if (h) keepHeard([...heardList.current, h]);
    listening.current = keep && l ? { ...l, startedAt: t, ms: 0, since: null } : null;
  }, [keepHeard]);

  const checkpoint = useCallback(() => {
    const was = listening.current?.since != null;
    close(true);
    if (was && listening.current) listening.current = { ...listening.current, since: Date.now() };
  }, [close]);

  const takeHeard = useCallback((pick: (h: Heard) => boolean) => {
    const out = heardList.current.filter(pick);
    keepHeard(heardList.current.filter((h) => !pick(h)));
    return out;
  }, [keepHeard]);

  const resume = useCallback(() => {
    if (listening.current && listening.current.since === null) listening.current = { ...listening.current, since: Date.now() };
  }, []);

  const begin = useCallback((stationId: string, lang: string) => {
    if (listening.current?.stationId === stationId && listening.current?.lang === lang) return;
    close(false);
    listening.current = { stationId, lang, startedAt: Date.now(), since: null, ms: 0 };
  }, [close]);

  useEffect(() => {
    const restored = restoreHeard();
    if (restored.length) {
      heardList.current = [...restored, ...heardList.current];
      setHeard(heardList.current);
    }
  }, []);

  usePageHide(checkpoint);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(checkpoint, HEARD_FLUSH_MS);
    return () => clearInterval(id);
  }, [playing, checkpoint]);

  return { heard, takeHeard, close, resume, begin };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<NowPlaying>({ station: null, lang: null, playing: false, buffering: false, error: null });
  const { heard, takeHeard, close, resume, begin } = useListening(now.playing);

  useEffect(() => {
    const a = stationAudio();
    audio.current = a;
    const handlers: [string, () => void][] = [
      ["playing", () => {
        resume();
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
  }, [close, resume]);

  const play = useCallback((s: RadioStation, lang: string) => {
    const a = audio.current;
    const url = streamOf(s);
    if (!a || !url) return setNow((n) => ({ ...n, station: s, lang, error: "This station stopped. Pick another." }));
    if (a.src !== url) a.src = url;
    begin(s.stationuuid, lang);
    setNow({ station: s, lang, playing: false, buffering: true, error: null });
    void a.play().catch(() => setNow((n) => ({ ...n, buffering: false, playing: false, error: "Tap play to start the station." })));
  }, [begin]);

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
