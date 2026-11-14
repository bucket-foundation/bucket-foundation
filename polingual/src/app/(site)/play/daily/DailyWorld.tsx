"use client";

import type { ReactNode } from "react";
import type { RevealEntry } from "@academy/lobbies";
import { LEARN_HREF } from "@/lib/lobby/client";
import { shareText, type DailyGame, type DailyResult, type SaveState } from "@/lib/daily/store";
import { readBreaks } from "@/lib/lobby/breaks";
import { local } from "@/lib/storage";
import { Button, ButtonLink } from "@/ui";
import GameWorld, { WorldStickers } from "../GameWorld";
import { Art } from "@/ui/art";
import { FlagTile } from "@/ui";
import { world } from "@/ui/art/play";
import Ad from "../Ad";
import { RevealCard } from "../LearnWord";
import styles from "./daily.module.css";

export function DailyWorld({ id, children }: { id: DailyGame; children: ReactNode }) {
  return (
    <GameWorld id={id} active>
      <div className={styles.sheet}>
        <div className={styles.corners}><WorldStickers id={id} /></div>
        <div className={styles.card}>{children}</div>
      </div>
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

export function Results({ title, result, url, saved, onRetry, rootLang = "en" }: { title: string; result: DailyResult; url: string; saved?: SaveState | null; onRetry?: () => void; rootLang?: string }) {
  const entries: RevealEntry[] = result.words.map((w) => ({ lang: w.lang, word: w.form, roman: null, reading: null, meaning: w.gloss, gloss: w.gloss, correct: w.right }));
  const share = shareText(title, result, url);
  return (
    <section data-testid="daily-results" className={styles.stack}>
      <Heading eyebrow={`${title} · ${dayLabel(result.day)}`} title="Today's result" blurb="A new one comes tomorrow." />
      <p className={styles.score} data-testid="daily-score">{result.score} of {result.total}</p>
      <Pips pattern={result.pattern} total={result.total} />
      <div className={styles.row}>
        <Button onClick={() => void (navigator.share ? navigator.share({ text: share }).catch(() => undefined) : navigator.clipboard?.writeText(share))} data-testid="daily-share">Share</Button>
        <ButtonLink variant="secondary" size="md" href={LEARN_HREF} data-testid="daily-learn">Start learning</ButtonLink>
      </div>
      {entries.length ? (
        <ul className={styles.reveal} data-testid="daily-reveal">
          {entries.map((e, i) => <RevealCard key={`${e.lang}:${e.word}:${i}`} entry={e} index={i} rootLang={rootLang} />)}
        </ul>
      ) : null}
      <p className={styles.blurb} role="status" data-testid="daily-saved" data-state={saved ?? "saving"}>
        {saved === "account" ? "Saved to your account." : saved === "device" ? "Saved on this device. Sign in to keep it." : saved === "failed" ? "Could not save. " : "Saving."}
        {saved === "failed" && onRetry ? <Button variant="quiet" size="sm" onClick={onRetry} data-testid="daily-retry">Retry</Button> : null}
      </p>
      {readBreaks(local).games >= 2 ? <Ad placement="results" testId="daily-ad-results" /> : null}
    </section>
  );
}

export function Loading({ state }: { state: "loading" | "error" }) {
  return state === "loading" ? <p className={styles.blurb} aria-busy="true">Setting out today&apos;s puzzle</p> : <p className={styles.blurb} role="alert">Today&apos;s puzzle did not load. Reload the page to try again.</p>;
}

export function Intro({ id, langs }: { id: DailyGame; langs: readonly string[] }) {
  return (
    <div className={styles.intro} data-testid="daily-intro">
      <span className={styles.introArt} aria-hidden><Art name={world(id).hero} size={150} shadow /></span>
      <ul className={styles.introTiles} aria-hidden>
        {langs.slice(0, 3).map((l, i) => (
          <FlagTile key={l} lang={l} code={l.toUpperCase()} word="?" index={i} />
        ))}
      </ul>
    </div>
  );
}

export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" });
}
