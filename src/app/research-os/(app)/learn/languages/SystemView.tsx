"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { falseFriendsFor, langName, langProgress, sharedRootLangs, systemSummary, unitStatus } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function SystemView({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const { system, corpus, state } = h;
  const per = useMemo(() => (system && corpus ? langProgress(system, corpus, state) : []), [system, corpus, state]);
  const sum = useMemo(() => (system && corpus ? systemSummary(system, corpus, state) : null), [system, corpus, state]);
  const families = useMemo(
    () => (system && corpus ? corpus.items.filter((i) => i.kind === "word" && sharedRootLangs(i, system).length >= 2).slice(0, 8) : []),
    [system, corpus]
  );
  const [unitLang, setUnitLang] = useState<string | null>(null);
  const shownLang = unitLang ?? system?.targets[0] ?? null;
  const units = useMemo(() => (system && corpus && shownLang ? unitStatus(system, corpus, state, shownLang) : []), [system, corpus, state, shownLang]);
  const friends = useMemo(() => (system && corpus ? falseFriendsFor(corpus, system) : []), [system, corpus]);

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
                {p.grammarTotal > 0 && (
                  <span>
                    grammar {p.grammarStarted}/{p.grammarTotal}
                  </span>
                )}
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
      <Panel title="skill tree" meta={shownLang ? langName(shownLang) : undefined}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="language for the skill tree">
          {system.targets.map((l) => (
            <button key={l} type="button" aria-pressed={l === shownLang} onClick={() => setUnitLang(l)} className={"px-3 py-1 text-[12px] rounded-sm border " + (l === shownLang ? "bg-[color:var(--gold)] border-[color:var(--gold-deep)]" : "border-[color:var(--hairline)]")}>
              {langName(l)}
            </button>
          ))}
        </div>
        <ol className="mt-4 grid sm:grid-cols-2 gap-2" data-testid="units">
          {units.map((u) => (
            <li key={u.unit.id} data-unlocked={u.unlocked} className={"border border-[color:var(--hairline)] px-3 py-2 rounded-sm text-[13px] " + (u.unlocked ? "" : "opacity-50")}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[color:var(--basalt)]">
                  {u.unit.index + 1}. {u.unit.title}
                </span>
                <span className="text-[11px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">{u.unlocked ? `${u.started}/${u.total}` : "locked"}</span>
              </div>
              {u.unit.grammar.length > 0 && <div className="text-[11px] text-[color:var(--basalt-3)]">{u.unit.grammar.map((g) => (g === "gender" ? "articles and gender" : "present tense")).join(", ")}</div>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-[color:var(--basalt-3)]">A unit opens once 80% of the one before it has started.</p>
      </Panel>
      {friends.length > 0 && (
        <Panel title="false friends" meta={`${friends.length}`}>
          <ul className="flex flex-col gap-1 text-[13px] text-[color:var(--basalt-2)]" data-testid="false-friends">
            {friends.map((f) => (
              <li key={f.lang + f.word}>
                <span className="text-[color:var(--basalt)]">
                  {langName(f.lang)} {f.word}
                </span>{" "}
                means {f.means}, looks like English {f.looksLike}
                {f.crossWith ? `; ${langName(f.crossWith.lang)} ${f.crossWith.word} means ${f.crossWith.means}` : ""}
              </li>
            ))}
          </ul>
        </Panel>
      )}
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
      <p className="text-[11px] text-[color:var(--basalt-3)]">{corpus.attribution} {corpus.sources.join(" ")} Audio is browser text-to-speech.</p>
    </div>
  );
}
