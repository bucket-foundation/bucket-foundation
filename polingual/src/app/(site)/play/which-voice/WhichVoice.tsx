"use client";

import { useEffect, useMemo } from "react";
import { bcp47, say } from "@/lib/speak";
import { hits, patternWords, pickVariant } from "@/lib/daily/pattern";
import { voicePrompts } from "@/lib/daily/voice";
import { Button, NeedsSound } from "@/ui";
import { dayLabel, Heading, Pips } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { usePick } from "../daily/usePick";
import { DailyPage } from "../GamePage";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../daily/daily.module.css";

export default function WhichVoice() {
  const daily = useDaily("which-voice");
  const { state, finish } = daily;
  const prompts = useMemo(() => (state.status === "ready" ? voicePrompts(state.corpus, state.system.root, state.system.targets, state.day) : []), [state]);
  const day = state.status === "ready" ? state.day : "";
  const { i, pattern, picked, choose } = usePick(prompts.length, (next) => {
    void finish({ game: "which-voice", day, score: hits(next), total: prompts.length, pattern: next, words: patternWords(prompts.map((q) => q.word), next) });
  });
  const p = prompts[i];

  useEffect(() => {
    if (p && state.status === "ready" && !state.done) say(p.word.form, bcp47(p.word.lang), { auto: true });
  }, [p, state]);

  return (
    <DailyPage id="which-voice" title="Which Voice" daily={daily} playable={!!p}>
      {(s) => (
        <NeedsSound game="Which Voice">
          <Heading eyebrow={`Which Voice · ${dayLabel(s.day)}`} title="Listen, then pick the language" blurb="Ten words read aloud. Play a word again as often as you like." />
          <Pips pattern={pattern} total={prompts.length} />
          <Button variant="accent" size="xl" onClick={() => say(p.word.form, bcp47(p.word.lang))} data-testid="voice-play">Play the word</Button>
          <div className={styles.choices}>
            {p.choices.map((c) => (
              <Button key={c} variant={pickVariant(picked, c, p.answer)} icon={<FlagSquare lang={c} />} onClick={() => choose(c, p.answer)} data-testid="voice-choice" data-answer={c === p.answer ? "yes" : "no"}>
                {langName(c)}
              </Button>
            ))}
          </div>
        </NeedsSound>
      )}
    </DailyPage>
  );
}
