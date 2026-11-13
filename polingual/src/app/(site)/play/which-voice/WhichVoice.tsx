"use client";

import { useEffect, useMemo, useState } from "react";
import { speak } from "@academy/lang-client";
import { fnv, mixed, SeededRandom } from "@/lib/daily/rng";
import { flags, formOf, GameDeck, type GameWord } from "@/lib/daily/words";
import { Button } from "@/ui";
import { DailyWorld, Heading, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../daily/daily.module.css";


export default function WhichVoice() {
  const { state, finish } = useDaily("which-voice");
  const prompts = useMemo(() => {
    if (state.status !== "ready") return [];
    const { root, targets } = state.system;
    const deck = new GameDeck(state.corpus, root, targets);
    const rng = new SeededRandom(fnv(`voice|${state.day}|${root}|${[...targets].sort().join(",")}`));
    const words: GameWord[] = targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), rng).slice(0, 6).map((e) => deck.word(e.itemId, l)!));
    const c = state.corpus;
    return flags(words, targets, "voice", rng, (w, l) => {
      const item = c.byId.get(w.itemId);
      return l !== w.lang && !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
    });
  }, [state]);
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const p = prompts[i];

  useEffect(() => {
    if (p && state.status === "ready" && !state.done) speak(p.word.form, p.word.lang);
  }, [p, state]);

  if (state.status !== "ready") return <DailyWorld id="which-voice"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="which-voice"><Results title="Which Voice" result={state.done} url="https://polingual.com/play/which-voice" /></DailyWorld>;
  if (!p) return <DailyWorld id="which-voice"><Loading state="error" /></DailyWorld>;

  function choose(c: string) {
    if (picked || state.status !== "ready") return;
    setPicked(c);
    const next = pattern + (c === p.answer ? "1" : "0");
    setPattern(next);
    const day = state.day;
    window.setTimeout(() => {
      setPicked(null);
      if (i + 1 < prompts.length) return setI(i + 1);
      void finish({ game: "which-voice", day, score: [...next].filter((x) => x === "1").length, total: prompts.length, pattern: next, words: prompts.map((q, k) => ({ lang: q.word.lang, itemId: q.word.itemId, form: q.word.form, gloss: q.word.gloss, right: next[k] === "1" })) });
    }, 700);
  }

  return (
    <DailyWorld id="which-voice">
      <Heading eyebrow={`Which Voice · ${state.day}`} title="Listen, then pick the language" blurb="Ten words read aloud. Play a word again as often as you like." />
      <Pips pattern={pattern} total={prompts.length} />
      <Button variant="accent" size="xl" onClick={() => speak(p.word.form, p.word.lang)} data-testid="voice-play">Play the word</Button>
      <div className={styles.choices}>
        {p.choices.map((c) => (
          <Button key={c} variant={picked ? (c === p.answer ? "success" : c === picked ? "primary" : "secondary") : "secondary"} icon={<FlagSquare lang={c} />} onClick={() => choose(c)} data-testid="voice-choice" data-answer={c === p.answer ? "yes" : "no"}>
            {langName(c)}
          </Button>
        ))}
      </div>
    </DailyWorld>
  );
}
