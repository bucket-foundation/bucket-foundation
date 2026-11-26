"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBundle } from "@/lib/academy/input-selector";
import { planInputMix, type InputMix } from "@/lib/academy/input-mix";
import { dueLemmas, eligibleUnitSeconds, inputMode, learnerFromState } from "@/lib/academy/input-stage";
import { loadTopWords } from "@/lib/academy/lang-client";
import { freqIndex } from "@/lib/academy/learner-model";
import type { LangSystemHandle } from "./useLangSystem";

export interface InputMixState {
  mix: InputMix | null;
  due: (i: number) => boolean;
  finish: (i: number, unit: string | null, seconds: number) => void;
  shown: Readonly<Record<string, number>>;
  units: number;
  seconds: number;
}

export function useInputMix(h: LangSystemHandle, queueLength: number | null, round: number): InputMixState {
  const [mix, setMix] = useState<InputMix | null>(null);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [shown, setShown] = useState<Record<string, number>>({});
  const totals = useRef({ units: 0, seconds: 0 });
  const lang = h.system?.targets.find((l) => h.langStatus[l] === "ready");
  const mode = inputMode();
  const stateRef = useRef(h.state);
  stateRef.current = h.state;
  const lengthRef = useRef(queueLength);
  lengthRef.current = queueLength;
  const ready = queueLength !== null;

  useEffect(() => {
    setMix(null);
    setDone(new Set());
    setShown({});
    totals.current = { units: 0, seconds: 0 };
    const cards = lengthRef.current;
    if (cards === null || mode === "off" || !lang || !h.resolve || !h.logExposures) return;
    let live = true;
    const resolve = h.resolve;
    const tier = h.system?.placement[lang] ?? 0;
    Promise.all([loadBundle(lang), loadTopWords(lang)]).then(([b, top]) => {
      if (!live || !b) return;
      const now = Date.now();
      const learner = learnerFromState(stateRef.current, lang, resolve, now, tier, dueLemmas(b, stateRef.current, lang, resolve, now), {}, null, freqIndex((top ?? []).map((w) => [w.word, w.rank] as const)));
      setMix(planInputMix(tier, cards, eligibleUnitSeconds(b, learner, mode)));
    });
    return () => {
      live = false;
    };
  }, [ready, round, mode, lang, h.resolve, h.logExposures, h.system]);

  const due = useCallback((i: number) => !!mix && mix.positions.includes(i) && !done.has(i), [mix, done]);
  const finish = useCallback((i: number, unit: string | null, seconds: number) => {
    setDone((d) => new Set([...Array.from(d), i]));
    if (unit) {
      setShown((s) => ({ ...s, [unit]: (s[unit] ?? 0) + 1 }));
      totals.current = { units: totals.current.units + 1, seconds: totals.current.seconds + Math.max(0, seconds) };
    }
  }, []);
  return { mix, due, finish, shown, units: totals.current.units, seconds: totals.current.seconds };
}
