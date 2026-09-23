"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAcademy } from "../learn/useAcademy";
import { pickLevel, type Depth, type RouteItem } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { deckLabel } from "@/lib/academy/corpus-client";
import Lesson from "./Lesson";
import Drill from "./Drill";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState } from "@/components/ui";

export default function StudySession({ branch }: { branch: string }) {
  const a = useAcademy(branch);
  const [queue, setQueue] = useState<RouteItem[] | null>(null);
  const [i, setI] = useState(0);
  const [showLesson, setShowLesson] = useState(false);
  const [graded, setGraded] = useState(0);

  useEffect(() => {
    if (a.status === "ready" && queue === null) setQueue(a.routeItems);
  }, [a.status, a.routeItems, queue]);

  const item = queue?.[i];
  const atom = item ? a.byId.get(item.id) : undefined;

  const advance = useCallback(() => {
    setShowLesson(false);
    setI((n) => n + 1);
  }, []);

  const onRate = useCallback(
    (rating: Rating, level: Depth) => {
      if (!item) return;
      a.gradeAtom(item.id, rating, level);
      setGraded((n) => n + 1);
      advance();
    },
    [a, item, advance]
  );

  if (a.status === "loading" || queue === null) return <LoadingState label="Preparing today's route" />;
  if (a.status === "missing" || !a.corpus) return <ErrorState title="No such deck" body={`There is no branch named ${branch}.`} />;

  const label = deckLabel(a.corpus.deck);

  if (queue.length === 0) {
    return (
      <EmptyState
        title={`Nothing due in ${label}`}
        body="Every card is scheduled ahead and today's new atoms are done. Read any atom from the deck, or pick another branch."
        action={{ href: `/research-os/learn/${branch}`, label: "open the deck" }}
      />
    );
  }

  if (!item || !atom) {
    const s = a.summaryNow;
    return (
      <div className="flex flex-col gap-6 max-w-[60ch]">
        <header>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label}</div>
          <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">route done</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            {graded} card{graded === 1 ? "" : "s"} recorded. {s.introduced} of {s.total} atoms started, {s.mastered} mastered, {s.xp} xp, a {s.streak}-day streak.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Link href={`/research-os/learn/${branch}`} className={BTN_PRIMARY}>the deck</Link>
          <Link href="/research-os/learn" className={BTN_SECONDARY}>all decks</Link>
          <Link href="/research-os/home" className={BTN_SECONDARY}>home</Link>
        </div>
      </div>
    );
  }

  const level = pickLevel(a.state, atom);
  const isNew = item.kind === "new";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <nav className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] flex gap-x-2">
          <Link href={`/research-os/learn/${branch}`} className="hover:underline underline-offset-4">{label}</Link>
          <span aria-hidden>/</span>
          <span className="text-[color:var(--basalt-3)]">{isNew ? "new" : "review"}</span>
        </nav>
        <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
          {i + 1} / {queue.length}
        </div>
      </div>
      <div className="h-1 bg-[color:var(--bone-3)] rounded-sm overflow-hidden" aria-hidden>
        <div className="h-full bg-[color:var(--gold-deep)] transition-[width]" style={{ width: `${Math.round((i / queue.length) * 100)}%` }} />
      </div>

      <h1 className="font-display uppercase text-[clamp(1.3rem,3.2vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)] [text-wrap:balance]">{atom.title}</h1>

      {isNew || showLesson ? (
        <Lesson atom={atom} full={isNew || showLesson} />
      ) : (
        <button type="button" onClick={() => setShowLesson(true)} className="self-start text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">
          read the lesson first
        </button>
      )}

      <Drill atom={atom} level={level} onRate={onRate} onSkip={advance} />
    </div>
  );
}
