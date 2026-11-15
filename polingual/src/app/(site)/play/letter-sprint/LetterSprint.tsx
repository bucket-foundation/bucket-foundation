"use client";

import { secondsLeft, useDeadline } from "@/lib/hooks/clock";
import { useEffect, useMemo, useRef, useState } from "react";
import { bcp47, say } from "@/lib/speak";
import { dailyLetters, LETTER_SECONDS } from "@/lib/daily/letters";
import { hits, mark } from "@/lib/daily/pattern";
import { Button, NeedsSound } from "@/ui";
import { dayLabel, Heading, Intro, Pips } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { DailyPage } from "../GamePage";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";

type Prompt = ReturnType<typeof dailyLetters>[number];

function Letters({ p, onChoose }: { p: Prompt; onChoose: (c: string) => void }) {
  return (
    <div className={styles.choices}>
      {p.choices.map((c) => (
        <Button bare key={c} className={`${styles.pill} ${styles.letter}`} lang={p.lang} onClick={() => onChoose(c)} data-testid="letter-choice" data-answer={c === p.ch ? "yes" : "no"}>
          {c}
        </Button>
      ))}
    </div>
  );
}

export default function LetterSprint() {
  const daily = useDaily("letter-sprint");
  const { state, finish } = daily;
  const prompts = useMemo(() => (state.status === "ready" ? dailyLetters(state.day, state.system.targets) : []), [state]);
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [ends, setEnds] = useState<number | null>(null);
  const over = useRef(false);
  const p = prompts[i];

  function end(pat: string) {
    if (over.current || state.status !== "ready") return;
    over.current = true;
    const full = pat.padEnd(prompts.length, "0");
    void finish({ game: "letter-sprint", day: state.day, score: hits(full), total: prompts.length, pattern: full, words: prompts.map((q, k) => ({ lang: q.lang, itemId: `abc:${q.ch}`, form: q.ch, gloss: q.sound, right: full[k] === "1" })) });
  }

  useEffect(() => {
    if (ends && p) say(p.ch, bcp47(p.lang), { auto: true });
  }, [ends, p]);

  const now = useDeadline(ends, () => end(pattern));

  function choose(c: string) {
    const next = mark(pattern, c === p.ch);
    setPattern(next);
    if (i + 1 < prompts.length) setI(i + 1);
    else end(next);
  }

  const left = secondsLeft(ends, now, LETTER_SECONDS);
  return (
    <DailyPage id="letter-sprint" title="Letter Sprint" daily={daily} playable={!!p}>
      {(s) => (
        <NeedsSound game="Letter Sprint">
          <Heading eyebrow={`Letter Sprint · ${langName(p.lang)} · ${dayLabel(s.day)}`} title={ends ? `Find the letter that says “${p.sound}”` : `Eight ${langName(p.lang)} letters`} blurb={ends ? `${left} seconds left` : `Hear a sound, then find its letter. ${LETTER_SECONDS} seconds for all eight.`} />
          {ends ? (
            <>
              <Pips pattern={pattern} total={prompts.length} />
              <Button variant="accent" size="md" onClick={() => say(p.ch, bcp47(p.lang))}>Hear it again</Button>
              <Letters p={p} onChoose={choose} />
            </>
          ) : (
            <>
              <Intro id="letter-sprint" langs={[p.lang]} />
              <Button onClick={() => setEnds(Date.now() + LETTER_SECONDS * 1000)} data-testid="letter-start">Start the clock</Button>
            </>
          )}
        </NeedsSound>
      )}
    </DailyPage>
  );
}
