"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fallMs, type FlagTilesDeck, type Ghost } from "@academy/flag-tiles";
import { LANGS } from "@academy/lang-systems";
import { TileFace } from "@/app/tile";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { flagEmoji, LEARN_HREF } from "@/lib/lobby/client";
import { readBest, START, step, writeBest, type RunEvent } from "@/lib/lobby/flag-run";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GameWorld from "../GameWorld";
import { LearnPanel, WordReveal } from "../Reveal";
import styles from "../play.module.css";
import { Button, ButtonLink } from "@/ui";

const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, "1": 0, "2": 1, "3": 2, "4": 3 };

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function FlagTilesGame() {
  const [deck, setDeck] = useState<FlagTilesDeck | null>(null);
  const [board, setBoard] = useState<Ghost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(START);
  const [progress, setProgress] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const adsVisible = useAdsVisible();
  const tileStart = useRef(0);
  const counted = useRef(-1);
  const runs = useRef(0);

  useEffect(() => {
    setMuted(readMuted(() => window.localStorage));
    fetch("/api/academy/flag-tiles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { deck: FlagTilesDeck; ghosts: Ghost[] }) => {
        setDeck(d.deck);
        setBoard(d.ghosts);
        setBest(readBest(local, d.deck.date));
      })
      .catch(() => setError("Flag Tiles could not load. Try again in a minute."));
  }, []);

  const tile = deck && run.phase !== "ready" ? deck.tiles[(run.missed ?? run.index) % deck.tiles.length] : null;
  const answer = tile && deck ? deck.langs.indexOf(tile.lang) : -1;

  const send = useCallback((e: RunEvent) => {
    if (e.kind === "start") runs.current += 1;
    setRun((s) => step(s, e));
  }, []);

  useEffect(() => {
    if (run.phase !== "running") return;
    tileStart.current = performance.now();
    setProgress(0);
    let raf = 0;
    const ms = fallMs(run.index);
    const tick = () => {
      const p = (performance.now() - tileStart.current) / ms;
      setProgress(Math.min(1, p));
      if (p >= 1) {
        send({ kind: "timeout" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) tileStart.current += performance.now() - hiddenAt;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [run.phase, run.index, send]);

  useEffect(() => {
    if (run.phase === "missed") play("miss", muted);
    if (run.phase === "over" && deck && counted.current !== runs.current) {
      counted.current = runs.current;
      setBest(writeBest(local, deck.date, run.score));
      const stored = readBreaks(local);
      const games = stored.games + 1;
      const now = Date.now();
      const show = adsVisible && interstitialDue(games, stored.lastInterstitial, now);
      writeBreaks(local, { games, lastInterstitial: show ? now : stored.lastInterstitial });
      if (show) setInterstitial(true);
    }
  }, [run.phase, deck, run.score, muted, adsVisible]);

  const tap = useCallback(
    (lane: number) => {
      if (run.phase !== "running" || answer < 0) return;
      play(lane === answer ? "hit" : "tap", muted);
      send({ kind: "tap", lane, answer });
    },
    [run.phase, answer, muted, send],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = KEYS[e.key.toLowerCase()];
      if (lane === undefined || e.repeat) return;
      e.preventDefault();
      tap(lane);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap]);

  if (error) return <p className={app.error} role="alert">{error}</p>;
  if (!deck) return <p className={app.muted} aria-busy="true">Loading today&apos;s tiles</p>;

  const lanes = (
    <div className={styles.ftLanes} role="group" aria-label="Language lanes">
      {deck.langs.map((l, i) => (
        <button
          key={l}
          type="button"
          className={styles.ftLane}
          onPointerDown={(e) => {
            e.preventDefault();
            tap(i);
          }}
          data-state={run.phase === "missed" || run.phase === "over" ? (i === answer ? "right" : i === run.picked ? "wrong" : "dim") : undefined}
          data-testid="ft-lane"
          aria-label={langName(l)}
        >
          <FlagSquare lang={l} size={40} />
          <span>{langName(l)}</span>
        </button>
      ))}
    </div>
  );

  if (run.phase === "ready") {
    return (
      <div className={app.stack} data-testid="flag-tiles">
        <section className={app.stackSm}>
          <p className={app.label}>Daily run · {deck.date}</p>
          <p className={app.muted}>A word falls. Tap the flag of its language before it lands. Speed rises every ten words, and one miss ends the run.</p>
        </section>
        {lanes}
        <div className={app.row}>
          <Button onClick={() => send({ kind: "start" })} data-testid="ft-start">Start run</Button>
          <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
        </div>
        <p className={app.small}>Today&apos;s best: {best}</p>
      </div>
    );
  }

  if (run.phase === "running" && tile) {
    return (
      <div className={app.stack} data-testid="flag-tiles">
        <div className={styles.hudRow}>
          <span className={styles.hudScore} data-testid="ft-score">{run.score}</span>
          <span className={styles.hudRound}>Best {best}</span>
        </div>
        <div className={styles.ftStage} data-testid="ft-stage" data-round="active">
          <div className={styles.ftFall} style={{ top: `${progress * 78}%` }} key={run.index}>
            <TileFace as="div" lang="" plain word={tile.form} rtl={LANGS[tile.lang]?.rtl} attrs={{ "data-testid": "ft-word" }} />
          </div>
          <div className={styles.ftLine} aria-hidden="true" />
        </div>
        {lanes}
        <p className={styles.keysHint}>Tap a flag, or press D F J K</p>
      </div>
    );
  }

  const missedTile = run.missed !== null ? deck.tiles[run.missed % deck.tiles.length] : null;
  const verdict = missedTile ? (
    <section className={styles.verdict} data-result="wrong" data-testid="ft-verdict">
      <p className={styles.verdictHead}>{run.picked === null ? "Too slow" : "Wrong flag"}</p>
      <p className={styles.verdictLine}>
        <span className={styles.verdictKey}>Word</span>
        <span className={styles.pickLabel}>
          <FlagSquare lang={missedTile.lang} size={20} />
          <b>{missedTile.form}</b>
          <span>{langName(missedTile.lang)}</span>
        </span>
      </p>
      <p className={styles.verdictLine}>
        <span className={styles.verdictKey}>Means</span>
        <span className={styles.pickLabel}><b>{missedTile.meaning}</b></span>
      </p>
      {run.picked !== null ? (
        <p className={styles.verdictLine}>
          <span className={styles.verdictKey}>You picked</span>
          <span className={styles.pickLabel}>
            <FlagSquare lang={deck.langs[run.picked]} size={20} />
            <span>{langName(deck.langs[run.picked])}</span>
          </span>
        </p>
      ) : null}
    </section>
  ) : null;

  if (run.phase === "missed") {
    return (
      <div className={app.stack} data-testid="flag-tiles">
        <p className={styles.hudScore} data-testid="ft-score">{run.score}</p>
        {verdict}
        {missedTile ? <WordReveal title="The word that got away" words={[{ lang: missedTile.lang, word: missedTile.form, meaning: missedTile.meaning, correct: false }]} /> : null}
        {adsVisible && !run.continued ? (
          rewarded ? (
            <>
              <Ad placement="rewarded" testId="ad-rewarded" />
              <Button onClick={() => { setRewarded(false); send({ kind: "continue" }); }} data-testid="ft-continue-claim">Continue the run</Button>
            </>
          ) : (
            <div className={app.row}>
              <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="ft-continue-offer">Watch an ad to continue</Button>
              <Button onClick={() => send({ kind: "end" })} data-testid="ft-end">See results</Button>
            </div>
          )
        ) : (
          <Button onClick={() => send({ kind: "end" })} data-testid="ft-end">See results</Button>
        )}
      </div>
    );
  }

  const rows = [...board.map((g) => ({ name: g.name, flag: g.flag, score: g.score, bot: g.skill, me: false })), { name: "You", flag: null as string | null, score: run.score, bot: null as string | null, me: true }].sort((a, b) => b.score - a.score);
  return (
    <div className={app.stack} data-testid="ft-results">
      {interstitial ? (
        <div className={styles.interstitial} role="dialog" aria-modal="true" aria-label="Advertisement" data-testid="interstitial">
          <div className={styles.interstitialBox}>
            <Ad placement="interstitial" testId="ad-interstitial" />
            <Button onClick={() => setInterstitial(false)} data-testid="interstitial-close">Close</Button>
          </div>
        </div>
      ) : null}
      <section className={app.stackSm}>
        <p className={app.label}>Run over</p>
        <h1 className={app.title} data-testid="ft-final">{run.score} {run.score === 1 ? "word" : "words"}</h1>
        <p className={app.small}>Today&apos;s best: {best}</p>
      </section>
      {verdict}
      <section className={app.stackSm}>
        <h2 className={app.fieldLabel}>Today&apos;s board</h2>
        <ol className={styles.players} data-testid="ft-board">
          {rows.map((r) => (
            <li key={r.name} className={styles.player} data-me={r.me}>
              <span>
                {r.flag ? <span aria-hidden="true">{flagEmoji(r.flag)} </span> : null}
                {r.name}
                {r.bot ? <span className={styles.tag}> bot · {r.bot}</span> : null}
              </span>
              <span className={styles.score}>{r.score}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className={app.row}>
        <Button onClick={() => send({ kind: "start" })} data-testid="ft-again">Run again</Button>
        <ButtonLink variant="ghost" size="md" href={LEARN_HREF}>Learn these words</ButtonLink>
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      <WordReveal title="Words in this run" words={deck.tiles.slice(0, Math.min(run.index + 1, 12)).map((t, i) => ({ lang: t.lang, word: t.form, meaning: t.meaning, correct: i !== run.missed }))} />
      <LearnPanel missed={missedTile ? [{ lang: missedTile.lang, word: missedTile.form, meaning: missedTile.meaning }] : []} />
      {readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

export default function FlagTiles() {
  return (
    <GameWorld id="flag-tiles">
      <FlagTilesGame />
    </GameWorld>
  );
}
