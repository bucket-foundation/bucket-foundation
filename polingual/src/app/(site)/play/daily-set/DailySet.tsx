"use client";

import { useMemo } from "react";
import { bcp47, say } from "@/lib/speak";
import { hits, patternWords, pickVariant } from "@/lib/daily/pattern";
import { dailySet, GameDeck } from "@/lib/daily/words";
import { Button, FlagTile } from "@/ui";
import { dayLabel, Heading, Pips } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { usePick } from "../daily/usePick";
import { DailyPage } from "../GamePage";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";

export default function DailySet() {
  const daily = useDaily("daily-set");
  const { state, finish } = daily;
  const prompts = useMemo(() => (state.status === "ready" ? dailySet(new GameDeck(state.corpus, state.system.root, state.system.targets), state.day) : []), [state]);
  const { i, pattern, picked, choose } = usePick(prompts.length, (next) => {
    void finish({ game: "daily-set", day: state.status === "ready" ? state.day : "", score: hits(next), total: prompts.length, pattern: next, words: patternWords(prompts.map((q) => q.word), next) });
  });
  const p = prompts[i];

  return (
    <DailyPage id="daily-set" title="Daily Set" daily={daily} playable={!!p}>
      {(s) => (
        <>
          <Heading eyebrow={`Daily Set · ${dayLabel(s.day)}`} title={`Find the ${langName(p.word.lang)} word`} blurb="Six words. The same six for everyone on your languages today." />
          <Pips pattern={pattern} total={prompts.length} />
          <div className={styles.hero}>
            <FlagTile as="div" lang={s.system.root} code={s.system.root.toUpperCase()} label={`In ${langName(p.word.lang)}?`} word={p.word.gloss} />
          </div>
          <div className={styles.choices} data-testid="daily-choices">
            {p.choices.map((c) => (
              <Button key={c} variant={pickVariant(picked, c, p.answer)} onClick={() => { say(c, bcp47(p.word.lang)); choose(c, p.answer); }} data-testid="daily-choice" data-answer={c === p.answer ? "yes" : "no"}>
                {c}
              </Button>
            ))}
          </div>
        </>
      )}
    </DailyPage>
  );
}
