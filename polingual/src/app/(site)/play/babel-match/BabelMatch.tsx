"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGS } from "@academy/lang-systems";
import { interstitialDue } from "@/lib/lobby/ads";
import { adjacent, dealer, fresh, level as levelOf, matches, points, resolve, rng, SIZE, swapped, type Board, type Cell, type Deal, type Meaning } from "@/lib/lobby/babel";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { LEARN_HREF } from "@/lib/lobby/client";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { LANG_SETS, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../play.module.css";

const LEVEL_KEY = "polingual-web/babel-level/v1";
const SETS = LANG_SETS.filter((s) => s.targets.length >= 3).map((s) => ({ ...s, targets: s.targets.slice(0, 3) }));

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Phase = "loading" | "play" | "won" | "lost" | "error";

export default function BabelMatch() {
  const [set, setSet] = useState(SETS[0]);
  const [lvl, setLvl] = useState(1);
  const [meanings, setMeanings] = useState<Meaning[]>([]);
  const [board, setBoard] = useState<Board>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [cleared, setCleared] = useState<Cell[]>([]);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [extra, setExtra] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const [shake, setShake] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const deal = useRef<Deal | null>(null);
  const adsVisible = useAdsVisible();
  const goal = levelOf(lvl);

  useEffect(() => {
    setMuted(readMuted(() => window.localStorage));
    try {
      const n = Number(local()?.getItem(LEVEL_KEY));
      if (Number.isInteger(n) && n > 0) setLvl(n);
    } catch {
    }
  }, []);

  useEffect(() => {
    let stop = false;
    setPhase("loading");
    fetch(`/api/academy/babel?langs=${set.targets.join(",")}&level=${lvl}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { meanings: Meaning[] }) => {
        if (stop) return;
        const rand = rng(lvl * 7919 + set.id.length);
        deal.current = dealer(d.meanings, set.targets, rand, 0);
        setMeanings(d.meanings);
        setBoard(fresh(deal.current));
        setMoves(levelOf(lvl).moves);
        setCleared([]);
        setScore(0);
        setExtra(false);
        setPicked(null);
        setPhase("play");
      })
      .catch(() => !stop && setPhase("error"));
    return () => {
      stop = true;
    };
  }, [lvl, set]);

  const byId = useMemo(() => new Map(meanings.map((m) => [m.id, m])), [meanings]);

  const finish = (won: boolean) => {
    setPhase(won ? "won" : "lost");
    play(won ? "win" : "miss", muted);
    if (!won) return;
    try {
      local()?.setItem(LEVEL_KEY, String(lvl + 1));
    } catch {
    }
    const b = readBreaks(local);
    const games = b.games + 1;
    const now = Date.now();
    const show = adsVisible && lvl >= 10 && interstitialDue(games, b.lastInterstitial, now);
    writeBreaks(local, { games, lastInterstitial: show ? now : b.lastInterstitial });
    if (show) setInterstitial(true);
  };

  const tap = (i: number) => {
    if (phase !== "play" || !deal.current) return;
    if (picked === null) {
      setPicked(i);
      return;
    }
    if (picked === i) {
      setPicked(null);
      return;
    }
    if (!adjacent(picked, i)) {
      setPicked(i);
      return;
    }
    const trial = swapped(board, picked, i);
    setPicked(null);
    if (!matches(trial).size) {
      setShake(i);
      play("tap", muted);
      window.setTimeout(() => setShake(null), 300);
      return;
    }
    const out = resolve(trial, deal.current);
    play("hit", muted);
    const nextCleared = [...cleared, ...out.cleared];
    const left = moves - 1;
    setBoard(out.board);
    setCleared(nextCleared);
    setScore((s) => s + points(out.cleared.length, out.cascades));
    setMoves(left);
    if (nextCleared.length >= goal.goal) finish(true);
    else if (left <= 0) finish(false);
  };

  const words = Array.from(new Map(cleared.map((c) => [`${c.meaning}`, c])).values());

  if (phase === "error") return <p className={app.error} role="alert">Babel Match could not load. Try again in a minute.</p>;

  return (
    <div className={app.stack} data-testid="babel">
      {interstitial ? (
        <div className={styles.interstitial} role="dialog" aria-modal="true" aria-label="Advertisement" data-testid="interstitial">
          <div className={styles.interstitialBox}>
            <Ad placement="interstitial" testId="ad-interstitial" />
            <button type="button" className={app.cta} onClick={() => setInterstitial(false)}>Close</button>
          </div>
        </div>
      ) : null}
      <section className={app.stackSm}>
        <p className={app.label}>Level {lvl}</p>
        <h1 className={app.title}>Babel Match</h1>
        <p className={app.small}>Swap two neighbours. Three words in a line that mean the same thing clear, in any language.</p>
      </section>
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="bm-moves">{moves} moves</span>
        <span className={styles.hudScore} data-testid="bm-progress">{Math.min(cleared.length, goal.goal)} / {goal.goal}</span>
        <span className={styles.hudRound}>{score} pts</span>
      </div>
      {phase === "loading" ? <p className={app.muted} aria-busy="true">Dealing</p> : null}
      {phase !== "loading" ? (
        <div className={styles.bmBoard} style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }} data-testid="bm-board">
          {board.map((c, i) => {
            const m = byId.get(c.meaning);
            const word = m?.forms[c.lang] ?? "";
            return (
              <button
                key={c.key}
                type="button"
                className={styles.bmCell}
                data-picked={picked === i}
                data-shake={shake === i}
                data-long={word.length > 7}
                onClick={() => tap(i)}
                aria-label={`${word}, ${langName(c.lang)}`}
                dir={LANGS[c.lang]?.rtl ? "rtl" : undefined}
                data-testid="bm-cell"
              >
                <FlagSquare lang={c.lang} size={12} />
                <span>{word}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {phase === "won" || phase === "lost" ? (
        <section className={styles.verdict} data-result={phase === "won" ? "right" : "wrong"} data-testid="bm-verdict">
          <p className={styles.verdictHead}>{phase === "won" ? `Level ${lvl} cleared` : "Out of moves"}</p>
          <ul className={styles.vaList}>
            {words.map((c) => {
              const m = byId.get(c.meaning);
              return m ? (
                <li key={c.meaning} className={styles.pickLabel}>
                  <b>{m.meaning}</b>
                  <span>{set.targets.map((l) => m.forms[l]).join(" · ")}</span>
                </li>
              ) : null;
            })}
          </ul>
          <div className={app.row}>
            {phase === "won" ? (
              <button type="button" className={app.cta} onClick={() => setLvl((n) => n + 1)} data-testid="bm-next">Next level</button>
            ) : adsVisible && !extra ? (
              rewarded ? (
                <>
                  <Ad placement="rewarded" testId="ad-rewarded" />
                  <button type="button" className={app.cta} onClick={() => { setRewarded(false); setExtra(true); setMoves(5); setPhase("play"); }} data-testid="bm-extra-claim">Take five moves</button>
                </>
              ) : (
                <button type="button" className={app.ghost} onClick={() => setRewarded(true)} data-testid="bm-extra-offer">Watch an ad for five moves</button>
              )
            ) : null}
            {phase === "lost" ? <button type="button" className={app.cta} onClick={() => { setLvl((n) => n); setPhase("loading"); setSet((s) => ({ ...s })); }} data-testid="bm-retry">Try again</button> : null}
            <a className={app.ghost} href={LEARN_HREF}>Learn these words</a>
          </div>
        </section>
      ) : null}
      <h2 className={app.fieldLabel}>Languages</h2>
      <div className={styles.chips} role="group" aria-label="Languages">
        {SETS.map((s) => (
          <button key={s.id} type="button" className={styles.chip} aria-pressed={s.id === set.id} onClick={() => setSet(s)} data-testid={`bm-set-${s.id}`}>
            {s.targets.map((l) => (
              <FlagSquare key={l} lang={l} size={16} />
            ))}
            {s.targets.map(langName).join(", ")}
          </button>
        ))}
      </div>
      <a className={app.ghost} href="/play">Lobbies</a>
    </div>
  );
}
