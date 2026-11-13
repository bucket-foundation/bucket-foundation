"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { speak } from "@academy/lang-client";
import { dailyLetters, LETTER_SECONDS } from "@/lib/daily/letters";
import { Button } from "@/ui";
import { DailyWorld, Heading, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";

const WIDE = [
  { name: "calligraphy-ain" as const, x: "5%", y: "8%", size: 130, rotate: -6 },
  { name: "script-ru" as const, x: "8%", y: "58%", size: 90, rotate: 8, shadow: false },
  { name: "calligraphy-yong" as const, x: "5%", y: "10%", size: 130, rotate: 7, side: "right" as const },
  { name: "brush" as const, x: "4%", y: "58%", size: 130, rotate: -8, side: "right" as const },
];
const STRIP = [
  { name: "calligraphy-ain" as const, x: "0%", y: "10px", size: 70, rotate: -6 },
  { name: "brush" as const, x: "36%", y: "18px", size: 80, rotate: 6 },
  { name: "calligraphy-yong" as const, x: "2%", y: "8px", size: 70, rotate: 7, side: "right" as const },
];

export default function LetterSprint() {
  const { state, finish } = useDaily("letter-sprint");
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
    if (ends && p) speak(p.ch, p.lang);
  }, [ends, p]);

  useEffect(() => {
    if (!ends) return;
    const t = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= ends) end(pattern);
    }, 250);
    return () => window.clearInterval(t);
  });

  if (state.status !== "ready") return <DailyWorld wide={WIDE} strip={STRIP}><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld wide={WIDE} strip={STRIP}><Results title="Letter Sprint" result={state.done} url="https://polingual.com/play/letter-sprint" /></DailyWorld>;
  if (!p) return <DailyWorld wide={WIDE} strip={STRIP}><Loading state="error" /></DailyWorld>;

  function choose(c: string) {
    const next = pattern + (c === p.ch ? "1" : "0");
    setPattern(next);
    if (i + 1 < prompts.length) setI(i + 1);
    else end(next);
  }

  const left = ends ? Math.max(0, Math.ceil((ends - now) / 1000)) : LETTER_SECONDS;
  return (
    <DailyWorld wide={WIDE} strip={STRIP}>
      <Heading eyebrow={`Letter Sprint · ${langName(p.lang)} · ${state.day}`} title={ends ? `Find the letter that says “${p.sound}”` : `Eight ${langName(p.lang)} letters`} blurb={ends ? `${left} seconds left` : `Hear a sound, then find its letter. ${LETTER_SECONDS} seconds for all eight.`} />
      {ends ? (
        <>
          <Pips pattern={pattern} total={prompts.length} />
          <Button variant="accent" size="md" onClick={() => speak(p.ch, p.lang)}>Hear it again</Button>
          <div className={styles.choices}>
            {p.choices.map((c) => (
              <button key={c} type="button" className={`${styles.pill} ${styles.letter}`} lang={p.lang} onClick={() => choose(c)} data-testid="letter-choice" data-answer={c === p.ch ? "yes" : "no"}>
                {c}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Button onClick={() => setEnds(Date.now() + LETTER_SECONDS * 1000)} data-testid="letter-start">Start the clock</Button>
      )}
    </DailyWorld>
  );
}
