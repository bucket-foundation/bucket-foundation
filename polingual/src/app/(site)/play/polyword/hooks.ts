"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ADS } from "@/lib/lobby/ads";
import type { Bank } from "@/lib/polyword/bank";
import { gameOf, parseProgress, PROGRESS_KEY, emptyProgress, type Progress } from "@/lib/polyword/progress";
import { installH5, requestReward } from "@/lib/polyword/reward";
import { rollDay, typeKey } from "@/lib/polyword/view";
import { local } from "@/lib/storage";
import { loadAdSense } from "../Ad";

const PLACEHOLDER_AD_MS = 5000;

export type Unlock = { day: number; state: "offer" | "watching" | "nofill" | "dismissed" } | null;

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);
  return { toast, flash };
}

export function useProgress(bank: Bank, flash: (msg: string) => void) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<string>("es");
  const dirty = useRef(false);

  useEffect(() => {
    const p = parseProgress(local()?.getItem(PROGRESS_KEY) ?? null);
    setProgress(p);
    if (p.lang && bank.langs[p.lang]?.length) setLang(p.lang);
    setLoaded(true);
  }, [bank]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    dirty.current = true;
    setProgress(fn);
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      local()?.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      flash("This browser is not saving your progress");
    }
  }, [progress, flash]);

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === PROGRESS_KEY && e.newValue) setProgress(parseProgress(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return { progress, loaded, lang, setLang, update };
}

export function useDay(today: number | null, lang: string, progress: Progress) {
  const [day, setDay] = useState<number | null>(null);
  const lastToday = useRef<number | null>(null);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    if (today === null) return;
    const prev = lastToday.current;
    lastToday.current = today;
    setDay((d) => rollDay(d, today, prev, (x) => gameOf(progressRef.current, lang, x)));
  }, [today, lang]);
  return { day, setDay };
}

export function useTyping(active: boolean, onKey: (k: string) => void) {
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = typeKey(e);
      if (k === "enter" && (el?.tagName === "BUTTON" || el?.tagName === "A")) return;
      if (k === "enter" || k === "back") e.preventDefault();
      if (k) onKey(k);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [active, onKey]);
}

export function useStripScroll(strip: RefObject<HTMLUListElement | null>, shown: number, over: boolean) {
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const item = el.children[over ? 0 : Math.max(0, shown - 1)] as HTMLElement | undefined;
    el.scrollTo({ left: item ? item.offsetLeft - el.offsetLeft - 4 : 0, behavior: "smooth" });
  }, [shown, over, strip]);
}

export function useUnlock(grant: (d: number) => void) {
  const [unlock, setUnlock] = useState<Unlock>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const rewardTimer = useRef<number | undefined>(undefined);
  const watchId = useRef(0);

  useEffect(() => () => window.clearTimeout(rewardTimer.current), []);

  const closeSheet = () => {
    watchId.current++;
    window.clearTimeout(rewardTimer.current);
    setUnlock(null);
  };

  const watch = async (d: number) => {
    const id = ++watchId.current;
    setUnlock({ day: d, state: "watching" });
    if (ADS.mode === "placeholder") {
      rewardTimer.current = window.setTimeout(() => grant(d), PLACEHOLDER_AD_MS);
      return;
    }
    if (ADS.client) loadAdSense(ADS.client);
    installH5(window as unknown as Parameters<typeof installH5>[0]);
    const r = await requestReward(window as unknown as Parameters<typeof requestReward>[0], "polyword-archive");
    if (id !== watchId.current) return;
    if (r === "viewed") grant(d);
    else setUnlock({ day: d, state: r === "dismissed" ? "dismissed" : "nofill" });
  };

  useEffect(() => {
    if (!unlock || unlock.state === "watching") return;
    sheet.current?.querySelector<HTMLElement>("button, a")?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [unlock]);

  return { unlock, setUnlock, sheet, watch, closeSheet };
}
