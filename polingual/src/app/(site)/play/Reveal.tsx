"use client";

import { parseTile } from "@academy/lobby-tiles";
import type { RevealEntry } from "@academy/lobbies";
import { revealOrder, type LobbyPrompt } from "@/lib/lobby/client";
import { learnEntry, learnHref, LEARN_FALLBACK } from "@/lib/lobby/learn-index";
import { ButtonLink } from "@/ui";
import { useLearnIndex } from "./useLearn";
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

export type RevealWord = { lang: string; word: string; meaning: string; gloss?: string; roman?: string | null; reading?: RevealEntry["reading"]; correct?: boolean };

export function toEntry(w: RevealWord): RevealEntry {
  return { lang: w.lang, word: w.word, roman: w.roman ?? null, reading: w.reading ?? null, meaning: w.meaning, gloss: w.gloss ?? w.meaning, correct: w.correct ?? true };
}

export function WordReveal({ title, words, testId = "word-reveal" }: { title: React.ReactNode; words: RevealWord[]; testId?: string }) {
  if (words.length === 0) return null;
  return (
    <section className={styles.wordReveal} data-testid={testId}>
      <p className={styles.revealHead}>{title}</p>
      <ul className={styles.revealGrid}>
        {words.map((w, i) => (
          <RevealCard key={`${w.lang}:${w.word}:${i}`} entry={toEntry(w)} index={i} />
        ))}
      </ul>
    </section>
  );
}

export function LearnPanel({ missed }: { missed: RevealWord[] }) {
  const index = useLearnIndex();
  const seen = new Set<string>();
  const unique = missed.filter((m) => (seen.has(`${m.lang}:${m.word}`) ? false : (seen.add(`${m.lang}:${m.word}`), true))).slice(0, 8);
  return (
    <section className={styles.learnPanel} data-testid="learn-panel">
      <h2>Keep these words</h2>
      <p>{unique.length ? "Each missed word has a lesson with its sound, root and cousins." : "Turn today's run into a streak with a few minutes of Learn."}</p>
      {unique.length ? (
        <ul className={styles.learnMissed}>
          {unique.map((m) => (
            <li key={`${m.lang}:${m.word}`}>
              <a href={learnHref(learnEntry(index, m.lang, m.word, m.meaning))} data-testid="learn-missed">
                <FlagSquare lang={m.lang} size={16} />
                {m.word}
                <span>{m.meaning}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <ButtonLink href={LEARN_FALLBACK} data-testid="results-start-learning">Start learning</ButtonLink>
    </section>
  );
}
