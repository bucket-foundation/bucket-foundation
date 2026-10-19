"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Rating } from "@/lib/academy/fsrs";
import { canSpeak, listenOnce, loadClipIndex, recognitionSupported, speak, speechSupported } from "@/lib/academy/lang-client";
import { gradeMatch, joinTokens, judgeTyped, langDir, langName, LEVEL_LABEL, verdictRating, type Exercise, type Reading, type Verdict } from "@/lib/academy/lang-systems";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";

export interface ExerciseResult {
  lang: string;
  rating: Rating;
}

export const ReadingsContext = createContext(true);

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
  sentence: "translate the sentence",
  wordbank: "build the sentence",
  gender: "article",
  conjugate: "conjugate",
  "false-friend": "false friend",
};

export function ReadingLine({ reading, testId }: { reading?: Reading; testId?: string }) {
  const on = useContext(ReadingsContext);
  if (!on || !reading) return null;
  const parts = [reading.kana, reading.roman, reading.ipa ? `/${reading.ipa}/` : undefined].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className="text-[12px] leading-[1.5] text-[color:var(--basalt-3)]" data-testid={testId ?? "reading"}>
      {parts.join(" · ")}
    </div>
  );
}

function useAudioReady(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    const bump = () => live && setTick((t) => t + 1);
    void loadClipIndex().then(bump);
    const synth = speechSupported() ? window.speechSynthesis : null;
    synth?.addEventListener?.("voiceschanged", bump);
    return () => {
      live = false;
      synth?.removeEventListener?.("voiceschanged", bump);
    };
  }, []);
}

function SpeakButton({ text, lang, label }: { text: string; lang: string; label?: string }) {
  useAudioReady();
  if (!canSpeak(text, lang)) return null;
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
      <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">same root</span> {ex.family.map((f) => `${langName(f.lang)} ${f.word}`).join(" · ")}
    </div>
  );
}

function FalseFriendNote({ ex }: { ex: Exercise }) {
  const f = ex.falseFriend;
  if (!f) return null;
  return (
    <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-2)]" data-testid="false-friend-note">
      False friend: {langName(f.lang)} {f.word} means {f.means}. It looks like English {f.looksLike}.
      {f.crossWith ? ` ${langName(f.crossWith.lang)} ${f.crossWith.word} means ${f.crossWith.means}.` : ""}
    </p>
  );
}

function shownAnswer(ex: Exercise): string {
  if (ex.kind === "gender") return `${ex.answer}${ex.cloze?.after ?? ""}`;
  if (ex.kind === "conjugate") return ex.person?.endsWith("'") ? `${ex.person}${ex.answer}` : `${ex.person} ${ex.answer}`;
  return ex.answer;
}

function Feedback({ ok, verdict, ex, onNext }: { ok: boolean; verdict?: Verdict; ex: Exercise; onNext: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const targetText = ex.answerLang === ex.lang ? ex.answer : ex.prompt;
  return (
    <div className="mt-4 border-t border-[color:var(--hairline)] pt-3" role="status">
      <div className="text-[14px] text-[color:var(--basalt)]" data-testid="verdict">
        {ok ? (verdict === "close" ? "Close. Check the spelling and accents:" : "Right:") : "The answer:"} <strong lang={ex.answerLang} dir={langDir(ex.answerLang)}>{shownAnswer(ex)}</strong>
        <SpeakButton text={ex.kind === "gender" ? shownAnswer(ex) : targetText} lang={ex.lang} />
      </div>
      <ReadingLine reading={ex.answerLang === ex.lang ? ex.answerReading : ex.promptReading} testId="feedback-reading" />
      <Family ex={ex} />
      <FalseFriendNote ex={ex} />
      {ex.note && (!ok || ex.kind === "conjugate" || ex.kind === "gender") && <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{ex.note}</p>}
      <button ref={ref} type="button" onClick={onNext} className={BTN_PRIMARY + " mt-4"} data-testid="next">
        continue
      </button>
    </div>
  );
}

function Prompt({ ex }: { ex: Exercise }) {
  const hidden = ex.kind === "listen" || ex.kind === "type-heard";
  if (ex.kind === "cloze" && ex.cloze) {
    return (
      <span lang={ex.lang} dir={langDir(ex.lang)}>
        {ex.cloze.before}
        <span className="inline-block min-w-[4rem] border-b border-[color:var(--basalt)]">{" "}</span>
        {ex.cloze.after} <span className="text-[12px] text-[color:var(--basalt-3)]">({ex.prompt})</span>
      </span>
    );
  }
  if (hidden) {
    return (
      <span>
        Listen and {ex.kind === "listen" ? `pick the ${langName(ex.answerLang)} meaning` : "type the word"}. <SpeakButton text={ex.prompt} lang={ex.promptLang} label="Play again" />
        {!canSpeak(ex.prompt, ex.promptLang) && (
          <>
            <span lang={ex.promptLang} dir={langDir(ex.promptLang)} className="ml-2">
              {ex.prompt}
            </span>
            <ReadingLine reading={ex.promptReading} />
          </>
        )}
      </span>
    );
  }
  if (ex.kind === "gender") {
    return (
      <span>
        Which article goes with <strong lang={ex.lang} dir={langDir(ex.lang)}>{ex.prompt}</strong>? <span className="text-[12px] text-[color:var(--basalt-3)]">({ex.promptReading?.roman})</span>
      </span>
    );
  }
  if (ex.kind === "conjugate") {
    return (
      <span>
        {ex.tense === "past" ? "Past tense" : "Present tense"} of <strong lang={ex.lang} dir={langDir(ex.lang)}>{ex.prompt}</strong> <span className="text-[12px] text-[color:var(--basalt-3)]">({ex.promptReading?.roman})</span>:{" "}
        <strong lang={ex.lang} dir={langDir(ex.lang)}>{ex.person} ___</strong>
      </span>
    );
  }
  if (ex.kind === "false-friend") {
    return (
      <span>
        What does {langName(ex.lang)} <strong lang={ex.lang}>{ex.prompt}</strong> mean? <SpeakButton text={ex.prompt} lang={ex.lang} />
        <ReadingLine reading={ex.promptReading} />
      </span>
    );
  }
  if (ex.kind === "sentence" || ex.kind === "wordbank") {
    return (
      <span>
        {langName(ex.answerLang)} for <strong lang={ex.promptLang} dir={langDir(ex.promptLang)}>{ex.prompt}</strong>
      </span>
    );
  }
  if (ex.kind === "cognate") {
    return (
      <span>
        Which {langName(ex.answerLang)} word shares a root with {langName(ex.promptLang)} <strong>{ex.prompt}</strong>?
      </span>
    );
  }
  if (ex.kind === "speak") {
    return (
      <span>
        Say <strong>{ex.prompt}</strong> in {langName(ex.answerLang)}.
      </span>
    );
  }
  return (
    <span>
      {ex.kind === "reverse" ? `What does this mean in ${langName(ex.answerLang)}?` : `${langName(ex.answerLang)} for`} <strong lang={ex.promptLang} dir={langDir(ex.promptLang)}>{ex.prompt}</strong>
      {ex.kind === "reverse" && (
        <>
          <SpeakButton text={ex.prompt} lang={ex.promptLang} />
          <ReadingLine reading={ex.promptReading} />
        </>
      )}
    </span>
  );
}

export default function LangExercise({ ex, onDone, optionReadings }: { ex: Exercise; onDone: (results: ExerciseResult[]) => void; optionReadings?: Record<string, Reading> }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [matchDone, setMatchDone] = useState(false);
  const [built, setBuilt] = useState<number[]>([]);
  const started = useRef(Date.now());

  useEffect(() => {
    setPicked(null);
    setTyped("");
    setVerdict(null);
    setHeard(null);
    setAssign({});
    setMatchDone(false);
    setBuilt([]);
    started.current = Date.now();
    if (ex.kind === "listen" || ex.kind === "type-heard") speak(ex.prompt, ex.promptLang);
    if (ex.kind === "intro") speak(ex.answer, ex.answerLang);
  }, [ex]);

  const slow = () => Date.now() - started.current > 15000;
  const finish = (ok: boolean, v?: Verdict) => onDone([{ lang: ex.lang, rating: v ? verdictRating(v, slow()) : ok ? (slow() ? 2 : 3) : 1 }]);
  const accepted = ex.accept ?? [ex.answer];

  const header = (
    <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">
      {KIND_LABEL[ex.kind]} · {langName(ex.lang)}{ex.level ? ` · ${LEVEL_LABEL[ex.level]}` : ""}
    </div>
  );

  if (ex.kind === "intro") {
    return (
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
        {header}
        <div className="mt-2 text-[13px] text-[color:var(--basalt-3)]">
          {langName(ex.promptLang)}: {ex.prompt}
        </div>
        <div className="mt-1 text-[28px] text-[color:var(--basalt)]" lang={ex.answerLang} dir={langDir(ex.answerLang)}>
          {ex.answer} <SpeakButton text={ex.answer} lang={ex.answerLang} />
        </div>
        <ReadingLine reading={ex.answerReading} testId="intro-reading" />
        <Family ex={ex} />
        <FalseFriendNote ex={ex} />
        {ex.note && <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{ex.note}</p>}
        <button type="button" onClick={() => onDone([])} className={BTN_PRIMARY + " mt-4"} data-testid="next">
          got it
        </button>
      </section>
    );
  }

  if (ex.kind === "match" && ex.pairs) {
    const langs = ex.pairs.map((p) => p.lang);
    const pairWordFor = (l?: string) => ex.pairs?.find((q) => q.lang === l)?.word;
    const results = gradeMatch(ex.pairs, assign).map((r) => ({ lang: r.lang, rating: (r.correct ? 3 : 1) as Rating }));
    return (
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
        {header}
        <p className="mt-2 text-[15px] text-[color:var(--basalt)]">
          Match each word for <strong>{ex.prompt}</strong> to its language.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {ex.pairs.map((p) => (
            <li key={p.lang} className="flex flex-wrap items-center gap-3 text-[15px]" data-testid="match-row">
              <span className="min-w-[8rem]">
                <span lang={p.lang} dir={langDir(p.lang)} className="text-[color:var(--basalt)]">
                  {p.word}
                </span>
                <SpeakButton text={p.word} lang={p.lang} />
                <ReadingLine reading={p.reading} testId="match-reading" />
              </span>
              <select
                aria-label={`language of ${p.word}`}
                value={assign[p.lang] ?? ""}
                disabled={matchDone}
                onChange={(e) => setAssign((a) => ({ ...a, [p.lang]: e.target.value }))}
                className="border border-[color:var(--hairline)] bg-white/60 px-2 py-1 rounded-sm"
              >
                <option value="">choose</option>
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {langName(l)}
                  </option>
                ))}
              </select>
              {matchDone && <span className="text-[12px] text-[color:var(--basalt-3)]">{pairWordFor(assign[p.lang]) === p.word ? "right" : langName(p.lang)}</span>}
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

  if (ex.kind === "wordbank" && ex.tokens) {
    const tokens = ex.tokens;
    const answerText = joinTokens(built.map((i) => tokens[i]), ex.lang);
    return (
      <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
        {header}
        <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
          <Prompt ex={ex} />
        </div>
        <div className="mt-3 min-h-[48px] border-b border-[color:var(--basalt)] flex flex-wrap gap-2 pb-2" data-testid="built" lang={ex.lang} dir={langDir(ex.lang)}>
          {built.map((ti, k) => (
            <button key={`${ti}-${k}`} type="button" disabled={verdict !== null} onClick={() => setBuilt((b) => b.filter((_, j) => j !== k))} className="px-2 py-1 rounded-sm bg-white/70 border border-[color:var(--hairline)] text-[15px]">
              {tokens[ti]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" lang={ex.lang} dir={langDir(ex.lang)}>
          {tokens.map((t, ti) => (
            <button key={ti} type="button" disabled={built.includes(ti) || verdict !== null} onClick={() => setBuilt((b) => [...b, ti])} className="px-2 py-1 rounded-sm border border-[color:var(--hairline)] text-[15px] disabled:opacity-30" data-testid="token">
              {t}
            </button>
          ))}
        </div>
        {verdict === null ? (
          <button type="button" disabled={built.length === 0} onClick={() => setVerdict(judgeTyped(answerText, accepted, ex.lang))} className={BTN_PRIMARY + " mt-4"} data-testid="check">
            check
          </button>
        ) : (
          <Feedback ok={verdict !== "wrong"} verdict={verdict} ex={ex} onNext={() => finish(verdict !== "wrong", verdict)} />
        )}
      </section>
    );
  }

  const typedKind = ex.kind === "translate" || ex.kind === "type-heard" || (ex.kind === "conjugate" && !ex.options) || (ex.kind === "speak" && (!recognitionSupported() || heard === ""));
  const mc = !!ex.options && !typedKind;
  const isRight = (o: string) => accepted.includes(o);

  async function micTry() {
    setListening(true);
    const alts = await listenOnce(ex.answerLang);
    setListening(false);
    if (alts.length === 0) {
      setHeard("");
      return;
    }
    const best = alts.map((a) => judgeTyped(a, accepted, ex.answerLang)).sort((a, b) => rank(a) - rank(b))[0];
    setHeard(alts[0]);
    setVerdict(best);
  }

  return (
    <section className="bg-[color:var(--bone)] p-4 md:p-5" data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
      {header}
      <div className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt)]">
        <Prompt ex={ex} />
      </div>

      {mc && ex.options && (
        <div className={"mt-4 grid gap-2 " + (ex.kind === "sentence" ? "" : "sm:grid-cols-2")} role="group" aria-label="choices">
          {ex.options.map((o) => {
            const state = picked === null ? "" : isRight(o) ? "bg-[color:var(--gold)]" : o === picked ? "opacity-60 line-through" : "";
            const showReading = ex.answerLang === ex.lang && ex.kind !== "gender" && ex.kind !== "conjugate";
            return (
              <button
                key={o}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(o)}
                lang={ex.answerLang} dir={langDir(ex.answerLang)}
                className={"border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 text-left rounded-sm min-h-[48px] text-[15px] " + state}
                data-testid="option"
              >
                {o}
                {showReading && <ReadingLine reading={optionReadings?.[o]} testId="option-reading" />}
              </button>
            );
          })}
        </div>
      )}
      {mc && picked !== null && <Feedback ok={isRight(picked)} ex={ex} onNext={() => finish(isRight(picked))} />}

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
            setVerdict(judgeTyped(typed, accepted, ex.answerLang));
          }}
        >
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            lang={ex.answerLang} dir={langDir(ex.answerLang)}
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
