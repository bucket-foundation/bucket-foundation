"use client";

import Link from "next/link";
import { langName } from "@/lib/academy/lang-systems";
import { levelLabel } from "@/lib/academy/placement-cefr";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";
import { useCefrPlacement } from "./useCefrPlacement";
import SaveNotice from "./SaveNotice";
import LangExercise from "./LangExercise";

export default function LangPlacement({ systemId, lang: requested }: { systemId: string; lang: string | null }) {
  const h = useLangSystem(systemId);
  const { system, corpus } = h;
  const { lang, question: q, result, answers, band, readings, answer } = useCefrPlacement(h, requested);

  if (h.status === "loading") return <LoadingState label="Loading placement" />;
  if (h.status === "error") return <ErrorState title="Placement did not load" />;
  if (!system || !corpus || !lang) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  const nextLang = system.targets.find((t) => t !== lang && system.placement[t] === undefined);

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
