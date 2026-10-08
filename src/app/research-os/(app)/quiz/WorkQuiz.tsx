"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";
import { InlineMath } from "@/components/math/InlineMath";
import "katex/dist/katex.min.css";
import { DONE_EVENT, START_EVENT, STORAGE_KEY, TICK_MS, initialState, normalizeState, onWorkSurface, tick, type TriggerState } from "@/lib/research-os/work-quiz/trigger";
import { choiceLang, textDir, wordCaption } from "@/lib/research-os/work-quiz/languages";
import { TYPE_LABEL, retiredNotice, type PublicQuestion } from "@/lib/research-os/work-quiz/types";
import type { IssueResult, QuizResult } from "@/lib/research-os/work-quiz/service";

const API = "/api/research-os/work-quiz";

type Issued = Extract<IssueResult, { status: "issued" }>;
type Phase = { kind: "idle" } | { kind: "asking"; issued: Issued; startedAt: number } | { kind: "sending"; issued: Issued } | { kind: "done"; issued: Issued; result: QuizResult } | { kind: "error"; message: string };

function readState(now: number): TriggerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null, now);
  } catch {
    return initialState(now);
  }
}

function writeState(s: TriggerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
  }
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function WorkQuiz({ enabled }: { enabled: boolean }) {
  const pathname = usePathname() || "";
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [numeric, setNumeric] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const lastInput = useRef(Date.now());
  const open = phase.kind !== "idle";
  const openRef = useRef(open);
  openRef.current = open;
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const firstChoice = useRef<HTMLButtonElement | null>(null);
  const numberField = useRef<HTMLInputElement | null>(null);

  const start = useCallback(async (mode: "surprise" | "review" | "manual") => {
    if (openRef.current) return;
    try {
      const res = await fetch(`${API}?mode=${mode}`, { cache: "no-store" });
      if (!res.ok) {
        if (mode !== "surprise") setPhase({ kind: "error", message: `The quiz is unavailable (${res.status}).` });
        return;
      }
      const body = (await res.json()) as IssueResult;
      if (body.status !== "issued") {
        if (mode !== "surprise") setPhase({ kind: "error", message: [body.reason === "nothing_due" ? "Nothing is due for review." : "No work sources were found on this machine.", retiredNotice(body.retired)].filter(Boolean).join(" ") });
        return;
      }
      setNumeric("");
      setPhase({ kind: "asking", issued: body, startedAt: Date.now() });
    } catch {
      if (mode !== "surprise") setPhase({ kind: "error", message: "The quiz could not reach the server." });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onInput = () => {
      lastInput.current = Date.now();
    };
    const onStart = (e: Event) => {
      const mode = (e as CustomEvent<{ mode?: string }>).detail?.mode === "review" ? "review" : "manual";
      void start(mode);
    };
    const events = ["keydown", "pointerdown", "scroll", "wheel"] as const;
    events.forEach((ev) => window.addEventListener(ev, onInput, { passive: true }));
    window.addEventListener(START_EVENT, onStart);
    const id = window.setInterval(() => {
      const t = Date.now();
      if (!onWorkSurface(pathRef.current)) return;
      const r = tick(readState(t), { now: t, visible: document.visibilityState === "visible", lastInputAt: lastInput.current, typing: isTyping(), quizOpen: openRef.current, rand: Math.random() });
      writeState(r.state);
      if (r.fire) void start("surprise");
    }, TICK_MS);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onInput));
      window.removeEventListener(START_EVENT, onStart);
      window.clearInterval(id);
    };
  }, [enabled, start]);

  const submit = useCallback(async (payload: { response?: string; skip?: boolean }) => {
    if (phase.kind !== "asking") return;
    const issued = phase.issued;
    setPhase({ kind: "sending", issued });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: issued.attemptId, ...payload }) });
        if (res.ok) {
          setPhase({ kind: "done", issued, result: (await res.json()) as QuizResult });
          return;
        }
        if (res.status < 500) break;
      } catch {
        continue;
      }
    }
    setPhase({ kind: "error", message: "Your answer was not saved. The attempt stays open on the server." });
  }, [phase]);

  const close = useCallback(() => {
    if (phase.kind === "asking") {
      void submit({ skip: true });
      return;
    }
    if (phase.kind === "done" || phase.kind === "error") {
      setPhase({ kind: "idle" });
      window.dispatchEvent(new Event(DONE_EVENT));
    }
  }, [phase, submit]);

  useEffect(() => {
    if (phase.kind !== "asking") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  const q: PublicQuestion | null = phase.kind === "asking" || phase.kind === "sending" || phase.kind === "done" ? phase.issued.question : null;
  const remainingMs = phase.kind === "asking" && q ? Math.max(0, q.limitSec * 1000 - (now - phase.startedAt)) : 0;

  useEffect(() => {
    if (phase.kind === "asking" && q && remainingMs === 0 && now - phase.startedAt > q.limitSec * 1000) void submit(q.choices ? {} : { response: numeric || undefined });
  }, [phase, q, remainingMs, now, numeric, submit]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (phase.kind === "asking" && q?.choices && /^[1-9]$/.test(e.key) && !isTyping()) {
        const choice = q.choices[Number(e.key) - 1];
        if (choice) void submit({ response: choice });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase.kind, q, close, submit]);

  useEffect(() => {
    if (phase.kind === "asking") (firstChoice.current ?? numberField.current)?.focus();
  }, [phase.kind]);

  if (!enabled || !open) return null;

  const fraction = phase.kind === "asking" && q ? remainingMs / (q.limitSec * 1000) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--basalt)]/40 px-4" role="dialog" aria-modal="true" aria-labelledby="work-quiz-title">
      <div className="w-full max-w-[560px] bg-[color:var(--bone)] border border-[color:var(--hairline)] rounded-sm shadow-lg">
        {phase.kind === "error" ? (
          <div className="p-5">
            <div id="work-quiz-title" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">work quiz</div>
            <p role="alert" className="mt-3 text-[14px] text-[color:var(--basalt)]">{phase.message}</p>
            <div className="mt-4">
              <button type="button" onClick={close} className={BTN_SECONDARY}>close</button>
            </div>
          </div>
        ) : q ? (
          <>
            <div className="h-1 bg-[color:var(--bone-2)]" aria-hidden="true">
              <div className="h-1 bg-[color:var(--gold)] transition-[width] duration-200 ease-linear" style={{ width: `${phase.kind === "asking" ? fraction * 100 : 0}%` }} />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div id="work-quiz-title" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">
                  work quiz · {TYPE_LABEL[q.type]}
                  {"issued" in phase && phase.issued.fromReview ? " · review" : ""}
                </div>
                {phase.kind === "asking" && (
                  <div className="font-mono text-[12px] text-[color:var(--basalt-3)]" aria-live="off">
                    {Math.ceil(remainingMs / 1000)}s
                  </div>
                )}
              </div>
              {"issued" in phase && phase.issued.retired > 0 && (
                <p role="status" className="mt-2 text-[12px] text-[color:var(--basalt-3)]">{retiredNotice(phase.issued.retired)}</p>
              )}
              <p className="mt-3 text-[15px] leading-[1.5] text-[color:var(--basalt)]"><InlineMath text={q.prompt} /></p>
              {q.lines.length > 0 && (
                <div className="mt-3 border-l-2 border-[color:var(--hairline)] pl-3 flex flex-col gap-1">
                  {q.lines.map((l, i) => (
                    <div key={i} dir={textDir(l)} lang={q.word?.lang ?? undefined} className={`leading-[1.5] text-[color:var(--basalt-2)] ${q.word ? "text-[22px]" : "text-[14px]"}`}><InlineMath text={l} /></div>
                  ))}
                </div>
              )}
              <WordCredit q={q} />

              {phase.kind === "asking" || phase.kind === "sending" ? (
                q.choices ? (
                  <div className="mt-4 grid gap-2" role="group" aria-label="choices">
                    {q.choices.map((c, i) => (
                      <button
                        key={c}
                        ref={i === 0 ? firstChoice : undefined}
                        type="button"
                        disabled={phase.kind === "sending"}
                        onClick={() => void submit({ response: c })}
                        className="flex items-start gap-3 text-left border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 rounded-sm min-h-[44px] disabled:opacity-60"
                      >
                        <span className="font-mono text-[11px] text-[color:var(--basalt-3)] pt-0.5">{i + 1}</span>
                        <span dir={textDir(c)} lang={choiceLang(q)} className={`text-[color:var(--basalt)] ${choiceLang(q) ? "text-[18px]" : "text-[14px]"}`}><InlineMath text={c} /></span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (numeric.trim()) void submit({ response: numeric.trim() });
                    }}
                  >
                    <input
                      ref={numberField}
                      inputMode="numeric"
                      aria-label="your estimate"
                      value={numeric}
                      onChange={(e) => setNumeric(e.target.value)}
                      className="flex-1 border border-[color:var(--hairline)] bg-white/70 px-3 py-2 rounded-sm text-[15px] min-h-[44px]"
                    />
                    <button type="submit" disabled={phase.kind === "sending" || !numeric.trim()} className={BTN_PRIMARY}>answer</button>
                  </form>
                )
              ) : phase.kind === "done" ? (
                <Outcome result={phase.result} />
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3">
                {phase.kind === "done" ? (
                  <button type="button" onClick={close} className={BTN_PRIMARY}>back to work</button>
                ) : (
                  <button type="button" onClick={close} disabled={phase.kind === "sending"} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] disabled:opacity-60">
                    skip, esc
                  </button>
                )}
                <Link href="/research-os/quiz" onClick={() => phase.kind === "done" && close()} className="text-[12px] text-[color:var(--basalt-3)] underline underline-offset-4">
                  quiz history
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function WordCredit({ q }: { q: Pick<PublicQuestion, "word"> }) {
  const caption = wordCaption(q);
  if (!caption) return null;
  return (
    <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]" data-testid="word-credit">
      {caption.language ? `${caption.language} · ` : ""}
      {caption.href ? (
        <a href={caption.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{caption.credit}</a>
      ) : (
        caption.credit
      )}
    </p>
  );
}

function Outcome({ result }: { result: QuizResult }) {
  const verdict = result.skipped ? "skipped" : result.timedOut ? "out of time" : result.correct ? "right" : "missed";
  const tone = result.correct ? "text-[color:var(--aegean-deep)]" : "text-[color:var(--basalt)]";
  return (
    <div className="mt-4 border-t border-[color:var(--hairline)] pt-3" role="status">
      <div className={`small-caps text-[12px] tracking-[0.18em] ${tone}`}>
        {verdict} · {(result.elapsedMs / 1000).toFixed(1)}s
      </div>
      <div className="mt-2 text-[14px] text-[color:var(--basalt)]">
        answer: <span dir={textDir(result.answer)} className="font-medium"><InlineMath text={result.answer} /></span>
        {result.response !== null && !result.correct ? <span className="text-[color:var(--basalt-3)]"> · you said {result.response}</span> : null}
      </div>
      <p className="mt-1 text-[13px] leading-[1.5] text-[color:var(--basalt-2)]"><InlineMath text={result.explain} /></p>
      {result.sources.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {result.sources.slice(0, 1).map((s) => (
            <li key={s.ref} className="text-[12px] text-[color:var(--basalt-3)]">
              {s.href ? (
                <a href={s.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{s.label}</a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      )}
      {!result.correct && !result.skipped && result.resource && (
        <div className="mt-3 text-[13px]">
          <Link href={result.resource.href} className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
            {result.resource.label}
          </Link>
        </div>
      )}
      {!result.correct && !result.skipped && !result.resource && result.learn && (
        <div className="mt-3 text-[13px]">
          <Link href={result.learn.href} className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
            related lesson: {result.learn.title}
          </Link>
        </div>
      )}
      {!result.correct && !result.skipped && (
        <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">
          {result.reviewSaved && result.reviewDueAt ? `Back in review on ${new Date(result.reviewDueAt).toLocaleDateString()}.` : result.reviewSaved ? "" : "The review card was not saved."}
        </p>
      )}
    </div>
  );
}
