"use client";

import { memo } from "react";
import type { WorldId } from "@/ui/art/play";
import { Button } from "@/ui";
import { bookKey } from "@/lib/daily/store";
import { useDailyBook } from "./daily/useDaily";
import { DAILY_GAMES } from "./daily";
import { WorldPreview } from "./GameWorld";
import type { LobbySummary } from "@/lib/lobby/client";
import type { GameId } from "./langs";
import styles from "./play.module.css";

type HubGame = { key: string; name: string; blurb: string; world: WorldId; testId: string } & ({ href: string } | { lobby: GameId });

const HUB: HubGame[] = [
  { key: "duel", world: "duel", name: "Flag Duel", blurb: "Ten rounds. Name the language, then the meaning.", testId: "hub-duel", lobby: "duel" },
  { key: "flag-tiles", world: "flag-tiles", name: "Flag Tiles", blurb: "Solo daily run. A word falls; tap the flag of its language.", testId: "solo-flag-tiles", href: "/play/flag-tiles" },
  { key: "voice-atlas", world: "voice-atlas", name: "Voice Atlas", blurb: "Five words a day. Hear one, pin where its language is spoken.", testId: "solo-voice-atlas", href: "/play/voice-atlas" },
  { key: "word-snake", world: "word-snake", name: "Word Snake", blurb: "Arena with bot snakes. Eat words in your language, dodge the decoys.", testId: "solo-word-snake", href: "/play/word-snake" },
  { key: "forehead", world: "forehead", name: "Forehead", blurb: "Party mode on one phone. Friends give clues, you tilt to score.", testId: "solo-forehead", href: "/play/forehead" },
  { key: "babel-match", world: "babel-match", name: "Babel Match", blurb: "Match-3 with words. Three that mean the same thing clear.", testId: "solo-babel-match", href: "/play/babel-match" },
  { key: "shift", world: "shift", name: "Shift", blurb: "Daily letter board. Slide columns to spell words in two languages.", testId: "solo-shift", href: "/play/shift" },
  { key: "same-word", world: "same-word", name: "Same Word", blurb: "One meaning across languages.", testId: "hub-same-word", lobby: "same-word" },
  { key: "flags", world: "flags", name: "Flags", blurb: "Name the language of each word.", testId: "hub-flags", lobby: "flags" },
  { key: "tiles", world: "tiles", name: "Tiles", blurb: "Words fall. Tap every one that means the word on top.", testId: "hub-tiles", lobby: "tiles" },
  { key: "ispy", world: "ispy", name: "I Spy", blurb: "Spot the thing, say it in the language of the round.", testId: "hub-ispy", href: "/play/ispy" },
  { key: "polyword", world: "polyword", name: "Polyword", blurb: "One word a day. Every miss shows its meaning in another language.", testId: "polyword-link", href: "/play/polyword" },
];

function countLabel(n: number) {
  if (n === 0) return "No open lobbies yet";
  return `${n} open ${n === 1 ? "lobby" : "lobbies"}`;
}

function DailyHub() {
  const today = useDailyBook();
  return (
    <section className={styles.hubGroup} data-testid="daily-hub">
      <h2 className={styles.hubHeading}>Daily</h2>
      <ul className={styles.hub}>
        {DAILY_GAMES.map((g) => {
          const done = today ? today.book[bookKey(g.slug, today.day)] : undefined;
          return (
            <li key={g.slug}>
              <a href={g.href} className={styles.hubCard} data-testid={`daily-${g.slug}`} data-done={done ? "yes" : "no"}>
                <span className={styles.hubPanel}>
                  <WorldPreview id={g.slug} />
                </span>
                <b>{g.title}</b>
                <span className={styles.hubBlurb}>{g.blurb}</span>
                <span className={styles.hubCount} data-live={!!today && !done} data-testid={`daily-state-${g.slug}`} aria-busy={!today}>
                  {!today ? "Checking today" : done ? `Done today · ${done.score} of ${done.total}` : "Play today"}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GameHub({ open, ispyReady, offered, onPick }: { open: LobbySummary[] | null; ispyReady: boolean; offered: string[] | null; onPick: (g: GameId) => void }) {
  return (
    <>
    <DailyHub />
    <h2 className={styles.hubHeading}>All games</h2>
    <ul className={styles.hub} data-testid="game-hub">
      {HUB.map((g) => {
        const body = (
          <>
            <span className={styles.hubPanel}>
              <WorldPreview id={g.world} />
            </span>
            <b>{g.name}</b>
            <span className={styles.hubBlurb}>{g.blurb}</span>
            {"lobby" in g ? (
              <span className={styles.hubCount} data-live={(open?.filter((l) => l.game === g.lobby).length ?? 0) > 0} data-testid={`hub-count-${g.key}`}>
                {open === null ? "Pick a name to see lobbies" : countLabel(open.filter((l) => l.game === g.lobby).length)}
              </span>
            ) : (
              <span className={styles.hubCount} data-testid={`hub-count-${g.key}`}>Solo, play any time</span>
            )}
            {g.key === "ispy" && !ispyReady ? <span className={styles.hubNew}>New</span> : null}
            {"lobby" in g && offered && !offered.includes(g.lobby) ? <span className={styles.hubNew}>Soon</span> : null}
          </>
        );
        return (
          <li key={g.key}>
            {"href" in g ? (
              <a href={g.href} className={styles.hubCard} data-testid={g.testId}>{body}</a>
            ) : (
              <Button bare className={styles.hubCard} data-testid={g.testId} onClick={() => onPick(g.lobby)}>{body}</Button>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

export default memo(GameHub);
