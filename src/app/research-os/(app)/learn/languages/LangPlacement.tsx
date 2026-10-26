"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { langName, readingsByForm, seededRng, type Exercise } from "@/lib/academy/lang-systems";
import { bandsAvailable, cefrPlacement, cefrQuestion, cefrStep, levelLabel, type CefrAnswer, type CefrPlacement, type CefrTask, type PlacementSource, type TopWord } from "@/lib/academy/placement-cefr";
import { loadTopWords, speechSupported } from "@/lib/academy/lang-client";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";
import SaveNotice from "./SaveNotice";
import LangExercise from "./LangExercise";

export default function LangPlacement({ systemId, lang: requested }: { systemId: string; lang: string | null }) {
  const h = useLangSystem(systemId);
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

  if (h.status === "loading") return <LoadingState label="Loading placement" />;
  if (h.status === "error") return <ErrorState title="Placement did not load" />;
  if (!system || !corpus || !lang) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  const nextLang = system.targets.find((t) => t !== lang && system.placement[t] === undefined);

  function answer(correct: boolean) {
    if (!q) return;
    const step = cefrStep(answers, available);
    setAnswers((a) => [...a, { band: step.next!.band, task: q.task, itemId: q.ex.itemId, correct }]);
    setSeen((s) => new Set(s).add(q.ex.itemId));
    setQ(null);
  }

  if (result) {
    const label = levelLabel(result);
    const note = result.mapping === "none" ? "This language has no CEFR exam, so the bands carry no CEFR claim." : "Levels come from Polingual corpus bands mapped to CEFR as a proxy. No exam has validated them yet.";
    return (
      <div className="flex flex-col gap-4" data-testid="placement-done" data-level={result.level}>
        <PageHeader eyebrow={`placement · ${langName(lang)}`} title={`level ${label}`} lede={`${answers.length} questions. ${result.placeIds.length ? `${result.placeIds.length} words you answered right start as known.` : "You start from the first words."} ${note}`} />
        <ul className="text-[13px] text-[color:var(--basalt-2)] [font-variant-numeric:tabular-nums]" data-testid="bands">
          {result.bands.map((b) => (
            <li key={b.band}>
              {b.band}: {b.right} of {b.asked} right, {b.passed ? "passed" : "not passed"}
            </li>
          ))}
          {result.unknownFrom ? <li>{result.unknownFrom} and above: not enough material in this language to test</li> : null}
        </ul>
        <SaveNotice state={h.saveState} />
        <div className="flex flex-wrap gap-2">
          {nextLang ? (
            <Link href={`/research-os/learn/languages/${system.id}/place?lang=${nextLang}`} className={BTN_PRIMARY}>
              place {langName(nextLang)}
            </Link>
          ) : (
            <Link href={`/research-os/learn/languages/${system.id}/study`} className={BTN_PRIMARY}>
              start studying
            </Link>
          )}
          <Link href={back} className={BTN_SECONDARY}>
            progress
          </Link>
        </div>
      </div>
    );
  }

  if (!q) return <LoadingState label="Picking the next question" />;
  const band = cefrStep(answers, available).next?.band;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <PageHeader eyebrow={`placement · ${langName(lang)}`} title={`${langName(system.root)} to ${langName(lang)}`} lede="Each level mixes typing, listening, gap fills, grammar and short reading. A level passes on 6 right before 3 misses. The test stops at the first level you do not pass." />
      <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]" data-testid="counter">
        question {answers.length + 1} · level {band}
      </div>
      <LangExercise key={`${answers.length}`} ex={q.ex} optionReadings={readings} onDone={(r) => answer(r.every((x) => x.rating > 1))} />
      <button type="button" onClick={() => answer(false)} className="self-start text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]" data-testid="skip">
        I do not know
      </button>
    </div>
  );
}
