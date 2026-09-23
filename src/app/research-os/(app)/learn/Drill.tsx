"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Atom, Depth, QuizItem } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { BTN_PRIMARY } from "@/components/ui";

const RATINGS: { g: Rating; label: string; hint: string }[] = [
  { g: 1, label: "Again", hint: "did not have it" },
  { g: 2, label: "Hard", hint: "had it, slowly" },
  { g: 3, label: "Good", hint: "had it" },
  { g: 4, label: "Easy", hint: "had it at once" },
];

export default function Drill({ atom, level, onRate, onSkip }: { atom: Atom; level: Depth; onRate: (rating: Rating, level: Depth) => void; onSkip?: () => void }) {
  const q: QuizItem | undefined = (atom.quiz ?? []).find((x) => x.level === level) ?? atom.quiz?.[0];
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<Rating | null>(null);

  useEffect(() => {
    setRevealed(false);
    setPicked(null);
  }, [atom.id, level]);

  useEffect(() => {
    if (picked === null) return;
    const t = window.setTimeout(() => onRate(picked, level), picked === 1 ? 1100 : 600);
    return () => window.clearTimeout(t);
  }, [picked, level, onRate]);

  if (!q) {
    return (
      <div className="mt-6">
        <button type="button" onClick={() => onRate(3, level)} className={BTN_PRIMARY}>
          got it
        </button>
      </div>
    );
  }

  return (
    <section className="mt-6 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 md:p-5">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">retrieve · {level}</div>
      <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {q.prompt}
        </ReactMarkdown>
      </div>

      {!revealed ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setRevealed(true)} className={BTN_PRIMARY}>
            show the answer
          </button>
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
              skip
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">answer</div>
            <div className="mt-1 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {q.answer}
              </ReactMarkdown>
            </div>
          </div>
          {picked === null ? (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="How well did you recall it">
              {RATINGS.map((r) => (
                <button
                  key={r.g}
                  type="button"
                  onClick={() => setPicked(r.g)}
                  className="border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 text-left rounded-sm min-h-[52px]"
                >
                  <div className="text-[13px] text-[color:var(--basalt)]">{r.label}</div>
                  <div className="text-[11px] text-[color:var(--basalt-3)]">{r.hint}</div>
                </button>
              ))}
            </div>
          ) : (
            <p role="status" className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
              {picked === 1
                ? atom.note && atom.note.length < 220
                  ? `Worth another pass. ${atom.note}`
                  : "Worth another pass. Read the answer once more before moving on."
                : picked >= 4
                  ? "Locked in."
                  : picked === 3
                    ? "Good recall."
                    : "Noted. It comes back sooner."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
