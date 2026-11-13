"use client";

import { Art, type ArtName } from "@/ui/art";
import type { LobbySummary } from "@/lib/lobby/client";
import type { GameId } from "./langs";
import styles from "./play.module.css";

type HubGame = { key: string; name: string; blurb: string; art: ArtName; rotate: number; testId: string } & ({ href: string } | { lobby: GameId });

const HUB: HubGame[] = [
  { key: "duel", name: "Flag Duel", blurb: "Ten rounds. Name the language, then the meaning.", art: "pebble", rotate: -14, testId: "hub-duel", lobby: "duel" },
  { key: "flag-tiles", name: "Flag Tiles", blurb: "Solo daily run. A word falls; tap the flag of its language.", art: "kente", rotate: -10, testId: "solo-flag-tiles", href: "/play/flag-tiles" },
  { key: "voice-atlas", name: "Voice Atlas", blurb: "Five words a day. Hear one, pin where its language is spoken.", art: "azulejo", rotate: 8, testId: "solo-voice-atlas", href: "/play/voice-atlas" },
  { key: "word-snake", name: "Word Snake", blurb: "Arena with bot snakes. Eat words in your language, dodge the decoys.", art: "brush", rotate: -6, testId: "solo-word-snake", href: "/play/word-snake" },
  { key: "forehead", name: "Forehead", blurb: "Party mode on one phone. Friends give clues, you tilt to score.", art: "ticket", rotate: 6, testId: "solo-forehead", href: "/play/forehead" },
  { key: "babel-match", name: "Babel Match", blurb: "Match-3 with words. Three that mean the same thing clear.", art: "blocks", rotate: -8, testId: "solo-babel-match", href: "/play/babel-match" },
  { key: "shift", name: "Shift", blurb: "Daily letter board. Slide columns to spell words in two languages.", art: "torn-label", rotate: 5, testId: "solo-shift", href: "/play/shift" },
  { key: "same-word", name: "Same Word", blurb: "One meaning across languages.", art: "seal", rotate: -7, testId: "hub-same-word", lobby: "same-word" },
  { key: "flags", name: "Flags", blurb: "Name the language of each word.", art: "bunting", rotate: 4, testId: "hub-flags", lobby: "flags" },
  { key: "tiles", name: "Tiles", blurb: "Words fall. Tap every one that means the word on top.", art: "azulejo-grid", rotate: 10, testId: "hub-tiles", lobby: "tiles" },
  { key: "ispy", name: "I Spy", blurb: "Spot the thing, say it in the language of the round.", art: "star", rotate: -12, testId: "hub-ispy", href: "/play/ispy" },
  { key: "polyword", name: "Polyword", blurb: "One word a day. Every miss shows its meaning in another language.", art: "streak-flame", rotate: 6, testId: "polyword-link", href: "/play/polyword" },
];

function countLabel(n: number) {
  if (n === 0) return "No open lobbies yet";
  return `${n} open ${n === 1 ? "lobby" : "lobbies"}`;
}

export default function GameHub({ open, ispyReady, offered, onPick }: { open: LobbySummary[] | null; ispyReady: boolean; offered: string[] | null; onPick: (g: GameId) => void }) {
  return (
    <ul className={styles.hub} data-testid="game-hub">
      {HUB.map((g) => {
        const body = (
          <>
            <span className={styles.hubPanel}>
              <span style={{ rotate: `${g.rotate}deg` }}><Art name={g.art} size={92} shadow /></span>
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
              <button type="button" className={styles.hubCard} data-testid={g.testId} onClick={() => onPick(g.lobby)}>{body}</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
