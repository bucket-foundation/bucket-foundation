"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bcp47, say } from "@/lib/speak";
import { dailyLetters, LETTER_SECONDS } from "@/lib/daily/letters";
import { Button } from "@/ui";
import { dayLabel, DailyWorld, Heading, Intro, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";


export default function LetterSprint() {
  const { state, finish, retry } = useDaily("letter-sprint");
  const prompts = useMemo(() => (state.status === "ready" ? dailyLetters(state.day, state.system.targets) : []), [state]);
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [ends, setEnds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const over = useRef(false);
  const p = prompts[i];

  function end(pat: string) {
    if (over.current || state.status !== "ready") return;
    over.current = true;
    const full = pat.padEnd(prompts.length, "0");
    void finish({ game: "letter-sprint", day: state.day, score: [...full].filter((x) => x === "1").length, total: prompts.length, pattern: full, words: prompts.map((q, k) => ({ lang: q.lang, itemId: `abc:${q.ch}`, form: q.ch, gloss: q.sound, right: full[k] === "1" })) });
  }

  useEffect(() => {
    if (ends && p) say(p.ch, bcp47(p.lang), { auto: true });
  }, [ends, p]);

  useEffect(() => {
    if (!ends) return;
    const t = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= ends) end(pattern);
    }, 250);
    return () => window.clearInterval(t);
  });

  if (state.status !== "ready") return <DailyWorld id="letter-sprint"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="letter-sprint"><Results title="Letter Sprint" result={state.done} url="https://polingual.com/play/letter-sprint" saved={state.saved} onRetry={retry} /></DailyWorld>;
  if (!p) return <DailyWorld id="letter-sprint"><Loading state="error" /></DailyWorld>;

  function choose(c: string) {
    const next = pattern + (c === p.ch ? "1" : "0");
    setPattern(next);
    if (i + 1 < prompts.length) setI(i + 1);
    else end(next);
  }

  const left = ends ? Math.max(0, Math.ceil((ends - now) / 1000)) : LETTER_SECONDS;
  return (
    <DailyWorld id="letter-sprint">
      <Heading eyebrow={`Letter Sprint · ${langName(p.lang)} · ${dayLabel(state.day)}`} title={ends ? `Find the letter that says “${p.sound}”` : `Eight ${langName(p.lang)} letters`} blurb={ends ? `${left} seconds left` : `Hear a sound, then find its letter. ${LETTER_SECONDS} seconds for all eight.`} />
      {ends ? (
        <>
          <Pips pattern={pattern} total={prompts.length} />
          <Button variant="accent" size="md" onClick={() => say(p.ch, bcp47(p.lang))}>Hear it again</Button>
          <div className={styles.choices}>
            {p.choices.map((c) => (
              <button key={c} type="button" className={`${styles.pill} ${styles.letter}`} lang={p.lang} onClick={() => choose(c)} data-testid="letter-choice" data-answer={c === p.ch ? "yes" : "no"}>
                {c}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Intro id="letter-sprint" langs={[p.lang]} />
          <Button onClick={() => setEnds(Date.now() + LETTER_SECONDS * 1000)} data-testid="letter-start">Start the clock</Button>
        </>
      )}
    </DailyWorld>
  );
}
