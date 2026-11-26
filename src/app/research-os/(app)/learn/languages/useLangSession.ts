"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mayTakePart, heldOutWords, withoutHeldOut } from "@/lib/academy/input-experiment";
import { currentConsent } from "@/lib/academy/experiment-store";
import { loadTopWords, loadYesNoForms, readReadingsPref, recognitionSupported, writeReadingsPref } from "@/lib/academy/lang-client";
import { exerciseMix, FrequencyRank, letterSessionExercise, session as mixSession, SoundTally, tallyKey } from "@/lib/academy/session-mix";
import { cardId, exerciseFor, learnerLevel, matchExercise, readingsByForm, requeueAfterMiss, seededRng, withMeaning, type Exercise, type QueueEntry, type Reading } from "@/lib/academy/lang-systems";
import { linkForms, targetFirst, type LinkForm } from "@/lib/academy/lang-layout";
import { gradeWebMatch } from "@/lib/academy/flag-misses";
import type { ExerciseResult, MatchGrading } from "./LangExercise";
import type { LangSystemHandle } from "./useLangSystem";
import { realizedShare } from "@/lib/academy/input-mix";
import { useInputMix } from "./useInputMix";

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
  inputDue: boolean;
  finishInput: (unit: string | null, seconds: number) => void;
  inputShown: Readonly<Record<string, number>>;
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
  const tally = useRef(new SoundTally());
  const [freq, setFreq] = useState<FrequencyRank | null>(null);
  const targetsKey = system?.targets.join(",") ?? "";

  useEffect(() => {
    if (!targetsKey) return;
    let live = true;
    const langs = targetsKey.split(",");
    Promise.all(langs.map((l) => loadTopWords(l).then((w) => [l, w ?? []] as const))).then((pairs) => {
      if (live) setFreq(new FrequencyRank(Object.fromEntries(pairs)));
    });
    return () => {
      live = false;
    };
  }, [targetsKey]);

  const [heldOut, setHeldOut] = useState<Record<string, ReadonlySet<string>> | null>(null);
  useEffect(() => {
    if (!targetsKey) return;
    if (!mayTakePart(currentConsent())) {
      setHeldOut({});
      return;
    }
    let live = true;
    const langs = targetsKey.split(",");
    Promise.all(langs.map((l) => loadYesNoForms(l).then((f) => [l, heldOutWords(f)] as const))).then((pairs) => {
      if (live) setHeldOut(Object.fromEntries(pairs.filter(([, s]) => s.size > 0)));
    });
    return () => {
      live = false;
    };
  }, [targetsKey]);
  const studyCorpus = useMemo(() => (corpus && heldOut ? withoutHeldOut(corpus, heldOut) : null), [corpus, heldOut]);

  useEffect(() => {
    if (h.status === "ready" && system && studyCorpus && freq && queue === null) {
      xpStart.current = state.stats.xp;
      tally.current = new SoundTally();
      setQueue(mixSession(system, studyCorpus, state, Date.now(), freq, { heritage }));
    }
  }, [h.status, system, studyCorpus, state, queue, heritage, freq]);

  const [round, setRound] = useState(0);
  const mixState = useInputMix(h, queue ? queue.length : null, round);
  const started = useRef(Date.now());
  const ended = useRef(false);
  const sessionId = useRef("");
  useEffect(() => {
    if (!queue || i < queue.length || graded === 0 || ended.current || !h.endSession) return;
    ended.current = true;
    const endedAt = Date.now();
    const mix = mixState.mix;
    h.endSession({
      id: sessionId.current || (sessionId.current = crypto.randomUUID()),
      started: started.current,
      ended: endedAt,
      share_target: mix ? mix.target : null,
      share_real: mix ? Math.round(realizedShare(mixState.seconds, (endedAt - started.current) / 1000) * 1e4) / 1e4 : null,
      arm: mixState.arm,
      units: mix ? Math.min(mixState.units, 1000) : null,
      cards: Math.min(graded, 1000),
    });
  }, [queue, i, graded, h, mixState]);

  const finishInput = useCallback((unit: string | null, seconds: number) => mixState.finish(i, unit, seconds), [mixState, i]);
  const inputDue = !!queue && mixState.due(i);

  const entry = queue?.[i];
  const unitTitle = entry && corpus ? corpus.units[corpus.byId.get(entry.itemId)?.unit ?? -1]?.title : undefined;
  const ex: Exercise | null = useMemo(() => {
    if (!entry || !system || !corpus) return null;
    if (entry.stage === "letter") {
      const l = letterSessionExercise(entry, system, state, tally.current, rng);
      if (l) tally.current.record(l.kind, tallyKey(entry, i));
      return l;
    }
    const item = corpus.byId.get(entry.itemId);
    if (!item) return null;
    if (entry.stage === "match") {
      const m = matchExercise(corpus, system, item, rng);
      return m ? withMeaning(m, corpus) : m;
    }
    const card = state.cards[cardId(entry.lang, entry.itemId)];
    const mix = exerciseMix(system, item, entry.lang, state, tally.current);
    const made = exerciseFor(corpus, system, item, entry.lang, card, rng, { speech: recognitionSupported(), afterIntro: entry.stage === "check", level: learnerLevel(state, entry.lang), heritage, mix });
    tally.current.record(made.kind, tallyKey(entry, i));
    return withMeaning(h.shared ? targetFirst(corpus, item, made, rng) : made, corpus);
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
    if (!system || !studyCorpus || !freq) return;
    tally.current = new SoundTally();
    setQueue(mixSession(system, studyCorpus, state, Date.now(), freq, { heritage }));
    started.current = Date.now();
    ended.current = false;
    sessionId.current = "";
    setRound((r) => r + 1);
    setI(0);
    setGraded(0);
    setCorrect(0);
    xpStart.current = state.stats.xp;
  }, [system, studyCorpus, state, heritage, freq]);
  const showReadings = useCallback((on: boolean) => {
    setReadings(on);
    writeReadingsPref(on);
  }, []);

  return { queue, i, entry, ex, unitTitle, links, optionReadings, onDone, match, graded, correct, xpGained: state.stats.xp - xpStart.current, readings, showReadings, skip, restart, inputDue, finishInput, inputShown: mixState.shown };
}
