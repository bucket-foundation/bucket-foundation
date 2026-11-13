"use client";

import { useMemo, useState } from "react";
import { speak } from "@academy/lang-client";
import { dailySet, GameDeck } from "@/lib/daily/words";
import { Button, FlagTile } from "@/ui";
import { dayLabel, DailyWorld, Heading, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";


export default function DailySet() {
  const { state, finish, retry } = useDaily("daily-set");
  const prompts = useMemo(() => (state.status === "ready" ? dailySet(new GameDeck(state.corpus, state.system.root, state.system.targets), state.day) : []), [state]);
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  if (state.status !== "ready") return <DailyWorld id="daily-set"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="daily-set"><Results title="Daily Set" result={state.done} url="https://polingual.com/play/daily-set" saved={state.saved} onRetry={retry} /></DailyWorld>;
  const p = prompts[i];
  if (!p) return <DailyWorld id="daily-set"><Loading state="error" /></DailyWorld>;

  function choose(c: string) {
    if (picked) return;
    setPicked(c);
    const next = pattern + (c === p.answer ? "1" : "0");
    setPattern(next);
    window.setTimeout(() => {
      setPicked(null);
      if (i + 1 < prompts.length) return setI(i + 1);
      void finish({ game: "daily-set", day: state.status === "ready" ? state.day : "", score: [...next].filter((x) => x === "1").length, total: prompts.length, pattern: next, words: prompts.map((q, k) => ({ lang: q.word.lang, itemId: q.word.itemId, form: q.word.form, gloss: q.word.gloss, right: next[k] === "1" })) });
    }, 700);
  }

  return (
    <DailyWorld id="daily-set">
      <Heading eyebrow={`Daily Set · ${dayLabel(state.day)}`} title={`Find the ${langName(p.word.lang)} word`} blurb="Six words. The same six for everyone on your languages today." />
      <Pips pattern={pattern} total={prompts.length} />
      <div className={styles.hero}>
        <FlagTile as="div" lang={state.system.root} code={state.system.root.toUpperCase()} label={`In ${langName(p.word.lang)}?`} word={p.word.gloss} />
      </div>
      <div className={styles.choices} data-testid="daily-choices">
        {p.choices.map((c) => (
          <Button key={c} variant={picked ? (c === p.answer ? "success" : c === picked ? "primary" : "secondary") : "secondary"} onClick={() => { speak(c, p.word.lang); choose(c); }} data-testid="daily-choice" data-answer={c === p.answer ? "yes" : "no"}>
            {c}
          </Button>
        ))}
      </div>
    </DailyWorld>
  );
}
