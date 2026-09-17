"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAcademy } from "../learn/useAcademy";
import { deckLabel } from "@/lib/academy/corpus-client";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";

const SHELLS: { key: string; label: string; hint: string }[] = [
  { key: "prereq", label: "prerequisites", hint: "the base everything rests on" },
  { key: "nucleus", label: "nucleus", hint: "the small set that unlocks the most" },
  { key: "frontier", label: "frontier", hint: "where the branch is still moving" },
];

function MasteryBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-20 bg-[color:var(--bone-3)] rounded-sm overflow-hidden" aria-label={`mastery ${Math.round(value * 100)}%`}>
      <div className="h-full bg-[color:var(--gold-deep)]" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/** One branch: the summary, today's route, and every atom by shell. */
export default function BranchView({ branch }: { branch: string }) {
  const a = useAcademy(branch);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const atoms = a.corpus?.atoms ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle ? atoms.filter((x) => x.title.toLowerCase().includes(needle) || x.id.includes(needle)) : atoms;
    return SHELLS.map((s) => ({ ...s, atoms: filtered.filter((x) => (x.shell ?? "nucleus") === s.key) })).filter((g) => g.atoms.length > 0);
  }, [a.corpus, q]);

  if (a.status === "loading") return <LoadingState label="Loading the deck" />;
  if (a.status === "missing") return <ErrorState title="No such deck" body={`There is no branch named ${branch}.`} />;
  if (a.status === "error" || !a.corpus) return <ErrorState title="The deck did not load" />;

  const s = a.summaryNow;
  const label = deckLabel(a.corpus.deck);
  const unlocked = (id: string) => (a.byId.get(id)?.requires ?? []).every((r) => Boolean(a.state.cards[r]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/research-os/learn" className="hover:underline underline-offset-4">learn</Link>}
        title={label}
        lede={a.corpus.meta.title ?? undefined}
        actions={
          <>
            <Link href={`/research-os/learn/${branch}/study`} className={BTN_PRIMARY}>
              {a.routeItems.length > 0 ? `study today (${a.routeItems.length})` : "study"}
            </Link>
            <Link href={`/research-os/learn/${branch}/place`} className={BTN_SECONDARY}>
              {s.introduced === 0 ? "place me first" : "re-take placement"}
            </Link>
            <Link href="/research-os/learn" className={BTN_SECONDARY}>
              all decks
            </Link>
          </>
        }
      />

      <section aria-label="Progress" className="grid grid-cols-2 md:grid-cols-5 gap-3 [font-variant-numeric:tabular-nums]">
        {[
          ["started", `${s.introduced} / ${s.total}`],
          ["mastered", String(s.mastered)],
          ["due now", String(s.dueCount)],
          ["xp", String(s.xp)],
          ["streak", `${s.streak} day${s.streak === 1 ? "" : "s"}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-3">
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{k}</div>
            <div className="mt-1 font-display text-[20px] leading-none text-[color:var(--basalt)]">{v}</div>
          </div>
        ))}
      </section>

      <Panel title="today's route" meta={`${a.routeItems.length} item${a.routeItems.length === 1 ? "" : "s"}`}>
        {a.routeItems.length === 0 ? (
          <EmptyState title="Nothing due" body="Every card is scheduled ahead and today's new atoms are done. Open any atom below to read it." />
        ) : (
          <ol className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {a.routeItems.map((it) => {
              const atom = a.byId.get(it.id);
              if (!atom) return null;
              return (
                <li key={it.id} className="py-2 flex items-center justify-between gap-3">
                  <Link href={`/research-os/learn/${branch}/${atom.id}`} className="text-[13px] text-[color:var(--basalt)] hover:underline underline-offset-4 truncate">
                    {atom.title}
                  </Link>
                  <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">{it.kind === "review" ? "review" : "new"}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="small-caps text-[11px] tracking-[0.18em] text-[color:var(--aegean-deep)]">the atoms</h2>
        <input
          id="learn-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="find an atom"
          className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 min-w-[220px]"
        />
      </div>

      {groups.map((g) => (
        <Panel key={g.key} title={g.label} meta={g.hint}>
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {g.atoms.map((atom) => {
              const started = Boolean(a.state.cards[atom.id]);
              const open = started || unlocked(atom.id);
              return (
                <li key={atom.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/research-os/learn/${branch}/${atom.id}`} className={"text-[13px] hover:underline underline-offset-4 " + (open ? "text-[color:var(--basalt)]" : "text-[color:var(--basalt-3)]")}>
                      {atom.title}
                    </Link>
                    {atom.gloss && <div className="text-[11px] text-[color:var(--basalt-3)] truncate">{atom.gloss}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!open && <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">after {atom.requires?.length} prerequisite{atom.requires?.length === 1 ? "" : "s"}</span>}
                    {started && <MasteryBar value={a.mastery(atom.id)} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
