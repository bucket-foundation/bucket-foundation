"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readReadingsPref, recognitionSupported, writeReadingsPref } from "@/lib/academy/lang-client";
import { buildQueue, cardId, exerciseFor, learnerLevel, letterExerciseFor, matchExercise, readingsByForm, requeueAfterMiss, seededRng, type Exercise, type QueueEntry, type Reading } from "@/lib/academy/lang-systems";
import { linkForms, targetFirst, type LinkForm } from "@/lib/academy/lang-layout";
import { gradeWebMatch } from "@/lib/academy/flag-misses";
import type { ExerciseResult, MatchGrading } from "./LangExercise";
import type { LangSystemHandle } from "./useLangSystem";

export interface LangSession {
  queue: QueueEntry[] | null;
  i: number;
  entry: QueueEntry | undefined;
  ex: Exercise | null;
  unitTitle: string | undefined;
  links: LinkForm[] | undefined;
  optionReadings: Record<string, Reading> | undefined;
  onDone: (results: ExerciseResult[]) => void;
  match: MatchGrading;
  graded: number;
  correct: number;
  xpGained: number;
  readings: boolean;
  showReadings: (on: boolean) => void;
  skip: () => void;
  restart: () => void;
}

export function useLangSession(h: LangSystemHandle, heritage = false): LangSession {
  const { system, corpus, state } = h;
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [i, setI] = useState(0);
  const [graded, setGraded] = useState(0);
  const [correct, setCorrect] = useState(0);
  const xpStart = useRef(0);
  const rng = useMemo(() => seededRng(Date.now() % 2147483647), []);
  const [readings, setReadings] = useState(true);
  useEffect(() => setReadings(readReadingsPref()), []);

  useEffect(() => {
    if (h.status === "ready" && system && corpus && queue === null) {
      xpStart.current = state.stats.xp;
      setQueue(buildQueue(system, corpus, state, Date.now(), 14, { heritage }));
    }
  }, [h.status, system, corpus, state, queue, heritage]);

  const entry = queue?.[i];
  const unitTitle = entry && corpus ? corpus.units[corpus.byId.get(entry.itemId)?.unit ?? -1]?.title : undefined;
  const ex: Exercise | null = useMemo(() => {
    if (!entry || !system || !corpus) return null;
    if (entry.stage === "letter") return letterExerciseFor(entry.lang, system.root, entry.itemId, rng);
    const item = corpus.byId.get(entry.itemId);
    if (!item) return null;
    if (entry.stage === "match") return matchExercise(corpus, system, item, rng);
    const card = state.cards[cardId(entry.lang, entry.itemId)];
    const made = exerciseFor(corpus, system, item, entry.lang, card, rng, { speech: recognitionSupported(), afterIntro: entry.stage === "check", level: learnerLevel(state, entry.lang), heritage });
    return h.shared ? targetFirst(corpus, item, made, rng) : made;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, system, corpus, rng]);

  const links = useMemo(() => {
    if (!h.shared || !ex || !system || !corpus || ex.kind !== "intro") return undefined;
    const item = corpus.byId.get(ex.itemId);
    return item ? linkForms(item, system, ex.lang) : undefined;
  }, [h.shared, ex, system, corpus]);

  const optionReadings = useMemo(() => (ex && corpus ? readingsByForm(corpus, ex.answerLang) : undefined), [ex, corpus]);

  const onDone = useCallback(
    (results: ExerciseResult[]) => {
      if (!entry || !queue) return;
      let q = queue;
      for (const r of results) {
        h.grade(r.lang, entry.itemId, r.rating);
        if (r.rating === 1) q = requeueAfterMiss(q, i, { itemId: entry.itemId, lang: r.lang, stage: "review" });
      }
      if (results.length) {
        setGraded((g) => g + results.length);
        setCorrect((c) => c + results.filter((r) => r.rating > 1).length);
      }
      if (q !== queue) setQueue(q);
      setI((x) => x + 1);
    },
    [entry, queue, i, h]
  );

  const match = useMemo<MatchGrading>(
    () => ({
      grade: (pairs, assign) => {
        const { results, tables } = gradeWebMatch(pairs, assign, state);
        h.recordFlags(tables);
        return results;
      },
    }),
    [state, h]
  );

  const skip = useCallback(() => setI((x) => x + 1), []);
  const restart = useCallback(() => {
    if (!system || !corpus) return;
    setQueue(buildQueue(system, corpus, state, Date.now(), 14, { heritage }));
    setI(0);
    setGraded(0);
    setCorrect(0);
    xpStart.current = state.stats.xp;
  }, [system, corpus, state, heritage]);
  const showReadings = useCallback((on: boolean) => {
    setReadings(on);
    writeReadingsPref(on);
  }, []);

  return { queue, i, entry, ex, unitTitle, links, optionReadings, onDone, match, graded, correct, xpGained: state.stats.xp - xpStart.current, readings, showReadings, skip, restart };
}
