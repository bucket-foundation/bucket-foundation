"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fnv } from "@/lib/daily/rng";
import { Speed, SPEED_MISS_PENALTY, SPEED_SECONDS } from "@/lib/daily/speed";
import { balanced, GameDeck, wordId, type GameWord } from "@/lib/daily/words";
import { mixed, SeededRandom } from "@/lib/daily/rng";
import { Button } from "@/ui";
import { DailyWorld, Heading, Loading, Pips, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import styles from "../daily/daily.module.css";

export const SPEED_PAIRS = 15;


function speedDeck(deck: GameDeck, day: string, targets: readonly string[]): GameWord[] {
  const rng = new SeededRandom(fnv(`speed|${day}|${deck.root}|${[...targets].sort().join(",")}`));
  return balanced(targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), rng).slice(0, 12).map((e) => deck.word(e.itemId, l)!)));
}

export default function SpeedMatch() {
  const { state, finish } = useDaily("speed-match");
  const game = useMemo(() => {
    if (state.status !== "ready") return null;
    const deck = new GameDeck(state.corpus, state.system.root, state.system.targets);
    return new Speed(speedDeck(deck, state.day, state.system.targets), fnv(`speed-board|${state.day}`));
  }, [state]);
  const [, tick] = useState(0);
  const [pattern, setPattern] = useState("");
  const [ends, setEnds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const over = useRef(false);

  function end(p: string) {
    if (over.current || !game || state.status !== "ready") return;
    over.current = true;
    const words = [...new Map(game.board.seen.map((w) => [wordId(w), w])).values()].slice(0, 12);
    const missed = new Set(game.board.missed.map(wordId));
    void finish({ game: "speed-match", day: state.day, score: game.board.hits, total: SPEED_PAIRS, pattern: p.padEnd(SPEED_PAIRS, "0").slice(0, SPEED_PAIRS), words: words.map((w) => ({ lang: w.lang, itemId: w.itemId, form: w.form, gloss: w.gloss, right: !missed.has(wordId(w)) })) });
  }

  useEffect(() => {
    if (!ends) return;
    const t = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= ends) end(pattern);
    }, 250);
    return () => window.clearInterval(t);
  });

  if (state.status !== "ready") return <DailyWorld id="speed-match"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="speed-match"><Results title="Speed Match" result={state.done} url="https://polingual.com/play/speed-match" /></DailyWorld>;
  if (!game?.playable) return <DailyWorld id="speed-match"><Loading state="error" /></DailyWorld>;

  const b = game.board;
  const left = ends ? Math.max(0, Math.ceil((ends - now) / 1000)) : SPEED_SECONDS;

  function after(kind: string) {
    if (kind !== "matched" && kind !== "missed") return tick((x) => x + 1);
    const p = pattern + (kind === "matched" ? "1" : "0");
    setPattern(p);
    if (kind === "missed" && ends) setEnds(ends - SPEED_MISS_PENALTY * 1000);
    tick((x) => x + 1);
    if (game && game.board.hits >= SPEED_PAIRS) end(p);
  }

  return (
    <DailyWorld id="speed-match">
      <Heading eyebrow={`Speed Match · ${state.day}`} title={ends ? `${left} seconds` : "Pair each meaning with its word"} blurb={`Match ${SPEED_PAIRS} pairs in ${SPEED_SECONDS} seconds. A miss costs ${SPEED_MISS_PENALTY} seconds; five in a row scores double.`} />
      {ends ? <Pips pattern={pattern.slice(-SPEED_PAIRS)} total={SPEED_PAIRS} /> : <Button onClick={() => setEnds(Date.now() + SPEED_SECONDS * 1000)} data-testid="speed-start">Start the clock</Button>}
      {ends ? (
        <div className={styles.board} data-testid="speed-board">
          <div>
            {b.meanings.map((w, i) => (
              <button key={`m${i}`} type="button" className={styles.pill} disabled={!w} aria-pressed={!!w && b.pickedMeaning === wordId(w)} onClick={() => w && after(game.tapMeaning(wordId(w)).kind)} data-testid="speed-meaning" data-id={w ? wordId(w) : ""}>
                {w?.gloss}
              </button>
            ))}
          </div>
          <div>
            {b.forms.map((w, i) => (
              <button key={`f${i}`} type="button" className={styles.pill} disabled={!w} aria-pressed={!!w && b.pickedForm === wordId(w)} lang={w?.lang} onClick={() => w && after(game.tapForm(wordId(w)).kind)} data-testid="speed-form" data-id={w ? wordId(w) : ""}>
                {w?.form}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className={styles.clock}>{b.points} points · best run {b.bestCombo}</p>
    </DailyWorld>
  );
}
