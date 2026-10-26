"use client";

import Link from "next/link";
import { heritageLangs, langName, studyHref } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import LangExercise, { ReadingsContext } from "./LangExercise";
import { useLangSession } from "./useLangSession";
import { useLangSystem } from "./useLangSystem";

export function HeritageLink({ systemId, langs, on }: { systemId: string; langs: string[]; on: boolean }) {
  if (!on && langs.length === 0) return null;
  return (
    <Link href={studyHref(systemId, !on)} className="text-[12px] underline underline-offset-4 text-[color:var(--aegean-deep)]" data-testid="heritage-link">
      {on ? "back to regular study" : `I speak ${langs.map(langName).join(" or ")} but can't read the script`}
    </Link>
  );
}

export default function LangStudy({ systemId, heritage = false }: { systemId: string; heritage?: boolean }) {
  const h = useLangSystem(systemId);
  const { system, corpus, state } = h;
  const { queue, i, entry, ex, unitTitle, links, optionReadings, onDone, match, graded, correct, xpGained, readings, showReadings, skip, restart } = useLangSession(h, heritage);

  if (h.status === "loading" || (h.status === "ready" && queue === null)) return <LoadingState label="Building your session" />;
  if (h.status === "error") return <ErrorState title="The session did not load" />;
  if (!system || !corpus || !queue) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  const back = `/research-os/learn/languages/${system.id}`;
  if (queue.length === 0)
    return (
      <div className="flex flex-col gap-3">
        <EmptyState title="Nothing due" body="You have met today's new words in every language of this set. Come back tomorrow." action={{ href: back, label: "progress" }} />
        <HeritageLink systemId={system.id} langs={heritageLangs(system)} on={heritage} />
      </div>
    );

  if (i >= queue.length || !ex) {
    return (
      <div className="flex flex-col gap-4" data-testid="session-done">
        <HeritageLink systemId={system.id} langs={heritageLangs(system)} on={heritage} />
        <h1 className="font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] text-[color:var(--basalt)]">session done</h1>
        <p className="text-[14px] text-[color:var(--basalt-2)] [font-variant-numeric:tabular-nums]">
          {correct} of {graded} right · +{xpGained} xp · {state.stats.streak} day streak
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={back} className={BTN_PRIMARY}>
            see progress
          </Link>
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={restart}
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
      <HeritageLink systemId={system.id} langs={heritageLangs(system)} on={heritage} />
      <button type="button" onClick={skip} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]" data-testid="skip-exercise">
        skip this one
      </button>
      <label className="flex items-center gap-2 text-[12px] text-[color:var(--basalt-3)]">
        <input
          type="checkbox"
          checked={readings}
          onChange={(e) => showReadings(e.target.checked)}
          data-testid="readings-toggle"
        />
        show readings and IPA
      </label>
      </div>
    </div>
  );
}
