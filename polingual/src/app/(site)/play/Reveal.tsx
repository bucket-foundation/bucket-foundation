"use client";

import { parseTile } from "@academy/lobby-tiles";
import { revealOrder, type LobbyPrompt } from "@/lib/lobby/client";
import { FlagSquare, RevealCard } from "./LearnWord";
import { langName } from "./langs";
import styles from "./play.module.css";

export interface PickLabel {
  word: string | null;
  lang: string | null;
}

export function choiceLabel(prompt: Pick<LobbyPrompt, "mode" | "lang">, choice: string): PickLabel {
  if (prompt.mode === "flag") return { word: null, lang: choice };
  if (prompt.mode === "meaning" || prompt.mode === "spy") return { word: choice, lang: null };
  if (prompt.mode === "mixed") {
    const t = parseTile(choice);
    return { word: t.form, lang: t.lang };
  }
  return { word: choice, lang: prompt.lang };
}

function Label({ label }: { label: PickLabel }) {
  return (
    <span className={styles.pickLabel}>
      {label.lang ? <FlagSquare lang={label.lang} size={20} /> : null}
      {label.word ? <b>{label.word}</b> : null}
      {label.lang ? <span>{langName(label.lang)}</span> : null}
    </span>
  );
}

export function RevealBanner({ prompt, pick }: { prompt: LobbyPrompt; pick: { choice: string; correct: boolean } | null }) {
  if (prompt.mode === "tiles" || !prompt.answer) return null;
  const answer = choiceLabel(prompt, prompt.answer);
  return (
    <div className={styles.verdict} data-testid="verdict" data-result={pick ? (pick.correct ? "right" : "wrong") : "none"}>
      <p className={styles.verdictHead}>{pick ? (pick.correct ? "✓ You got it" : "✗ Not this time") : "Time is up"}</p>
      <p className={styles.verdictLine} data-testid="verdict-answer">
        <span className={styles.verdictKey}>Answer</span>
        <Label label={answer} />
      </p>
      {pick && !pick.correct ? (
        <p className={styles.verdictLine} data-testid="verdict-pick">
          <span className={styles.verdictKey}>You picked</span>
          <Label label={choiceLabel(prompt, pick.choice)} />
        </p>
      ) : null}
    </div>
  );
}

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
