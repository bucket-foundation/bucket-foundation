"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAcademy } from "../learn/useAcademy";
import { pickLevel, type Depth } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { deckLabel } from "@/lib/academy/corpus-client";
import Lesson from "./Lesson";
import Drill from "./Drill";
import { BTN_PRIMARY, BTN_SECONDARY, ErrorState, LoadingState } from "@/components/ui";

/** One atom: the lesson, then retrieval at the depth the person's mastery calls for. */
export default function AtomView({ branch, atomId }: { branch: string; atomId: string }) {
  const a = useAcademy(branch);
  const router = useRouter();
  const [done, setDone] = useState(false);

  const atom = a.byId.get(atomId);
  const onRate = useCallback(
    (rating: Rating, level: Depth) => {
      a.gradeAtom(atomId, rating, level);
      setDone(true);
    },
    [a, atomId]
  );

  if (a.status === "loading") return <LoadingState label="Loading the atom" />;
  if (a.status === "missing" || !a.corpus) return <ErrorState title="No such deck" body={`There is no branch named ${branch}.`} />;
  if (!atom) return <ErrorState title="No such atom" body={`${atomId} is not in ${deckLabel(a.corpus.deck)}.`} />;

  const level = pickLevel(a.state, atom);
  const started = Boolean(a.state.cards[atomId]);
  const mastery = a.mastery(atomId);
  const unlocks = (atom.unlocks ?? []).map((u) => a.byId.get(u)).filter(Boolean);
  const requires = (atom.requires ?? []).map((r) => a.byId.get(r)).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <nav className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] flex flex-wrap gap-x-2">
        <Link href="/research-os/learn" className="hover:underline underline-offset-4">learn</Link>
        <span aria-hidden>/</span>
        <Link href={`/research-os/learn/${branch}`} className="hover:underline underline-offset-4">{deckLabel(a.corpus.deck)}</Link>
        <span aria-hidden>/</span>
        <span className="text-[color:var(--basalt-3)]">{atom.shell ?? "atom"}</span>
      </nav>

      <header>
        <h1 className="font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)] [text-wrap:balance]">{atom.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[color:var(--basalt-3)]">
          {started ? <span>mastery {Math.round(mastery * 100)}%</span> : <span>new to you</span>}
          <Link href={`/research-os/n/academy-${branch}-${atomId}`} className="underline underline-offset-4 hover:text-[color:var(--basalt)]">this atom on the graph</Link>
          {requires.length > 0 && (
            <span>
              after{" "}
              {requires.map((r, i) => (
                <span key={r!.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/research-os/learn/${branch}/${r!.id}`} className="underline underline-offset-4 hover:text-[color:var(--basalt)]">{r!.title}</Link>
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      <Lesson atom={atom} />

      {done ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-[color:var(--basalt-2)]">Recorded.</span>
          <Link href={`/research-os/learn/${branch}/study`} className={BTN_PRIMARY}>continue the route</Link>
          <button type="button" onClick={() => router.push(`/research-os/learn/${branch}`)} className={BTN_SECONDARY}>back to the deck</button>
        </div>
      ) : (
        <Drill atom={atom} level={level} onRate={onRate} />
      )}

      {unlocks.length > 0 && (
        <p className="text-[12px] text-[color:var(--basalt-3)]">
          Unlocks:{" "}
          {unlocks.map((u, i) => (
            <span key={u!.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/research-os/learn/${branch}/${u!.id}`} className="underline underline-offset-4 hover:text-[color:var(--basalt)]">{u!.title}</Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
