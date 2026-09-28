"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useAcademy } from "../learn/useAcademy";
import { buildRun, gradeAnswer, ratingFor, summarize, type Run, type RunResult, type Verdict } from "@/lib/academy/assess";
import { deckLabel } from "@/lib/academy/corpus-client";
import { newEventId, sendLearnEvent } from "@/lib/academy/events-client";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState } from "@/components/ui";

const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
type Step = "intro" | "answer" | "verdict" | "selfcheck" | "done";

export default function AssessmentSession({ branch }: { branch: string }) {
  const a = useAcademy(branch);
  const [run, setRun] = useState<Run | null>(null);
  const [i, setI] = useState(0);
  const [step, setStep] = useState<Step>("intro");
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);
  const shownAt = useRef(0);
  const runId = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const item = run?.items[i];
  const summary = useMemo(() => (step === "done" ? summarize(results) : null), [step, results]);

  useEffect(() => {
    if (step === "answer") {
      shownAt.current = Date.now();
      inputRef.current?.focus();
    }
  }, [step, i]);

  if (a.status === "loading") return <LoadingState label="Loading the deck" />;
  if (a.status !== "ready" || !a.corpus) return <ErrorState title="No such deck" body={`There is no branch named ${branch}.`} />;
  const label = deckLabel(a.corpus.deck);

  function begin() {
    const r = buildRun(a.corpus!.atoms, (id) => a.state.cards[id] ?? null, { size: 10 });
    runId.current = newEventId();
    setRun(r);
    setI(0);
    setResults([]);
    setInput("");
    setStep(r.items.length ? "answer" : "done");
  }

  function record(correct: boolean, autoGraded: boolean) {
    if (!item) return;
    const res: RunResult = { atomId: item.atomId, level: item.level, correct, autoGraded, latencyMs: Date.now() - shownAt.current };
    a.gradeAtom(item.atomId, ratingFor(correct), item.level);
    const next = [...results, res];
    setResults(next);
    if (i + 1 >= (run?.items.length ?? 0)) {
      sendLearnEvent(runId.current, "assess_done", {
        branch,
        items: next.map((r) => ({ atomId: r.atomId, level: r.level, correct: r.correct, autoGraded: r.autoGraded })),
      });
      setStep("done");
    } else {
      setI(i + 1);
      setInput("");
      setVerdict(null);
      setStep("answer");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    const v = gradeAnswer(input, item.answer);
    setVerdict(v);
    if (v.gradable) setStep("verdict");
    else setStep("selfcheck");
  }

  if (step === "intro") {
    return (
      <div className="flex flex-col gap-5 max-w-[60ch]">
        <header>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label}</div>
          <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">test yourself</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            Ten questions across the atoms you have started, the ones fading first, at rising depth. You answer before the answer shows. Numbers and short expressions are graded on the spot; the rest you check yourself. What you miss goes back into your route.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={begin} className={BTN_PRIMARY}>
            begin
          </button>
          <Link href={`/research-os/learn/${branch}`} className={BTN_SECONDARY}>
            the deck
          </Link>
        </div>
      </div>
    );
  }

  if (step === "done") {
    if (!summary || summary.total === 0) return <EmptyState title="Nothing to test yet" body="Start a few atoms in this deck first." action={{ href: `/research-os/learn/${branch}/study`, label: "study" }} />;
    const weak = summary.weakConcepts.map((id) => a.byId.get(id)).filter(Boolean);
    return (
      <div className="flex flex-col gap-5 max-w-[60ch]">
        <header>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label}</div>
          <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
            {summary.correct} of {summary.total}
          </h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            {Math.round(summary.score * 100)}%. {summary.auto.total} graded on the spot ({summary.auto.correct} right), {summary.self.total} self-checked ({summary.self.correct} right). Trust: {summary.trust}.
          </p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 [font-variant-numeric:tabular-nums]">
          {Object.entries(summary.byLevel).map(([lv, v]) => (
            <div key={lv} className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-3">
              <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{lv}</div>
              <div className="mt-1 font-display text-[20px] leading-none text-[color:var(--basalt)]">
                {v.correct} / {v.total}
              </div>
            </div>
          ))}
        </div>
        {weak.length > 0 && (
          <div>
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">back to study</div>
            <ul className="mt-1 flex flex-wrap gap-2">
              {weak.map((w) => (
                <li key={w!.id}>
                  <Link href={`/research-os/learn/${branch}/${w!.id}`} className="inline-block text-[12px] border border-[color:var(--hairline)] px-2 py-1 rounded-sm hover:bg-[color:var(--bone)]">
                    {w!.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={begin} className={BTN_PRIMARY}>
            again
          </button>
          <Link href={`/research-os/learn/${branch}`} className={BTN_SECONDARY}>
            the deck
          </Link>
        </div>
      </div>
    );
  }

  if (!item || !run) return <LoadingState />;
  return (
    <div className="flex flex-col gap-5 max-w-[68ch]">
      <div className="flex items-center justify-between gap-3">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{label} · test yourself</div>
        <div className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
          {i + 1} / {run.items.length}
        </div>
      </div>
      <div className="h-1 bg-[color:var(--bone-3)] rounded-sm overflow-hidden" aria-hidden>
        <div className="h-full bg-[color:var(--gold-deep)] transition-[width]" style={{ width: `${Math.round((i / run.items.length) * 100)}%` }} />
      </div>
      <h1 className="font-display uppercase text-[clamp(1.2rem,3vw,1.8rem)] leading-[1.15] chisel text-[color:var(--basalt)] [text-wrap:balance]">{item.title}</h1>
      <section className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 md:p-5">
        <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">{item.level}</div>
        <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {item.prompt}
          </ReactMarkdown>
        </div>

        {step === "answer" && (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
            <label htmlFor="assess-answer" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
              your answer
            </label>
            <input id="assess-answer" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className={INPUT} autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={BTN_PRIMARY}>
                answer
              </button>
              <button type="button" onClick={() => record(false, true)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
                I do not know this
              </button>
            </div>
          </form>
        )}

        {step === "verdict" && verdict && (
          <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
            <p role="status" className={"text-[14px] " + (verdict.correct ? "text-[color:var(--laurel-deep)]" : "text-[color:var(--crimson)]")}>
              {verdict.correct ? "Right." : "Not this time."} Expected {verdict.expected}
              {verdict.got ? `, you wrote ${verdict.got}` : ""}.
            </p>
            <div className="mt-2 text-[13px] leading-[1.7] text-[color:var(--basalt-2)]">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {item.answer}
              </ReactMarkdown>
            </div>
            <button type="button" onClick={() => record(Boolean(verdict.correct), true)} className={BTN_PRIMARY + " mt-4"}>
              next
            </button>
          </div>
        )}

        {step === "selfcheck" && (
          <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">the answer</div>
            <div className="mt-1 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {item.answer}
              </ReactMarkdown>
            </div>
            {input && <p className="mt-2 text-[13px] text-[color:var(--basalt-3)]">You wrote: {input}</p>}
            <p className="mt-3 text-[12px] text-[color:var(--basalt-3)]">This one is checked by you; it counts at lower trust.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => record(true, false)} className={BTN_PRIMARY}>
                I had it
              </button>
              <button type="button" onClick={() => record(false, false)} className={BTN_SECONDARY}>
                I did not
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
