"use client";

import { useEffect, useMemo, useState } from "react";
import land from "world-atlas/land-110m.json";
import { atlasPoints, ATLAS_HOMES, ATLAS_MAX, ATLAS_ROUNDS, nearestHome, type AtlasGhost, type AtlasRound, type LatLon } from "@academy/voice-atlas";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { flagEmoji, LEARN_HREF } from "@/lib/lobby/client";
import { landPath, MAP_H, MAP_W, project, unproject, type Topology } from "@/lib/lobby/world";
import { bcp47, play as speak } from "@/lib/speak";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GameWorld, { pieceClass, WorldStage } from "../GameWorld";
import { LearnPanel, WordReveal } from "../Reveal";
import styles from "../play.module.css";
import { Button, ButtonLink, Tag } from "@/ui";

const LAND = landPath(land as unknown as Topology);
const PASSPORT_KEY = "polingual-web/passport/v1";

type Guess = { round: AtlasRound; pin: LatLon; home: LatLon; km: number; points: number };

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function stamp(lang: string): string[] {
  try {
    const s = local();
    const have: string[] = JSON.parse(s?.getItem(PASSPORT_KEY) ?? "[]");
    const next = have.includes(lang) ? have : [...have, lang];
    s?.setItem(PASSPORT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [lang];
  }
}

function VoiceAtlasGame() {
  const [rounds, setRounds] = useState<AtlasRound[] | null>(null);
  const [board, setBoard] = useState<AtlasGhost[]>([]);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [pin, setPin] = useState<LatLon | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [limit, setLimit] = useState(ATLAS_ROUNDS);
  const [passport, setPassport] = useState<string[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [counted, setCounted] = useState(false);
  const [peek, setPeek] = useState(false);
  const adsVisible = useAdsVisible();

  useEffect(() => {
    try {
      setPassport(JSON.parse(local()?.getItem(PASSPORT_KEY) ?? "[]"));
    } catch {
    }
    fetch("/api/academy/voice-atlas")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { date: string; rounds: AtlasRound[]; ghosts: AtlasGhost[] }) => {
        setRounds(d.rounds);
        setBoard(d.ghosts);
        setDate(d.date);
      })
      .catch(() => setError("Voice Atlas could not load. Try again in a minute."));
  }, []);

  const round = rounds?.[index] ?? null;
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

  const onMap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (guessed) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MAP_W;
    const y = ((e.clientY - r.top) / r.height) * MAP_H;
    setPin(unproject(x, y));
  };

  const lock = () => {
    if (!round || !pin) return;
    const near = nearestHome(round.lang, pin);
    if (!near) return;
    const points = Math.round(atlasPoints(near.km) / (peek ? 2 : 1));
    setGuesses((g) => [...g, { round, pin, home: near.home, km: near.km, points }]);
    if (points >= ATLAS_MAX * 0.5) setPassport(stamp(round.lang));
  };

  const next = () => {
    setPin(null);
    setPeek(false);
    setIndex((i) => i + 1);
  };

  const map = useMemo(
    () => (
      <path d={LAND} className={styles.vaLand} />
    ),
    [],
  );

  if (error) return <p className={app.error} role="alert">{error}</p>;
  if (!rounds || (!round && !done)) return <p className={app.muted} aria-busy="true">Loading today&apos;s voices</p>;

  if (done) {
    const rows = [...board.map((g) => ({ name: g.name, flag: g.flag as string | null, score: g.score, bot: g.skill as string | null, me: false })), { name: "You", flag: null, score: daily, bot: null, me: true }].sort((a, b) => b.score - a.score);
    return (
      <div className={app.stack} data-testid="va-results">
        <section className={app.stackSm}>
          <p className={app.label}>Voice Atlas · {date}</p>
          <h1 className={app.title} data-testid="va-total">{`${total.toLocaleString("en")} points`}</h1>
        </section>
        <WordReveal title="Today's voices" words={guesses.map((g) => ({ lang: g.round.lang, word: g.round.form, meaning: g.round.meaning, correct: g.points >= ATLAS_MAX * 0.5 }))} />
        <LearnPanel missed={guesses.filter((g) => g.points < ATLAS_MAX * 0.5).map((g) => ({ lang: g.round.lang, word: g.round.form, meaning: g.round.meaning }))} />
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
        <section className={app.stackSm}>
          <h2 className={app.fieldLabel}>Passport</h2>
          <p className={app.small}>{`${passport.length} of ${Object.keys(ATLAS_HOMES).length} languages stamped`}</p>
          <div className={styles.chips} data-testid="va-passport">
            {passport.map((l) => (
              <Tag key={l}><FlagSquare lang={l} size={18} />{langName(l)}</Tag>
            ))}
          </div>
        </section>
        <section className={app.stackSm}>
          <h2 className={app.fieldLabel}>Today&apos;s board</h2>
          <ol className={styles.players} data-testid="va-board">
            {rows.map((r) => (
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
        <div className={app.row}>
          {adsVisible && limit === ATLAS_ROUNDS && rounds.length > ATLAS_ROUNDS ? (
            rewarded ? (
              <Button onClick={() => { setRewarded(false); setLimit(ATLAS_ROUNDS + 1); }} data-testid="va-extra-claim">Play the extra round</Button>
            ) : (
              <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="va-extra-offer">Watch an ad for an extra round</Button>
            )
          ) : null}
          <ButtonLink href={LEARN_HREF}>Learn these words</ButtonLink>
          <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
        </div>
        {rewarded ? <Ad placement="rewarded" testId="ad-rewarded" /> : null}
        {readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
      </div>
    );
  }

  if (!round) return null;
  const [hx, hy] = guessed ? project(guessed.home[1], guessed.home[0]) : [0, 0];
  const [px, py] = pin ? project(pin[1], pin[0]) : [0, 0];
  return (
    <div className={app.stack} data-testid="voice-atlas" data-round={guessed ? "reveal" : "active"}>
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="va-round">Round {index + 1} of {limit}</span>
        <span className={styles.hudScore}>{total.toLocaleString("en")}</span>
      </div>
      <section className={styles.vaPrompt}>
        <Button onClick={listen} data-testid="va-listen">▶ Listen</Button>
        {peek || guessed ? (
          <b className={`${styles.promptWord} ${pieceClass("ticket")}`} data-testid="va-word">{round.form}</b>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => setPeek(true)} data-testid="va-peek">Show the word, half points</Button>
        )}
        <p className={app.small}>Where is this language spoken? Tap the map, then lock in.</p>
      </section>
      <WorldStage id="voice-atlas">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={styles.vaMap} onPointerDown={onMap} role="img" aria-label="World map" data-testid="va-map">
        {map}
        {guessed ? <line x1={px} y1={py} x2={hx} y2={hy} className={styles.vaLine} /> : null}
        {pin ? (
          <g transform={`translate(${px} ${py}) rotate(-8)`} className={styles.vaStamp}>
            <rect x={-9} y={-9} width={18} height={18} rx={3} />
            <rect x={-6} y={-6} width={12} height={12} rx={2} className={styles.vaStampInner} />
          </g>
        ) : null}
        {guessed ? (
          <g transform={`translate(${hx} ${hy})`} className={styles.vaHome}>
            <path d="M0 -11l3.2 7.8 7.8 3.2-7.8 3.2-3.2 7.8-3.2-7.8-7.8-3.2 7.8-3.2z" />
          </g>
        ) : null}
      </svg>
      </WorldStage>
      {guessed ? (
        <section className={styles.verdict} data-result={guessed.points >= ATLAS_MAX * 0.5 ? "right" : "wrong"} data-testid="va-verdict">
          <p className={styles.verdictHead}>+{guessed.points} · {Math.round(guessed.km).toLocaleString("en")} km away</p>
          <p className={styles.verdictLine}>
            <span className={styles.verdictKey}>Language</span>
            <span className={styles.pickLabel}><FlagSquare lang={round.lang} size={20} /><span>{langName(round.lang)}</span></span>
          </p>
          <p className={styles.verdictLine}>
            <span className={styles.verdictKey}>Means</span>
            <span className={styles.pickLabel}><b>{round.meaning}</b></span>
          </p>
          <WordReveal title={`Round ${index + 1}`} words={[{ lang: round.lang, word: round.form, meaning: round.meaning }]} />
          <Button onClick={next} data-testid="va-next">{guesses.length >= limit ? "See results" : "Next round"}</Button>
        </section>
      ) : (
        <Button disabled={!pin} onClick={lock} data-testid="va-lock">Lock in</Button>
      )}
    </div>
  );
}

export default function VoiceAtlas() {
  return (
    <GameWorld id="voice-atlas">
      <VoiceAtlasGame />
    </GameWorld>
  );
}
