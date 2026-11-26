"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bandsFor, loadBundle } from "@/lib/academy/input-selector";
import type { InputMix } from "@/lib/academy/input-mix";
import { enrolmentKey, experimentMix, mayTakePart } from "@/lib/academy/input-experiment";
import { browserMemoryIO } from "@/lib/academy/lang-memory-store";
import { cacheEnrolment, currentConsent, fetchEnrolment, readEnrolment, readTaken, registerEnrolment } from "@/lib/academy/experiment-store";
import { useSession } from "@/providers/SessionProvider";
import { dueLemmas, eligibleUnitSeconds, inputMode, knownWords, learnerFromState } from "@/lib/academy/input-stage";
import { loadTopWords } from "@/lib/academy/lang-client";
import { freqIndex } from "@/lib/academy/learner-model";
import type { LangSystemHandle } from "./useLangSystem";

export interface InputMixState {
  mix: InputMix | null;
  arm: string | null;
  due: (i: number) => boolean;
  finish: (i: number, unit: string | null, seconds: number) => void;
  shown: Readonly<Record<string, number>>;
  units: number;
  seconds: number;
}

export function useInputMix(h: LangSystemHandle, queueLength: number | null, round: number): InputMixState {
  const [mix, setMix] = useState<InputMix | null>(null);
  const [arm, setArm] = useState<string | null>(null);
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
  const { user, accessToken } = useSession();
  const account = user?.id ?? null;

  useEffect(() => {
    setMix(null);
    setArm(null);
    setDone(new Set());
    setShown({});
    totals.current = { units: 0, seconds: 0 };
    const cards = lengthRef.current;
    if (cards === null || mode === "off" || !lang || !h.resolve || !h.logExposures) return;
    let live = true;
    const resolve = h.resolve;
    const tier = h.system?.placement[lang] ?? 0;
    const consent = currentConsent();
    const server = mayTakePart(consent) && accessToken ? fetchEnrolment(accessToken) : Promise.resolve({ ok: false as const });
    Promise.all([loadBundle(lang, undefined, undefined, bandsFor(knownWords(stateRef.current, lang, Date.now()))), loadTopWords(lang), server]).then(async ([b, top, stored]) => {
      if (!live || !b) return;
      const now = Date.now();
      const learner = learnerFromState(stateRef.current, lang, resolve, now, tier, dueLemmas(b, stateRef.current, lang, resolve, now), {}, null, freqIndex((top ?? []).map((w) => [w.word, w.rank] as const)));
      const seconds = eligibleUnitSeconds(b, learner, mode);
      const known = stored.ok ? stored.enrolment : readEnrolment();
      if (stored.ok && stored.enrolment) cacheEnrolment(stored.enrolment);
      const key = stored.ok && account && readTaken().baseline ? enrolmentKey(account, browserMemoryIO.deviceId()) : null;
      let planned = experimentMix(consent, known, key, tier, cards, seconds, now);
      if (planned.enrolment && !known) {
        const saved = accessToken ? await registerEnrolment(accessToken, planned.enrolment.stratum) : null;
        if (saved) cacheEnrolment(saved);
        planned = experimentMix(saved ? consent : { ...consent, flag: false }, saved, null, tier, cards, seconds, now);
      }
      if (!live) return;
      setMix(planned.mix);
      setArm(planned.arm);
    });
    return () => {
      live = false;
    };
  }, [ready, round, mode, lang, h.resolve, h.logExposures, h.system, account, accessToken]);

  const due = useCallback((i: number) => !!mix && mix.positions.includes(i) && !done.has(i), [mix, done]);
  const finish = useCallback((i: number, unit: string | null, seconds: number) => {
    setDone((d) => new Set([...Array.from(d), i]));
    if (unit) {
      setShown((s) => ({ ...s, [unit]: (s[unit] ?? 0) + 1 }));
      totals.current = { units: totals.current.units + 1, seconds: totals.current.seconds + Math.max(0, seconds) };
    }
  }, []);
  return { mix, arm, due, finish, shown, units: totals.current.units, seconds: totals.current.seconds };
}
