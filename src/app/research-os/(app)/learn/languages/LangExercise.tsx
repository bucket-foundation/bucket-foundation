"use client";

import { useEffect, useRef, useState } from "react";
import type { Rating } from "@/lib/academy/fsrs";
import { listenOnce, recognitionSupported, speak, speechSupported } from "@/lib/academy/lang-client";
import { judgeTyped, langName, verdictRating, type Exercise, type Verdict } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";

export interface ExerciseResult {
  lang: string;
  rating: Rating;
}

const KIND_LABEL: Record<Exercise["kind"], string> = {
  intro: "new word",
  choose: "translate",
  reverse: "what does it mean",
  listen: "listen",
  translate: "type it",
  "type-heard": "type what you hear",
  speak: "say it",
  cloze: "fill the gap",
  cognate: "shared root",
  match: "match the set",
};

function SpeakButton({ text, lang, label }: { text: string; lang: string; label?: string }) {
  if (!speechSupported()) return null;
  return (
    <button type="button" onClick={() => speak(text, lang)} className="px-2 py-1 text-[12px] small-caps underline underline-offset-4 text-[color:var(--aegean-deep)]" aria-label={label ?? `Hear it in ${langName(lang)}`}>
      play
    </button>
  );
}

function Family({ ex }: { ex: Exercise }) {
  if (!ex.family || ex.family.length === 0) return null;
  return (
    <div className="mt-3 text-[13px] text-[color:var(--basalt-2)]" data-testid="family">
      <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">same root</span>{" "}
      {ex.family.map((f) => `${langName(f.lang)} ${f.word}`).join(" · ")}
    </div>
  );
}

function Feedback({ ok, verdict, ex, onNext }: { ok: boolean; verdict?: Verdict; ex: Exercise; onNext: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="mt-4 border-t border-[color:var(--hairline)] pt-3" role="status">
      <div className="text-[14px] text-[color:var(--basalt)]" data-testid="verdict">
        {ok ? (verdict === "close" ? "Close. Mind the spelling:" : "Right:") : "The answer:"} <strong>{ex.answer}</strong>
        <SpeakButton text={ex.kind === "reverse" || ex.kind === "listen" ? ex.prompt : ex.answer} lang={ex.lang} />
      </div>
      <Family ex={ex} />
      {ex.note && !ok && <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{ex.note}</p>}
      <button ref={ref} type="button" onClick={onNext} className={BTN_PRIMARY + " mt-4"} data-testid="next">
        continue
      </button>
    </div>
  );
}

export default function LangExercise({ ex, onDone }: { ex: Exercise; onDone: (results: ExerciseResult[]) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [matchDone, setMatchDone] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    setPicked(null);
    setTyped("");
    setVerdict(null);
    setHeard(null);
    setAssign({});
    setMatchDone(false);
    started.current = Date.now();
    if (ex.kind === "listen" || ex.kind === "type-heard") speak(ex.prompt, ex.promptLang);
    if (ex.kind === "intro") speak(ex.answer, ex.answerLang);
  }, [ex]);

  const slow = () => Date.now() - started.current > 15000;
  const finish = (ok: boolean, v?: Verdict) => onDone([{ lang: ex.lang, rating: v ? verdictRating(v, slow()) : ok ? (slow() ? 2 : 3) : 1 }]);

  const header = (
    <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">
      {KIND_LABEL[ex.kind]} · {langName(ex.lang)}
    </div>
  );

  if (ex.kind === "intro") {
    return (
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind}>
        {header}
        <div className="mt-2 text-[13px] text-[color:var(--basalt-3)]">
          {langName(ex.promptLang)}: {ex.prompt}
        </div>
        <div className="mt-1 text-[28px] text-[color:var(--basalt)]" lang={ex.answerLang}>
          {ex.answer} <SpeakButton text={ex.answer} lang={ex.answerLang} />
        </div>
        <Family ex={ex} />
        {ex.note && <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{ex.note}</p>}
        <button type="button" onClick={() => onDone([])} className={BTN_PRIMARY + " mt-4"} data-testid="next">
          got it
        </button>
      </section>
    );
  }

  if (ex.kind === "match" && ex.pairs) {
    const langs = ex.pairs.map((p) => p.lang);
    const results = ex.pairs.map((p) => ({ lang: p.lang, rating: (assign[p.word] === p.lang ? 3 : 1) as Rating }));
    return (
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind}>
        {header}
        <p className="mt-2 text-[15px] text-[color:var(--basalt)]">
          Match each word for <strong>{ex.prompt}</strong> to its language.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {ex.pairs.map((p) => (
            <li key={p.word} className="flex flex-wrap items-center gap-3 text-[15px]">
              <span lang={p.lang} className="min-w-[8rem] text-[color:var(--basalt)]">
                {p.word}
              </span>
              <select
                aria-label={`language of ${p.word}`}
                value={assign[p.word] ?? ""}
                disabled={matchDone}
                onChange={(e) => setAssign((a) => ({ ...a, [p.word]: e.target.value }))}
                className="border border-[color:var(--hairline)] bg-white/60 px-2 py-1 rounded-sm"
              >
                <option value="">choose</option>
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {langName(l)}
                  </option>
                ))}
              </select>
              {matchDone && <span className="text-[12px] text-[color:var(--basalt-3)]">{assign[p.word] === p.lang ? "right" : langName(p.lang)}</span>}
            </li>
          ))}
        </ul>
        {!matchDone ? (
          <button type="button" disabled={Object.keys(assign).length < ex.pairs.length} onClick={() => setMatchDone(true)} className={BTN_PRIMARY + " mt-4"} data-testid="check">
            check
          </button>
        ) : (
          <>
            <Family ex={ex} />
            <button type="button" onClick={() => onDone(results)} className={BTN_PRIMARY + " mt-4"} data-testid="next">
              continue
            </button>
          </>
        )}
      </section>
    );
  }

  const typedKind = ex.kind === "translate" || ex.kind === "type-heard" || (ex.kind === "speak" && (!recognitionSupported() || heard === ""));
  const mc = ex.options && !typedKind;
  const hidePrompt = ex.kind === "listen" || ex.kind === "type-heard";

  async function micTry() {
    setListening(true);
    const alts = await listenOnce(ex.answerLang);
    setListening(false);
    if (alts.length === 0) {
      setHeard("");
      return;
    }
    const best = alts.map((a) => judgeTyped(a, ex.answer)).sort((a, b) => rank(a) - rank(b))[0];
    setHeard(alts[0]);
    setVerdict(best);
  }

  return (
    <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind}>
      {header}
      <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
        {ex.kind === "cloze" && ex.cloze ? (
          <span lang={ex.lang}>
            {ex.cloze.before}
            <span className="inline-block min-w-[4rem] border-b border-[color:var(--basalt)]">{picked ?? " "}</span>
            {ex.cloze.after} <span className="text-[12px] text-[color:var(--basalt-3)]">({ex.prompt})</span>
          </span>
        ) : hidePrompt ? (
          <span>
            Listen and {ex.kind === "listen" ? `pick the ${langName(ex.answerLang)} meaning` : "type the word"}.{" "}
            <SpeakButton text={ex.prompt} lang={ex.promptLang} label="Play again" />
            {!speechSupported() && (
              <span lang={ex.promptLang} className="ml-2">
                {ex.prompt}
              </span>
            )}
          </span>
        ) : ex.kind === "cognate" ? (
          <span>
            Which {langName(ex.answerLang)} word shares a root with {langName(ex.promptLang)} <strong>{ex.prompt}</strong>?
          </span>
        ) : ex.kind === "speak" ? (
          <span>
            Say <strong>{ex.prompt}</strong> in {langName(ex.answerLang)}.
          </span>
        ) : (
          <span>
            {ex.kind === "reverse" ? `What does this mean in ${langName(ex.answerLang)}?` : `${langName(ex.answerLang)} for`}{" "}
            <strong lang={ex.promptLang}>{ex.prompt}</strong>
            {ex.kind === "reverse" && <SpeakButton text={ex.prompt} lang={ex.promptLang} />}
          </span>
        )}
      </div>

      {mc && ex.options && (
        <div className="mt-4 grid sm:grid-cols-2 gap-2" role="group" aria-label="choices">
          {ex.options.map((o) => {
            const state = picked === null ? "" : o === ex.answer ? "bg-[color:var(--gold)]" : o === picked ? "opacity-60 line-through" : "";
            return (
              <button
                key={o}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(o)}
                lang={ex.answerLang}
                className={"border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 text-left rounded-sm min-h-[48px] text-[15px] " + state}
                data-testid="option"
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
      {mc && picked !== null && <Feedback ok={picked === ex.answer} ex={ex} onNext={() => finish(picked === ex.answer)} />}

      {ex.kind === "speak" && !typedKind && verdict === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={micTry} disabled={listening} className={BTN_PRIMARY}>
            {listening ? "listening" : "speak"}
          </button>
          <button type="button" onClick={() => setHeard("")} className={BTN_SECONDARY}>
            type instead
          </button>
        </div>
      )}
      {ex.kind === "speak" && heard && verdict && <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">Heard: {heard}</p>}

      {typedKind && verdict === null && (
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setVerdict(judgeTyped(typed, ex.answer));
          }}
        >
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            lang={ex.answerLang}
            aria-label={`answer in ${langName(ex.answerLang)}`}
            className="flex-1 min-w-[12rem] border border-[color:var(--hairline)] bg-white/70 px-3 py-2 rounded-sm text-[15px]"
            data-testid="answer"
          />
          <button type="submit" className={BTN_PRIMARY} data-testid="check">
            check
          </button>
        </form>
      )}
      {verdict !== null && <Feedback ok={verdict !== "wrong"} verdict={verdict} ex={ex} onNext={() => finish(verdict !== "wrong", verdict)} />}
    </section>
  );
}

function rank(v: Verdict): number {
  return v === "exact" ? 0 : v === "close" ? 1 : 2;
}
