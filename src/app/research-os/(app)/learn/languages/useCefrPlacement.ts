"use client";

import { useEffect, useMemo, useState } from "react";
import { readingsByForm, seededRng, type Exercise, type Reading } from "@/lib/academy/lang-systems";
import { bandsAvailable, cefrPlacement, cefrQuestion, cefrStep, levelLabel, type CefrAnswer, type CefrPlacement, type CefrTask, type PlacementSource, type TopWord } from "@/lib/academy/placement-cefr";
import { loadTopWords, speechSupported } from "@/lib/academy/lang-client";
import type { LangSystemHandle } from "./useLangSystem";

export interface CefrPlacementRun {
  lang: string | null;
  question: { task: CefrTask; ex: Exercise } | null;
  result: CefrPlacement | null;
  answers: CefrAnswer[];
  band: string | undefined;
  readings: Record<string, Reading>;
  answer: (correct: boolean) => void;
}

export function useCefrPlacement(h: LangSystemHandle, requested: string | null): CefrPlacementRun {
  const { system, corpus } = h;
  const [lang, setLang] = useState<string | null>(null);
  const rng = useMemo(() => seededRng(Date.now() % 2147483647), []);
  const [answers, setAnswers] = useState<CefrAnswer[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState<{ task: CefrTask; ex: Exercise } | null>(null);
  const [result, setResult] = useState<CefrPlacement | null>(null);

  useEffect(() => {
    if (!system) return;
    const pick = requested && system.targets.includes(requested) ? requested : (system.targets.find((t) => system.placement[t] === undefined) ?? system.targets[0]);
    setLang((cur) => {
      if (cur && (!requested || cur === requested)) return cur;
      setAnswers([]);
      setSeen(new Set());
      setQ(null);
      setResult(null);
      return pick;
    });
  }, [system, requested]);

  const [top, setTop] = useState<{ lang: string; words: TopWord[] | null } | null>(null);
  useEffect(() => {
    if (!lang) return;
    let live = true;
    void loadTopWords(lang).then((words) => live && setTop({ lang, words }));
    return () => {
      live = false;
    };
  }, [lang]);
  const src = useMemo<PlacementSource | null>(() => (system && corpus && lang && top?.lang === lang ? { system, corpus, lang, top: top.words } : null), [system, corpus, lang, top]);
  const available = useMemo(() => (src ? bandsAvailable(src) : []), [src]);

  useEffect(() => {
    if (!src || result || q) return;
    const lang = src.lang;
    const step = cefrStep(answers, available);
    const finish = (s: typeof step) => {
      const p = cefrPlacement(src, answers, s);
      h.place(lang, p.floorTier, p.placeIds, levelLabel(p));
      setResult(p);
    };
    if (step.done) return finish(step);
    const next = cefrQuestion(src, step.next!.band, step.next!.task, seen, rng, { speech: speechSupported() });
    if (!next) return finish({ ...step, done: true, unknownFrom: step.next!.band });
    setQ(next);
  }, [src, answers, seen, q, result, rng, h, available]);

  const readings = useMemo(() => (corpus && lang ? readingsByForm(corpus, lang) : {}), [corpus, lang]);

  function answer(correct: boolean) {
    if (!q) return;
    const step = cefrStep(answers, available);
    setAnswers((a) => [...a, { band: step.next!.band, task: q.task, itemId: q.ex.itemId, correct }]);
    setSeen((s) => new Set(s).add(q.ex.itemId));
    setQ(null);
  }

  return { lang, question: q, result, answers, band: cefrStep(answers, available).next?.band, readings, answer };
}
