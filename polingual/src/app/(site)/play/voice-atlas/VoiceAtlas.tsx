"use client";

import GameResults from "../GameResults";
import { local } from "@/lib/storage";
import { useEffect, useState } from "react";
import { ATLAS_HOMES, ATLAS_ROUNDS, nearestHome, type AtlasGhost, type AtlasRound, type LatLon } from "@academy/voice-atlas";
import { addStamp, guessPoints, stamped } from "@/lib/lobby/atlas-play";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { flagEmoji } from "@/lib/lobby/client";
import { boardRows } from "@/lib/lobby/flag-run";
import { bcp47, play as speak } from "@/lib/speak";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage, { type GameStatus } from "../GamePage";
import { pieceClass } from "../GameWorld";
import { WordReveal } from "../Reveal";
import styles from "../play.module.css";
import { Button, ButtonLink, Tag } from "@/ui";
import AtlasMap from "./AtlasMap";

const PASSPORT_KEY = "polingual-web/passport/v1";

type Guess = { round: AtlasRound; pin: LatLon; home: LatLon; km: number; points: number };

function stamp(lang: string): string[] {
  try {
    const s = local();
    const next = addStamp(JSON.parse(s?.getItem(PASSPORT_KEY) ?? "[]"), lang);
    s?.setItem(PASSPORT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [lang];
  }
}

function useAtlasDay(root: string | null) {
  const [rounds, setRounds] = useState<AtlasRound[] | null>(null);
  const [board, setBoard] = useState<AtlasGhost[]>([]);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passport, setPassport] = useState<string[]>([]);
  useEffect(() => {
    if (!root) return;
    try {
      setPassport(JSON.parse(local()?.getItem(PASSPORT_KEY) ?? "[]"));
    } catch {
    }
    fetch(`/api/academy/voice-atlas?root=${root}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { date: string; rounds: AtlasRound[]; ghosts: AtlasGhost[] }) => {
        setRounds(d.rounds);
        setBoard(d.ghosts);
        setDate(d.date);
      })
      .catch(() => setError("Voice Atlas could not load. Try again in a minute."));
  }, [root]);
  return { rounds, board, date, error, passport, setPassport };
}

function useVoiceAtlas() {
  const root = useLearnerRoot();
  const day = useAtlasDay(root);
  const [index, setIndex] = useState(0);
  const [pin, setPin] = useState<LatLon | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [limit, setLimit] = useState(ATLAS_ROUNDS);
  const [rewarded, setRewarded] = useState(false);
  const [counted, setCounted] = useState(false);
  const [peek, setPeek] = useState(false);
  const adsVisible = useAdsVisible();

  const round = day.rounds?.[index] ?? null;
  const guessed = guesses.find((g) => g.round === round) ?? null;
  const done = index >= limit;
  const total = guesses.reduce((n, g) => n + g.points, 0);
  const daily = guesses.slice(0, ATLAS_ROUNDS).reduce((n, g) => n + g.points, 0);

  useEffect(() => {
    if (!done || counted) return;
    setCounted(true);
    const b = readBreaks(local);
    writeBreaks(local, { ...b, games: b.games + 1 });
  }, [done, counted]);

  const listen = () => round && void speak({ id: `atlas:${index}`, text: round.form, lang: bcp47(round.lang) });

  const lock = () => {
    if (!round || !pin) return;
    const near = nearestHome(round.lang, pin);
    if (!near) return;
    const points = guessPoints(near.km, peek);
    setGuesses((g) => [...g, { round, pin, home: near.home, km: near.km, points }]);
    if (stamped(points)) day.setPassport(stamp(round.lang));
  };

  const next = () => {
    setPin(null);
    setPeek(false);
    setIndex((i) => i + 1);
  };

  return { ...day, root, index, pin, setPin, guesses, limit, setLimit, rewarded, setRewarded, peek, setPeek, adsVisible, round, guessed, done, total, daily, listen, lock, next };
}

type Game = ReturnType<typeof useVoiceAtlas>;

function Passport({ passport }: { passport: string[] }) {
  return (
    <section className={app.stackSm}>
      <h2 className={app.fieldLabel}>Passport</h2>
      <p className={app.small}>{`${passport.length} of ${Object.keys(ATLAS_HOMES).length} languages stamped`}</p>
      <div className={styles.chips} data-testid="va-passport">
        {passport.map((l) => (
          <Tag key={l}><FlagSquare lang={l} size={18} />{langName(l)}</Tag>
        ))}
      </div>
    </section>
  );
}

function Board({ board, score }: { board: AtlasGhost[]; score: number }) {
  return (
    <section className={app.stackSm}>
      <h2 className={app.fieldLabel}>Today&apos;s board</h2>
      <ol className={styles.players} data-testid="va-board">
        {boardRows(board, score).map((r) => (
          <li key={r.name} className={styles.player} data-me={r.me}>
            <span>
              {r.flag ? <span aria-hidden="true">{flagEmoji(r.flag)} </span> : null}
              {r.name}
              {r.bot ? <span className={styles.tag}> bot · {r.bot}</span> : null}
            </span>
            <span className={styles.score}>{r.score.toLocaleString("en")}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Guesses({ guesses }: { guesses: Guess[] }) {
  return (
    <ul className={styles.vaList}>
      {guesses.map((g, i) => (
        <li key={i} className={styles.player}>
          <span className={styles.pickLabel}>
            <FlagSquare lang={g.round.lang} size={20} />
            <b>{g.round.form}</b>
            <span>{langName(g.round.lang)} · {g.round.meaning}</span>
          </span>
          <span className={styles.score}>{g.points}</span>
        </li>
      ))}
    </ul>
  );
}

function Results({ g, rounds }: { g: Game; rounds: AtlasRound[] }) {
  const { adsVisible, limit, rewarded, setRewarded, setLimit, guesses } = g;
  return (
    <div className={app.stack} data-testid="va-results">
      <section className={app.stackSm}>
        <p className={app.label}>Voice Atlas · {g.date}</p>
        <h2 className={app.title} data-testid="va-total">{`${g.total.toLocaleString("en")} points`}</h2>
      </section>
      <GameResults rootLang={g.root ?? "en"} title="Today's voices" words={guesses.map((x) => ({ lang: x.round.lang, word: x.round.form, meaning: x.round.meaning, correct: stamped(x.points) }))} missed={guesses.filter((x) => !stamped(x.points)).map((x) => ({ lang: x.round.lang, word: x.round.form, meaning: x.round.meaning }))} />
      <Guesses guesses={guesses} />
      <Passport passport={g.passport} />
      <Board board={g.board} score={g.daily} />
      <div className={app.row}>
        {adsVisible && limit === ATLAS_ROUNDS && rounds.length > ATLAS_ROUNDS ? (
          rewarded ? (
            <Button onClick={() => { setRewarded(false); setLimit(ATLAS_ROUNDS + 1); }} data-testid="va-extra-claim">Play the extra round</Button>
          ) : (
            <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="va-extra-offer">Watch an ad for an extra round</Button>
          )
        ) : null}
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      {rewarded ? <Ad placement="rewarded" testId="ad-rewarded" /> : null}
      {readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

function Verdict({ g, round, guessed }: { g: Game; round: AtlasRound; guessed: Guess }) {
  return (
    <section className={styles.verdict} data-result={stamped(guessed.points) ? "right" : "wrong"} data-testid="va-verdict">
      <p className={styles.verdictHead}>+{guessed.points} · {Math.round(guessed.km).toLocaleString("en")} km away</p>
      <p className={styles.verdictLine}>
        <span className={styles.verdictKey}>Language</span>
        <span className={styles.pickLabel}><FlagSquare lang={round.lang} size={20} /><span>{langName(round.lang)}</span></span>
      </p>
      <p className={styles.verdictLine}>
        <span className={styles.verdictKey}>Means</span>
        <span className={styles.pickLabel}><b>{round.meaning}</b></span>
      </p>
      <WordReveal rootLang={g.root ?? "en"} title={`Round ${g.index + 1}`} words={[{ lang: round.lang, word: round.form, meaning: round.meaning }]} />
      <Button onClick={g.next} data-testid="va-next">{g.guesses.length >= g.limit ? "See results" : "Next round"}</Button>
    </section>
  );
}

function Round({ g, round }: { g: Game; round: AtlasRound }) {
  const { guessed } = g;
  return (
    <div className={app.stack} data-testid="voice-atlas" data-round={guessed ? "reveal" : "active"}>
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="va-round">Round {g.index + 1} of {g.limit}</span>
        <span className={styles.hudScore}>{g.total.toLocaleString("en")}</span>
      </div>
      <section className={styles.vaPrompt}>
        <Button onClick={g.listen} data-testid="va-listen">▶ Listen</Button>
        {g.peek || guessed ? (
          <b className={`${styles.promptWord} ${pieceClass("ticket")}`} data-testid="va-word">{round.form}</b>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => g.setPeek(true)} data-testid="va-peek">Show the word, half points</Button>
        )}
        <p className={app.small}>Where is this language spoken? Tap the map, then lock in.</p>
      </section>
      <AtlasMap pin={g.pin} home={guessed?.home ?? null} onPin={guessed ? null : g.setPin} />
      {guessed ? <Verdict g={g} round={round} guessed={guessed} /> : <Button disabled={!g.pin} onClick={g.lock} data-testid="va-lock">Lock in</Button>}
    </div>
  );
}

export default function VoiceAtlas() {
  const g = useVoiceAtlas();
  const status: GameStatus = g.error ? { error: g.error } : !g.rounds || (!g.round && !g.done) ? { loading: "Loading today's voices" } : null;
  return (
    <GamePage id="voice-atlas" status={status}>
      {() => (g.rounds && g.done ? <Results g={g} rounds={g.rounds} /> : g.round ? <Round g={g} round={g.round} /> : null)}
    </GamePage>
  );
}
