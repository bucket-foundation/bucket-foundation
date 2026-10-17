"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { langName, placementItems, placementTier, seededRng, shuffle, type LangItem } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";
import SaveNotice from "./SaveNotice";

interface Answer {
  tier: number;
  correct: boolean;
}

export default function LangPlacement({ systemId, lang: requested }: { systemId: string; lang: string | null }) {
  const h = useLangSystem(systemId);
  const { system, corpus } = h;
  const [lang, setLang] = useState<string | null>(null);
  useEffect(() => {
    if (!system) return;
    const pick = requested && system.targets.includes(requested) ? requested : (system.targets.find((t) => system.placement[t] === undefined) ?? system.targets[0]);
    setLang((cur) => (cur && (!requested || cur === requested) ? cur : pick));
  }, [system, requested]);
  const rng = useMemo(() => seededRng(Date.now() % 2147483647), []);
  const [items, setItems] = useState<LangItem[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<number | null>(null);

  const builtFor = useRef<string | null>(null);
  useEffect(() => {
    if (system && corpus && lang && builtFor.current !== lang) {
      builtFor.current = lang;
      setItems(placementItems(system, corpus, lang, rng));
      setI(0);
      setAnswers([]);
      setResult(null);
    }
  }, [system, corpus, lang, rng]);

  const item = items?.[i];
  const options = useMemo(() => {
    if (!item || !corpus || !lang) return [];
    const others = shuffle(
      corpus.items.filter((x) => x.kind === "word" && x.id !== item.id && x.forms[lang] && x.forms[lang] !== item.forms[lang]),
      rng
    )
      .slice(0, 3)
      .map((x) => x.forms[lang]);
    return shuffle([item.forms[lang], ...others], rng);
  }, [item, corpus, lang, rng]);

  if (h.status === "loading") return <LoadingState label="Loading placement" />;
  if (h.status === "error") return <ErrorState title="Placement did not load" />;
  if (!system || !corpus || !lang || !items) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  const nextLang = system.targets.find((t) => t !== lang && system.placement[t] === undefined);

  function answer(correct: boolean) {
    if (!item || !system) return;
    const next = [...answers, { tier: item.tier, correct }];
    const atTier = next.filter((a) => a.tier === item.tier);
    const tierMissed = atTier.length >= 2 && atTier.filter((a) => a.correct).length === 0;
    if (tierMissed || i + 1 >= (items?.length ?? 0)) {
      const tier = placementTier(next);
      h.place(lang!, tier);
      setResult(tier);
    } else {
      setI(i + 1);
    }
    setAnswers(next);
  }

  if (result !== null) {
    return (
      <div className="flex flex-col gap-4" data-testid="placement-done">
        <PageHeader eyebrow={`placement · ${langName(lang)}`} title={`placed at tier ${result}`} lede={result > 0 ? `Words below tier ${result} start as known and come back for review on the normal schedule.` : "You start from the first words."} />
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

  if (!item) return <EmptyState title="No placement words for this language" action={{ href: back, label: "progress" }} />;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <PageHeader eyebrow={`placement · ${langName(lang)}`} title={`${langName(system.root)} to ${langName(lang)}`} lede="Pick the word you know. Skip the ones you do not. It stops when a tier goes past you." />
      <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]" data-testid="counter">
        {i + 1} / {items.length} · tier {item.tier}
      </div>
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind="placement">
        <div className="text-[15px] text-[color:var(--basalt)]">
          {langName(lang)} for <strong>{item.forms[system.root]}</strong>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {options.map((o) => (
            <button key={o} type="button" lang={lang} onClick={() => answer(o === item.forms[lang])} className="border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 text-left rounded-sm min-h-[48px] text-[15px]" data-testid="option">
              {o}
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
