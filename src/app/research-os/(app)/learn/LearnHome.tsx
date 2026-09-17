"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deckLabel, loadDecks, type Deck } from "@/lib/academy/corpus-client";
import { loadBranch, pullServer } from "@/lib/academy/progress-store";
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

/** The Learn module's front: every branch with the person's progress, and the one to continue. */
export default function LearnHome() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [decks, server] = await Promise.all([loadDecks(), pullServer()]);
        const now = Date.now();
        const out: Row[] = [];
        for (const d of decks) out.push(rowFor(d, await loadBranch(d.id, server), now));
        if (alive) setRows(out);
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
      )}
    </div>
  );
}
