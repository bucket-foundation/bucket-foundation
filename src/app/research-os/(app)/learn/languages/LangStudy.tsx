"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readReadingsPref, recognitionSupported, writeReadingsPref } from "@/lib/academy/lang-client";
import { buildQueue, cardId, exerciseFor, learnerLevel, matchExercise, readingsByForm, requeueAfterMiss, seededRng, type Exercise, type QueueEntry } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { linkForms, targetFirst } from "@/lib/academy/lang-layout";
import LangExercise, { ReadingsContext, type ExerciseResult, type MatchGrading } from "./LangExercise";
import { gradeWebMatch } from "@/lib/academy/flag-misses";
import { useLangSystem } from "./useLangSystem";

export default function LangStudy({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
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
      setQueue(buildQueue(system, corpus, state));
    }
  }, [h.status, system, corpus, state, queue]);

  const entry = queue?.[i];
  const unitTitle = entry && corpus ? corpus.units[corpus.byId.get(entry.itemId)?.unit ?? -1]?.title : undefined;
  const ex: Exercise | null = useMemo(() => {
    if (!entry || !system || !corpus) return null;
    const item = corpus.byId.get(entry.itemId);
    if (!item) return null;
    if (entry.stage === "match") return matchExercise(corpus, system, item, rng);
    const card = state.cards[cardId(entry.lang, entry.itemId)];
    const made = exerciseFor(corpus, system, item, entry.lang, card, rng, { speech: recognitionSupported(), afterIntro: entry.stage === "check", level: learnerLevel(state, entry.lang) });
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

  if (h.status === "loading" || (h.status === "ready" && queue === null)) return <LoadingState label="Building your session" />;
  if (h.status === "error") return <ErrorState title="The session did not load" />;
  if (!system || !corpus || !queue) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  if (queue.length === 0) return <EmptyState title="Nothing due" body="You have met today's new words in every language of this set. Come back tomorrow." action={{ href: back, label: "progress" }} />;

  if (i >= queue.length || !ex) {
    return (
      <div className="flex flex-col gap-4" data-testid="session-done">
        <h1 className="font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] text-[color:var(--basalt)]">session done</h1>
        <p className="text-[14px] text-[color:var(--basalt-2)] [font-variant-numeric:tabular-nums]">
          {correct} of {graded} right · +{state.stats.xp - xpStart.current} xp · {state.stats.streak} day streak
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={back} className={BTN_PRIMARY}>
            see progress
          </Link>
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => {
              setQueue(buildQueue(system, corpus, state));
              setI(0);
              setGraded(0);
              setCorrect(0);
              xpStart.current = state.stats.xp;
            }}
          >
            another round
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl min-w-0">
      <div className="flex items-center justify-between gap-3 text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
        <Link href={back} className="underline underline-offset-4">
          {system.name}
        </Link>
        <span data-testid="counter">
          {i + 1} / {queue.length} · {state.stats.xp} xp{unitTitle ? ` · unit: ${unitTitle}` : ""}
        </span>
      </div>
      <div className="h-1 bg-[color:var(--hairline)]">
        <div className="h-1 bg-[color:var(--gold-deep)]" style={{ width: `${Math.round((i / queue.length) * 100)}%` }} />
      </div>
      <ReadingsContext.Provider value={readings}>
        <LangExercise key={`${i}-${entry?.itemId}-${entry?.lang}-${entry?.stage}`} ex={ex} onDone={onDone} optionReadings={optionReadings} links={links} targetLayout={!!h.shared} match={match} />
      </ReadingsContext.Provider>
      <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => setI((x) => x + 1)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]" data-testid="skip-exercise">
        skip this one
      </button>
      <label className="flex items-center gap-2 text-[12px] text-[color:var(--basalt-3)]">
        <input
          type="checkbox"
          checked={readings}
          onChange={(e) => {
            setReadings(e.target.checked);
            writeReadingsPref(e.target.checked);
          }}
          data-testid="readings-toggle"
        />
        show readings and IPA
      </label>
      </div>
    </div>
  );
}
