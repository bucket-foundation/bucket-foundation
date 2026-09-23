"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import Section from "./Section";
import type { NodeData } from "./types";
import { useAcademy } from "../learn/useAcademy";
import Lesson from "../learn/Lesson";
import Drill from "../learn/Drill";
import { pickLevel, type Depth } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { BTN_SECONDARY, LoadingState } from "@/components/ui";

function AtomLearn({ branch, atomId }: { branch: string; atomId: string }) {
  const a = useAcademy(branch);
  const [done, setDone] = useState(false);
  const atom = a.byId.get(atomId);
  const onRate = useCallback(
    (rating: Rating, level: Depth) => {
      a.gradeAtom(atomId, rating, level);
      setDone(true);
    },
    [a, atomId]
  );
  if (a.status === "loading") return <LoadingState label="Loading the lesson" />;
  if (!atom) return <p className="text-[13px] text-[color:var(--basalt-3)]">The lesson for this atom is not in the deck on this deployment.</p>;
  const mastery = a.mastery(atomId);
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[12px] text-[color:var(--basalt-3)]">
        {a.state.cards[atomId] ? `mastery ${Math.round(mastery * 100)}% in Learn` : "new to you in Learn"} ·{" "}
        <Link href={`/research-os/learn/${branch}/${atomId}`} className="underline underline-offset-4 hover:text-[color:var(--basalt)]">open in the deck</Link>
      </div>
      <Lesson atom={atom} />
      {done ? <p className="text-[13px] text-[color:var(--basalt-2)]">Recorded. Mastery of the atom lifts this node to Understanding.</p> : <Drill atom={atom} level={pickLevel(a.state, atom)} onRate={onRate} />}
    </div>
  );
}

export default function LearnSection({ data }: { data: NodeData }) {
  const { learn, node } = data;
  return (
    <Section id="learn" level="understanding" title="learn" meta={learn?.atomId ? "from the Academy deck" : undefined}>
      {learn?.atomId ? (
        <AtomLearn branch={learn.branchFile} atomId={learn.atomId} />
      ) : (
        <div className="flex flex-col gap-3">
          {node.workedExample?.text ? (
            <blockquote className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)] border-l-2 border-[color:var(--gold)] pl-4 whitespace-pre-line">{node.workedExample.text.slice(0, 2400)}</blockquote>
          ) : (
            <p className="text-[13px] text-[color:var(--basalt-3)]">No lesson yet for this node. Its summary above and its sources below are what there is to learn from.</p>
          )}
          {learn && (
            <Link href={learn.href} className={BTN_SECONDARY + " self-start"}>
              the {learn.branchFile.replace(/^\d+-/, "")} deck
            </Link>
          )}
        </div>
      )}
    </Section>
  );
}
