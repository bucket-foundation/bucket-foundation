"use client";

import { revealOrder, type LobbyPrompt } from "@/lib/lobby/client";
import { RevealCard } from "./LearnWord";
import styles from "./play.module.css";

export default function Reveal({ prompt, answersOnly = false }: { prompt: LobbyPrompt; answersOnly?: boolean }) {
  const all = revealOrder(prompt.reveal ?? []);
  const entries = answersOnly ? all.filter((e) => e.correct) : all;
  const title = prompt.mode === "flag" ? all.find((e) => e.correct)?.meaning || prompt.gloss : prompt.gloss;
  return (
    <section className={styles.reveal} data-testid="reveal">
      <p className={styles.revealHead}>
        Round {prompt.round + 1}: <b>{title}</b>
      </p>
      <ul className={styles.revealGrid} data-answers-only={answersOnly}>
        {entries.map((e, i) => (
          <RevealCard key={`${e.lang}:${e.word}:${i}`} entry={e} index={i} />
        ))}
      </ul>
    </section>
  );
}
