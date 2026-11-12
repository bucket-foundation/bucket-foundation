import type { LobbyPrompt } from "@/lib/lobby/client";
import { flagEmoji, langFlag } from "@/lib/lobby/client";
import { langName } from "./langs";
import styles from "./play.module.css";

export default function Reveal({ prompt, compact = false }: { prompt: LobbyPrompt; compact?: boolean }) {
  const entries = prompt.reveal ?? [];
  return (
    <section className={styles.reveal} data-compact={compact} data-testid="reveal">
      <p className={styles.revealHead}>
        Round {prompt.round + 1}: <b>{prompt.mode === "flag" ? entries.find((e) => e.correct)?.meaning ?? prompt.gloss : prompt.gloss}</b>
      </p>
      <ul className={styles.revealList}>
        {entries.map((e, i) => (
          <li key={`${e.lang}:${e.word}:${i}`} className={styles.revealItem} data-correct={e.correct} data-testid="reveal-entry">
            <span className={styles.revealFlag} aria-hidden="true">{flagEmoji(langFlag(e.lang))}</span>
            <span className={styles.revealLang}>{langName(e.lang)}</span>
            <b className={styles.revealWord}>{e.word}</b>
            {e.roman ? <span className={styles.revealRoman}>{e.roman}</span> : null}
            <span className={styles.revealMeaning}>{e.meaning ? `means "${e.meaning}"` : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
