"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGS } from "@academy/lang-systems";
import { interstitialDue } from "@/lib/lobby/ads";
import { adjacent, dealer, playable, level as levelOf, matches, points, resolve, rng, SIZE, swapped, type Board, type Cell, type Deal, type Meaning } from "@/lib/lobby/babel";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";

import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { LANG_SETS, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GameWorld, { pieceClass, WorldStage } from "../GameWorld";
import { LearnPanel, WordReveal } from "../Reveal";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

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

function BabelMatchGame() {
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
        setBoard(playable(deal.current));
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
    setBoard(playable(deal.current, out.board));
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
            <Button onClick={() => setInterstitial(false)}>Close</Button>
          </div>
        </div>
      ) : null}
      <section className={app.stackSm}>
        <p className={app.label}>Level {lvl}</p>
        <p className={app.small}>Swap two neighbours. Three words in a line that mean the same thing clear, in any language.</p>
      </section>
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="bm-moves">{moves} moves</span>
        <span className={styles.hudScore} data-testid="bm-progress">{Math.min(cleared.length, goal.goal)} / {goal.goal}</span>
        <span className={styles.hudRound}>{score} pts</span>
      </div>
      {phase === "loading" ? <p className={app.muted} aria-busy="true">Dealing</p> : null}
      {phase !== "loading" ? (
        <WorldStage id="babel-match">
        <div className={styles.bmBoard} style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }} data-testid="bm-board" data-round={phase === "play" ? "active" : undefined}>
          {board.map((c, i) => {
            const m = byId.get(c.meaning);
            const word = m?.forms[c.lang] ?? "";
            return (
              <button
                key={c.key}
                type="button"
                className={`${styles.bmCell} ${pieceClass("azulejo")}`}
                data-picked={picked === i}
                data-shake={shake === i}
                data-long={word.length > 7}
                onClick={() => tap(i)}
                aria-label={`${word}, ${langName(c.lang)}`}
                dir={LANGS[c.lang]?.rtl ? "rtl" : undefined}
                data-testid="bm-cell"
              >
                <FlagSquare lang={c.lang} size={12} />
                <span style={{ "--len": Math.max(4, Array.from(word).length) } as React.CSSProperties}>{word}</span>
              </button>
            );
          })}
        </div>
        </WorldStage>
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
              <Button onClick={() => setLvl((n) => n + 1)} data-testid="bm-next">Next level</Button>
            ) : adsVisible && !extra ? (
              rewarded ? (
                <>
                  <Ad placement="rewarded" testId="ad-rewarded" />
                  <Button onClick={() => { setRewarded(false); setExtra(true); setMoves(5); setPhase("play"); }} data-testid="bm-extra-claim">Take five moves</Button>
                </>
              ) : (
                <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="bm-extra-offer">Watch an ad for five moves</Button>
              )
            ) : null}
            {phase === "lost" ? <Button onClick={() => { setLvl((n) => n); setPhase("loading"); setSet((s) => ({ ...s })); }} data-testid="bm-retry">Try again</Button> : null}
          </div>
        </section>
      ) : null}
      {phase === "won" || phase === "lost" ? (
        <>
          <WordReveal title={`Level ${lvl} words`} words={words.slice(0, 4).flatMap((c) => {
            const m = byId.get(c.meaning);
            return m ? set.targets.filter((l) => m.forms[l]).map((l) => ({ lang: l, word: m.forms[l], meaning: m.meaning })) : [];
          })} />
          <LearnPanel missed={phase === "lost" ? meanings.filter((m) => !words.some((c) => c.meaning === m.id)).slice(0, 4).flatMap((m) => set.targets.filter((l) => m.forms[l]).slice(0, 1).map((l) => ({ lang: l, word: m.forms[l], meaning: m.meaning }))) : []} />
        </>
      ) : null}
      <h2 className={app.fieldLabel}>Languages</h2>
      <div className={styles.chips} role="group" aria-label="Languages">
        {SETS.map((s) => (
          <Pill key={s.id} aria-pressed={s.id === set.id} onClick={() => setSet(s)} data-testid={`bm-set-${s.id}`}>
            {s.targets.map((l) => (
              <FlagSquare key={l} lang={l} size={16} />
            ))}
            {s.targets.map(langName).join(", ")}
          </Pill>
        ))}
      </div>
      <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
    </div>
  );
}

export default function BabelMatch() {
  return (
    <GameWorld id="babel-match">
      <BabelMatchGame />
    </GameWorld>
  );
}
