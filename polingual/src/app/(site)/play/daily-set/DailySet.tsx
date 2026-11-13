"use client";

import { useMemo, useState } from "react";
import { speak } from "@academy/lang-client";
import { dailySet, GameDeck } from "@/lib/daily/words";
import { Button, FlagTile } from "@/ui";
import { DailyWorld, Heading, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";

const WIDE = [
  { name: "bunting" as const, x: "4%", y: "6%", size: 170, rotate: -6 },
  { name: "star" as const, x: "8%", y: "48%", size: 90, rotate: 10 },
  { name: "calligraphy-yong" as const, x: "5%", y: "12%", size: 120, rotate: 8, side: "right" as const },
  { name: "blocks" as const, x: "4%", y: "58%", size: 140, rotate: -9, side: "right" as const },
];
const STRIP = [
  { name: "bunting" as const, x: "0%", y: "8px", size: 120, rotate: -5 },
  { name: "star" as const, x: "40%", y: "20px", size: 52, rotate: 10 },
  { name: "blocks" as const, x: "2%", y: "10px", size: 80, rotate: 7, side: "right" as const },
];

export default function DailySet() {
  const { state, finish } = useDaily("daily-set");
  const prompts = useMemo(() => (state.status === "ready" ? dailySet(new GameDeck(state.corpus, state.system.root, state.system.targets), state.day) : []), [state]);
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  if (state.status !== "ready") return <DailyWorld wide={WIDE} strip={STRIP}><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld wide={WIDE} strip={STRIP}><Results title="Daily Set" result={state.done} url="https://polingual.com/play/daily-set" /></DailyWorld>;
  const p = prompts[i];
  if (!p) return <DailyWorld wide={WIDE} strip={STRIP}><Loading state="error" /></DailyWorld>;

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
    <DailyWorld wide={WIDE} strip={STRIP}>
      <Heading eyebrow={`Daily Set · ${state.day}`} title={`Find the ${langName(p.word.lang)} word`} blurb="Six words. The same six for everyone on your languages today." />
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
