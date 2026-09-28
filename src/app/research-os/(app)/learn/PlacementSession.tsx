"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useAcademy } from "../learn/useAcademy";
import { Diagnostic, type DiagnosticItem, type Placement } from "@/lib/academy/diagnostic";
import { pickLevel } from "@/lib/academy/engine";
import { deckLabel } from "@/lib/academy/corpus-client";
import { newEventId, sendLearnEvent } from "@/lib/academy/events-client";
import { BTN_PRIMARY, BTN_SECONDARY, ErrorState, LoadingState } from "@/components/ui";

const SLOW_MS = 45_000;
type Step = "intro" | "ask" | "done";

export default function PlacementSession({ branch }: { branch: string }) {
  const a = useAcademy(branch);
  const [step, setStep] = useState<Step>("intro");
  const [item, setItem] = useState<DiagnosticItem | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<Placement | null>(null);
  const [seeded, setSeeded] = useState(0);
  const shownAt = useRef(0);
  const diag = useMemo(() => (a.corpus ? new Diagnostic(a.corpus.atoms) : null), [a.corpus]);

  useEffect(() => {
    if (step === "ask" && item) shownAt.current = Date.now();
  }, [step, item]);

  if (a.status === "loading") return <LoadingState label="Loading the deck" />;
  if (a.status !== "ready" || !a.corpus || !diag) return <ErrorState title="No such deck" body={`There is no branch named ${branch}.`} />;
  const label = deckLabel(a.corpus.deck);

  function begin() {
    diag!.start();
    const first = diag!.next();
    if (!first) return finish();
    setItem(first);
    setRevealed(false);
    setStep("ask");
  }

  function answer(correct: boolean) {
    if (!item) return;
    const slow = Date.now() - shownAt.current > SLOW_MS;
    diag!.answer(item.id, correct, { slow });
    const next = diag!.next();
    if (!next) return finish();
    setItem(next);
    setRevealed(false);
  }

  function finish() {
    const r = diag!.result();
    let n = 0;
    r.known.forEach((id) => {
      const atom = a.byId.get(id);
      if (!atom || a.state.cards[id]) return;
      a.gradeAtom(id, 2, pickLevel(a.state, atom));
      n++;
    });
    setSeeded(n);
    setResult(r);
    sendLearnEvent(newEventId(), "placement_done", { branch, questions: r.questionsAsked, known: r.placedCount });
    setStep("done");
  }

  if (step === "intro") {
    return (
      <div className="flex flex-col gap-5 max-w-[60ch]">
        <header>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label}</div>
          <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">where do you start?</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            Up to {Math.min(diag.maxQ, diag.atoms.length)} open questions. Read each one, think of your answer, reveal ours, and say whether you had it. What you know is marked as started and comes back for review; what you did not know waits its turn. A starting estimate, never a rating.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={begin} className={BTN_PRIMARY}>
            begin
          </button>
          <Link href={`/research-os/learn/${branch}`} className={BTN_SECONDARY}>
            skip placement
          </Link>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const frontier = result.frontier.map((id) => a.byId.get(id)).filter(Boolean);
    return (
      <div className="flex flex-col gap-5 max-w-[60ch]">
        <header>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label}</div>
          <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">placed</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            {result.questionsAsked} question{result.questionsAsked === 1 ? "" : "s"}. {result.placedCount} of {result.total} atoms marked as known, {seeded} of them newly started. Your route begins past them.
          </p>
        </header>
        {frontier.length > 0 && (
          <div>
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">your frontier</div>
            <ul className="mt-1 flex flex-wrap gap-2">
              {frontier.map((f) => (
                <li key={f!.id}>
                  <Link href={`/research-os/learn/${branch}/${f!.id}`} className="inline-block text-[12px] border border-[color:var(--hairline)] px-2 py-1 rounded-sm hover:bg-[color:var(--bone)]">
                    {f!.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/research-os/learn/${branch}/study`} className={BTN_PRIMARY}>
            study today&rsquo;s route
          </Link>
          <Link href={`/research-os/learn/${branch}`} className={BTN_SECONDARY}>
            the deck
          </Link>
        </div>
      </div>
    );
  }

  if (!item) return <LoadingState />;
  return (
    <div className="flex flex-col gap-5 max-w-[68ch]">
      <div className="flex items-center justify-between gap-3">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label} · placement</div>
        <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
          {item.qIndex} / {item.total}
        </div>
      </div>
      <div className="h-1 bg-[color:var(--bone-3)] rounded-sm overflow-hidden" aria-hidden>
        <div className="h-full bg-[color:var(--gold-deep)] transition-[width]" style={{ width: `${Math.round(((item.qIndex - 1) / item.total) * 100)}%` }} />
      </div>
      <h1 className="font-display uppercase text-[clamp(1.2rem,3vw,1.8rem)] leading-[1.15] chisel text-[color:var(--basalt)] [text-wrap:balance]">{item.atom.title}</h1>
      <section className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 md:p-5">
        <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">{item.level}</div>
        <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {item.prompt}
          </ReactMarkdown>
        </div>
        {!revealed ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setRevealed(true)} className={BTN_PRIMARY}>
              show the answer
            </button>
            <button type="button" onClick={() => answer(false)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
              I do not know this
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 border-t border-[color:var(--hairline)] pt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {item.answer}
              </ReactMarkdown>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => answer(true)} className={BTN_PRIMARY}>
                I knew it
              </button>
              <button type="button" onClick={() => answer(false)} className={BTN_SECONDARY}>
                I did not
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
