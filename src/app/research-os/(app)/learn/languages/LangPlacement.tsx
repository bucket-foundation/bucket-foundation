"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { langDir, langName, placementItem, placementOptions, placementStep, readingsByForm, seededRng, type LangItem, type PlacementAnswer } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";
import SaveNotice from "./SaveNotice";
import { ReadingLine } from "./LangExercise";

export default function LangPlacement({ systemId, lang: requested }: { systemId: string; lang: string | null }) {
  const h = useLangSystem(systemId);
  const { system, corpus } = h;
  const [lang, setLang] = useState<string | null>(null);
  const rng = useMemo(() => seededRng(Date.now() % 2147483647), []);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [item, setItem] = useState<LangItem | null>(null);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    if (!system) return;
    const pick = requested && system.targets.includes(requested) ? requested : (system.targets.find((t) => system.placement[t] === undefined) ?? system.targets[0]);
    setLang((cur) => {
      if (cur && (!requested || cur === requested)) return cur;
      setAnswers([]);
      setSeen(new Set());
      setItem(null);
      setResult(null);
      return pick;
    });
  }, [system, requested]);

  useEffect(() => {
    if (!system || !corpus || !lang || result !== null || item) return;
    const step = placementStep(answers);
    if (step.done) {
      h.place(lang, step.tier);
      setResult(step.tier);
      return;
    }
    const next = placementItem(system, corpus, lang, step.nextTier!, seen, rng);
    if (!next) {
      h.place(lang, step.tier);
      setResult(step.tier);
      return;
    }
    setItem(next);
  }, [system, corpus, lang, answers, seen, item, result, rng, h]);

  const options = useMemo(() => (item && corpus && lang && system ? placementOptions(corpus, item, lang, system.root, rng) : []), [item, corpus, lang, system, rng]);
  const readings = useMemo(() => (corpus && lang ? readingsByForm(corpus, lang) : {}), [corpus, lang]);

  if (h.status === "loading") return <LoadingState label="Loading placement" />;
  if (h.status === "error") return <ErrorState title="Placement did not load" />;
  if (!system || !corpus || !lang) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  const nextLang = system.targets.find((t) => t !== lang && system.placement[t] === undefined);

  function answer(correct: boolean) {
    if (!item) return;
    setAnswers((a) => [...a, { tier: item.tier, correct }]);
    setSeen((s) => new Set(s).add(item.id));
    setItem(null);
  }

  if (result !== null) {
    return (
      <div className="flex flex-col gap-4" data-testid="placement-done">
        <PageHeader
          eyebrow={`placement · ${langName(lang)}`}
          title={`placed at tier ${result}`}
          lede={`${answers.length} questions. ${result > 0 ? `Words below tier ${result} start as known and come back for review on the normal schedule.` : "You start from the first words."}`}
        />
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

  if (!item) return <LoadingState label="Picking the next word" />;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <PageHeader eyebrow={`placement · ${langName(lang)}`} title={`${langName(system.root)} to ${langName(lang)}`} lede="Pick the word you know. Skip the ones you do not. The test narrows in on your level and stops when it finds it." />
      <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]" data-testid="counter">
        question {answers.length + 1} · tier {item.tier}
      </div>
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind="placement">
        <div className="text-[15px] text-[color:var(--basalt)]">
          {langName(lang)} for <strong>{item.forms[system.root]}</strong>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {options.map((o) => (
            <button key={o} type="button" lang={lang} dir={langDir(lang)} onClick={() => answer(o === item.forms[lang])} className="border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 text-left rounded-sm min-h-[48px] text-[15px]" data-testid="option">
              {o}
              <ReadingLine reading={readings[o]} testId="option-reading" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => answer(false)} className="mt-3 text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]" data-testid="skip">
          I do not know
        </button>
      </section>
    </div>
  );
}
