"use client";

import type { ReactNode } from "react";
import type { RevealEntry } from "@academy/lobbies";
import { LEARN_HREF } from "@/lib/lobby/client";
import { shareText, type DailyGame, type DailyResult } from "@/lib/daily/store";
import { Button, ButtonLink } from "@/ui";
import GameWorld from "../GameWorld";
import Ad from "../Ad";
import { RevealCard } from "../LearnWord";
import styles from "./daily.module.css";

export function DailyWorld({ id, children }: { id: DailyGame; children: ReactNode }) {
  return (
    <GameWorld id={id} active>
      <div className={styles.card}>{children}</div>
    </GameWorld>
  );
}

export function Heading({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb?: string }) {
  return (
    <div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      {blurb ? <p className={styles.blurb}>{blurb}</p> : null}
    </div>
  );
}

export function Pips({ pattern, total }: { pattern: string; total: number }) {
  return (
    <span className={styles.pips} aria-label={`${[...pattern].filter((c) => c === "1").length} right so far`}>
      {Array.from({ length: total }, (_, i) => <i key={i} data-v={pattern[i]} />)}
    </span>
  );
}

export function Results({ title, result, url }: { title: string; result: DailyResult; url: string }) {
  const entries: RevealEntry[] = result.words.map((w) => ({ lang: w.lang, word: w.form, roman: null, reading: null, meaning: w.gloss, gloss: w.gloss, correct: w.right }));
  const share = shareText(title, result, url);
  return (
    <section data-testid="daily-results" className={styles.stack}>
      <Heading eyebrow={`${title} · ${result.day}`} title="Today's result" blurb="A new one comes tomorrow." />
      <p className={styles.score} data-testid="daily-score">{result.score} of {result.total}</p>
      <Pips pattern={result.pattern} total={result.total} />
      <div className={styles.row}>
        <Button onClick={() => void (navigator.share ? navigator.share({ text: share }).catch(() => undefined) : navigator.clipboard?.writeText(share))} data-testid="daily-share">Share</Button>
        <ButtonLink variant="secondary" size="md" href={LEARN_HREF} data-testid="daily-learn">Start learning</ButtonLink>
      </div>
      {entries.length ? (
        <ul className={styles.reveal} data-testid="daily-reveal">
          {entries.map((e, i) => <RevealCard key={`${e.lang}:${e.word}:${i}`} entry={e} index={i} />)}
        </ul>
      ) : null}
      <Ad placement="results" testId="daily-ad-results" />
    </section>
  );
}

export function Loading({ state }: { state: "loading" | "error" }) {
  return state === "loading" ? <p className={styles.blurb} aria-busy="true">Setting out today&apos;s puzzle</p> : <p className={styles.blurb} role="alert">Today&apos;s puzzle did not load. Reload the page to try again.</p>;
}
