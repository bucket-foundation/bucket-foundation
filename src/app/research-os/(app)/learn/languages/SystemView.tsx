"use client";

import Link from "next/link";
import { useMemo } from "react";
import { langName, langProgress, sharedRootLangs, systemSummary } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function SystemView({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const { system, corpus, state } = h;
  const per = useMemo(() => (system && corpus ? langProgress(system, corpus, state) : []), [system, corpus, state]);
  const sum = useMemo(() => (system && corpus ? systemSummary(system, corpus, state) : null), [system, corpus, state]);
  const families = useMemo(
    () => (system && corpus ? corpus.items.filter((i) => sharedRootLangs(i, system).length >= 2).slice(0, 8) : []),
    [system, corpus]
  );

  if (h.status === "loading") return <LoadingState label="Loading the system" />;
  if (h.status === "error") return <ErrorState title="The system did not load" />;
  if (!system || !corpus || !sum) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · learn · languages"
        title={system.name}
        lede={`${sum.started} of ${sum.total} cards started across ${system.targets.length} languages. ${sum.due} due now.`}
        actions={
          <>
            <Link href={`/research-os/learn/languages/${system.id}/study`} className={BTN_PRIMARY}>
              {sum.due > 0 ? "review" : "study"}
            </Link>
            <Link href="/research-os/learn/languages" className={BTN_SECONDARY}>
              all systems
            </Link>
          </>
        }
      />
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[color:var(--basalt-2)] [font-variant-numeric:tabular-nums]">
        <span data-testid="sys-xp">{sum.xp} xp</span>
        <span>{sum.streak} day streak</span>
      </div>
      <Panel title="per language" meta={`${per.length} languages`}>
        <ul className="flex flex-col gap-3" data-testid="lang-progress">
          {per.map((p) => (
            <li key={p.lang} className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[7rem_1fr_auto] items-center gap-3 text-[12px] [font-variant-numeric:tabular-nums]">
              <span className="text-[color:var(--basalt)]">{langName(p.lang)}</span>
              <span className="relative h-2 overflow-hidden rounded-full" aria-label={`${langName(p.lang)} ${p.started} started, ${p.mastered} mastered`}>
                <span className="absolute inset-0 bg-[color:var(--basalt-3)] opacity-15" />
                <span className="absolute inset-y-0 left-0 bg-[color:var(--basalt-3)] opacity-40" style={{ width: pct(p.total ? p.started / p.total : 0) }} />
                <span className="absolute inset-y-0 left-0 bg-[color:var(--basalt)]" style={{ width: pct(p.total ? p.mastered / p.total : 0) }} />
              </span>
              <span className="col-span-2 sm:col-span-1 flex flex-wrap gap-x-3 text-[color:var(--basalt-3)]">
                <span>
                  {p.started}/{p.total} started
                </span>
                <span>{p.mastered} mastered</span>
                <span>{p.due} due</span>
                <span>recall {pct(p.retention)}</span>
                {p.placedAt === null ? (
                  <Link href={`/research-os/learn/languages/${system.id}/place?lang=${p.lang}`} className="underline underline-offset-4">
                    take placement
                  </Link>
                ) : (
                  <span>placed at tier {p.placedAt}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      {families.length > 0 && (
        <Panel title="shared roots in this set" meta={`${sum.sharedRootItems} words`}>
          <ul className="flex flex-col gap-2 text-[13px] text-[color:var(--basalt-2)]">
            {families.map((i) => (
              <li key={i.id}>
                <span className="text-[color:var(--basalt)]">{i.root}</span>{" "}
                {sharedRootLangs(i, system)
                  .map((l) => `${langName(l)} ${i.forms[l]}`)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="text-[11px] text-[color:var(--basalt-3)]">{corpus.attribution} Audio is browser text-to-speech.</p>
    </div>
  );
}
