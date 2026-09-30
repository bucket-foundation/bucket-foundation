"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deckLabel, loadCorpus, loadDecks, type Deck } from "@/lib/academy/corpus-client";
import { gripSphere, type GripSphere } from "@/lib/academy/grip-sphere";
import { webProgressStore } from "@/lib/academy/progress-store";
import type { EngineState } from "@/lib/academy/engine";
import { BTN_PRIMARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";

interface Row {
  deck: Deck;
  introduced: number;
  due: number;
  xp: number;
  streak: number;
}

function rowFor(deck: Deck, s: EngineState, now: number): Row {
  const cards = Object.values(s.cards);
  return {
    deck,
    introduced: cards.length,
    due: cards.filter((c) => c.due != null && c.due <= now).length,
    xp: s.stats.xp,
    streak: s.stats.streak,
  };
}

export default function LearnHome() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [grip, setGrip] = useState<GripSphere | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [decks, server] = await Promise.all([loadDecks(), webProgressStore.pull()]);
        const now = Date.now();
        const out: Row[] = [];
        const states: EngineState[] = [];
        for (const d of decks) {
          const s = await webProgressStore.load(d.id, server);
          states.push(s);
          out.push(rowFor(d, s, now));
        }
        if (alive) setRows(out);
        const corpora = await Promise.all(decks.map((d) => loadCorpus(d.id)));
        const g = gripSphere(decks.map((d, i) => ({ branch: corpora[i]?.meta.branch ?? d.id, atomIds: corpora[i]?.atoms.map((a) => a.id) ?? [], state: states[i] })));
        if (alive) setGrip(g);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const active = rows?.filter((r) => r.introduced > 0).sort((a, b) => b.due - a.due || b.xp - a.xp) ?? [];
  const next = active[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · learn"
        title="lessons and recall"
        lede="Every branch of the canon as a foundations-first deck: read an atom, retrieve it, and the scheduler brings it back before you forget."
        actions={next ? <Link href={`/research-os/learn/${next.deck.id}/study`} className={BTN_PRIMARY}>{next.due > 0 ? `review ${deckLabel(next.deck)}` : `continue ${deckLabel(next.deck)}`}</Link> : undefined}
      />

      {error ? (
        <ErrorState title="The decks did not load" body="The corpus files are missing from this deployment." />
      ) : rows === null ? (
        <LoadingState label="Loading your decks" />
      ) : rows.length === 0 ? (
        <EmptyState title="No decks" body="The Academy corpus is not present on this deployment." />
      ) : (
        <>
        {grip && grip.axes.length > 0 && <GripPanel grip={grip} />}
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Panel key={r.deck.id} title={deckLabel(r.deck)} meta={r.introduced > 0 ? `${r.introduced} started` : "new"}>
              {r.deck.sub && <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">{r.deck.sub}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
                <span>{r.due} due</span>
                <span>{r.xp} xp</span>
                <span>{r.streak} day streak</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={r.introduced > 0 ? `/research-os/learn/${r.deck.id}/study` : `/research-os/learn/${r.deck.id}/place`} className={BTN_PRIMARY}>
                  {r.introduced > 0 ? (r.due > 0 ? "review" : "continue") : "start"}
                </Link>
                <Link href={`/research-os/learn/${r.deck.id}`} className="inline-flex items-center px-3 text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">
                  the atoms
                </Link>
              </div>
            </Panel>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function GripPanel({ grip }: { grip: GripSphere }) {
  return (
    <Panel title="grip" meta={`${grip.axes.length} branches`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 [font-variant-numeric:tabular-nums]">
        <span className="text-[32px] leading-none text-[color:var(--basalt)]" data-testid="grip-radius">{pct(grip.radius)}</span>
        <span className="text-[12px] text-[color:var(--basalt-3)]">peak {pct(grip.peakRadius)}</span>
        <span className="text-[12px] text-[color:var(--basalt-3)]">atom-weighted {pct(grip.atomWeighted)} of {grip.atoms} atoms</span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">Mean mastery across the canon branches, each branch weighted equally. The faint bar is your peak; the gap is what review brings back.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {grip.axes.map((a) => (
          <li key={a.branch} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-[12px] [font-variant-numeric:tabular-nums]">
            <span className="capitalize text-[color:var(--basalt-2)]">{a.branch}</span>
            <span className="relative h-2 overflow-hidden rounded-full" aria-label={`${a.branch} current ${pct(a.current)}, peak ${pct(a.peak)}`}>
              <span className="absolute inset-0 bg-[color:var(--basalt-3)] opacity-15" />
              <span className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--basalt-3)] opacity-40" style={{ width: pct(a.peak) }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--basalt)]" style={{ width: pct(a.current) }} />
            </span>
            <span className="text-right text-[color:var(--basalt-3)]">{pct(a.current)} / {pct(a.peak)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-[color:var(--basalt-3)]">Progress is saved on this device only while sign-in is down.</p>
    </Panel>
  );
}
