"use client";

import GameResults from "../GameResults";
import Interstitial from "../Interstitial";
import { local } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { type FlagTilesDeck, type Ghost } from "@academy/flag-tiles";
import { LANGS } from "@academy/lang-systems";
import { TileFace } from "@/app/tile";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { flagEmoji } from "@/lib/lobby/client";
import { boardRows, laneState, readBest, START, step, writeBest, type RunEvent, type RunState } from "@/lib/lobby/flag-run";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage, { type GameStatus } from "../GamePage";
import { WorldStage } from "../GameWorld";
import { WordReveal } from "../Reveal";
import { useFall, useLaneKeys } from "./hooks";
import styles from "../play.module.css";
import { Button, ButtonLink } from "@/ui";

type Tile = FlagTilesDeck["tiles"][number];

function useFlagDeck(root: string | null) {
  const [deck, setDeck] = useState<FlagTilesDeck | null>(null);
  const [board, setBoard] = useState<Ghost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!root) return;
    setMuted(readMuted(() => window.localStorage));
    fetch(`/api/academy/flag-tiles?root=${root}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { deck: FlagTilesDeck; ghosts: Ghost[] }) => {
        setDeck(d.deck);
        setBoard(d.ghosts);
        setBest(readBest(local, d.deck.date));
      })
      .catch(() => setError("Flag Tiles could not load. Try again in a minute."));
  }, [root]);
  return { deck, board, error, best, setBest, muted };
}

function useFlagTiles() {
  const [run, setRun] = useState(START);
  const [rewarded, setRewarded] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const adsVisible = useAdsVisible();
  const root = useLearnerRoot();
  const { deck, board, error, best, setBest, muted } = useFlagDeck(root);
  const counted = useRef(-1);
  const runs = useRef(0);

  const tile = deck && run.phase !== "ready" ? deck.tiles[(run.missed ?? run.index) % deck.tiles.length] : null;
  const answer = tile && deck ? deck.langs.indexOf(tile.lang) : -1;

  const send = useCallback((e: RunEvent) => {
    if (e.kind === "start") runs.current += 1;
    setRun((s) => step(s, e));
  }, []);
  const progress = useFall(run, send);

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
  }, [run.phase, deck, run.score, muted, adsVisible, setBest]);

  const tap = useCallback(
    (lane: number) => {
      if (run.phase !== "running" || answer < 0) return;
      play(lane === answer ? "hit" : "tap", muted);
      send({ kind: "tap", lane, answer });
    },
    [run.phase, answer, muted, send],
  );
  useLaneKeys(tap);

  return { run, rewarded, setRewarded, interstitial, setInterstitial, adsVisible, root, deck, board, error, best, tile, answer, send, progress, tap };
}

type Game = ReturnType<typeof useFlagTiles>;
type Ready = Game & { deck: FlagTilesDeck };

function Lanes({ g }: { g: Ready }) {
  return (
    <div className={styles.ftLanes} role="group" aria-label="Language lanes">
      {g.deck.langs.map((l, i) => (
        <button key={l} type="button" className={styles.ftLane} onPointerDown={(e) => { e.preventDefault(); g.tap(i); }} data-state={laneState(g.run, i, g.answer)} data-testid="ft-lane" aria-label={langName(l)}>
          <FlagSquare lang={l} size={40} />
          <span>{langName(l)}</span>
        </button>
      ))}
    </div>
  );
}

function ReadyView({ g }: { g: Ready }) {
  return (
    <div className={app.stack} data-testid="flag-tiles">
      <section className={app.stackSm}>
        <p className={app.label}>Daily run · {g.deck.date}</p>
        <p className={app.muted}>A word falls. Tap the flag of its language before it lands. Speed rises every ten words, and one miss ends the run.</p>
      </section>
      <Lanes g={g} />
      <div className={app.row}>
        <Button onClick={() => g.send({ kind: "start" })} data-testid="ft-start">Start run</Button>
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      <p className={app.small}>Today&apos;s best: {g.best}</p>
    </div>
  );
}

function Running({ g, tile }: { g: Ready; tile: Tile }) {
  return (
    <div className={app.stack} data-testid="flag-tiles">
      <div className={styles.hudRow}>
        <span className={styles.hudScore} data-testid="ft-score">{g.run.score}</span>
        <span className={styles.hudRound}>Best {g.best}</span>
      </div>
      <WorldStage id="flag-tiles">
        <div className={styles.ftStage} data-testid="ft-stage" data-round="active">
          <div className={styles.ftFall} style={{ top: `${g.progress * 78}%` }} key={g.run.index}>
            <TileFace as="div" lang="" plain word={tile.form} rtl={LANGS[tile.lang]?.rtl} attrs={{ "data-testid": "ft-word" }} />
          </div>
          <div className={styles.ftLine} aria-hidden="true" />
        </div>
        <Lanes g={g} />
      </WorldStage>
      <p className={styles.keysHint}>Tap a flag, or press D F J K</p>
    </div>
  );
}

function VerdictLine({ k, children }: { k: string; children: ReactNode }) {
  return (
    <p className={styles.verdictLine}>
      <span className={styles.verdictKey}>{k}</span>
      <span className={styles.pickLabel}>{children}</span>
    </p>
  );
}

function Verdict({ g, missedTile }: { g: Ready; missedTile: Tile }) {
  const { run, deck } = g;
  return (
    <section className={styles.verdict} data-result="wrong" data-testid="ft-verdict">
      <p className={styles.verdictHead}>{run.picked === null ? "Too slow" : "Wrong flag"}</p>
      <VerdictLine k="Word">
        <FlagSquare lang={missedTile.lang} size={20} />
        <b>{missedTile.form}</b>
        <span>{langName(missedTile.lang)}</span>
      </VerdictLine>
      <VerdictLine k="Means"><b>{missedTile.meaning}</b></VerdictLine>
      {run.picked !== null ? (
        <VerdictLine k="You picked">
          <FlagSquare lang={deck.langs[run.picked]} size={20} />
          <span>{langName(deck.langs[run.picked])}</span>
        </VerdictLine>
      ) : null}
    </section>
  );
}

function Missed({ g, missedTile }: { g: Ready; missedTile: Tile | null }) {
  const { adsVisible, run, rewarded, setRewarded, send } = g;
  return (
    <div className={app.stack} data-testid="flag-tiles">
      <p className={styles.hudScore} data-testid="ft-score">{run.score}</p>
      {missedTile ? <Verdict g={g} missedTile={missedTile} /> : null}
      {missedTile ? <WordReveal rootLang={g.root ?? "en"} title="The word that got away" words={[{ lang: missedTile.lang, word: missedTile.form, meaning: missedTile.meaning, correct: false }]} /> : null}
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

function Board({ g }: { g: Ready }) {
  return (
    <section className={app.stackSm}>
      <h2 className={app.fieldLabel}>Today&apos;s board</h2>
      <ol className={styles.players} data-testid="ft-board">
        {boardRows(g.board, g.run.score).map((r) => (
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
  );
}

function RunOver({ g, missedTile }: { g: Ready; missedTile: Tile | null }) {
  const { run, deck } = g;
  return (
    <div className={app.stack} data-testid="ft-results">
      <Interstitial open={g.interstitial} onClose={() => g.setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>Run over</p>
        <h2 className={app.title} data-testid="ft-final">{run.score} {run.score === 1 ? "word" : "words"}</h2>
        <p className={app.small}>Today&apos;s best: {g.best}</p>
      </section>
      {missedTile ? <Verdict g={g} missedTile={missedTile} /> : null}
      <Board g={g} />
      <div className={app.row}>
        <Button onClick={() => g.send({ kind: "start" })} data-testid="ft-again">Run again</Button>
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      <GameResults rootLang={g.root ?? "en"} title="Words in this run" words={deck.tiles.slice(0, Math.min(run.index + 1, 12)).map((t, i) => ({ lang: t.lang, word: t.form, meaning: t.meaning, correct: i !== run.missed }))} missed={missedTile ? [{ lang: missedTile.lang, word: missedTile.form, meaning: missedTile.meaning }] : []} ad />
    </div>
  );
}

function FlagTilesGame({ g }: { g: Ready }) {
  const { run, deck, tile } = g;
  if (run.phase === "ready") return <ReadyView g={g} />;
  if (run.phase === "running" && tile) return <Running g={g} tile={tile} />;
  const missedTile = run.missed !== null ? deck.tiles[run.missed % deck.tiles.length] : null;
  if (run.phase === "missed") return <Missed g={g} missedTile={missedTile} />;
  return <RunOver g={g} missedTile={missedTile} />;
}

export default function FlagTiles() {
  const g = useFlagTiles();
  const status: GameStatus = g.error ? { error: g.error } : !g.deck ? { loading: "Loading today's tiles" } : null;
  return <GamePage id="flag-tiles" status={status}>{() => g.deck && <FlagTilesGame g={{ ...g, deck: g.deck }} />}</GamePage>;
}
