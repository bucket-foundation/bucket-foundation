"use client";

import GameResults from "../GameResults";
import Interstitial from "../Interstitial";
import { local } from "@/lib/storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { LANGS } from "@academy/lang-systems";
import { interstitialDue } from "@/lib/lobby/ads";
import { dealer, playable, level as levelOf, matches, points, resolve, rng, seenMeanings, SIZE, swapped, tapStep, type Board, type Cell, type Deal, type Meaning } from "@/lib/lobby/babel";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { LANG_SETS, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage from "../GamePage";
import { pieceClass, WorldStage } from "../GameWorld";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

const LEVEL_KEY = "polingual-web/babel-level/v1";
const SETS = LANG_SETS.filter((s) => s.targets.length >= 3).map((s) => ({ ...s, targets: s.targets.slice(0, 3) }));

type Phase = "loading" | "play" | "won" | "lost" | "error";
type LangSet = (typeof SETS)[number];

function useBabelLevel(set: LangSet, root: string | null) {
  const [lvl, setLvl] = useState(1);
  const [meanings, setMeanings] = useState<Meaning[]>([]);
  const [board, setBoard] = useState<Board>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [cleared, setCleared] = useState<Cell[]>([]);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [extra, setExtra] = useState(false);
  const deal = useRef<Deal | null>(null);

  useEffect(() => {
    try {
      const n = Number(local()?.getItem(LEVEL_KEY));
      if (Number.isInteger(n) && n > 0) setLvl(n);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!root) return;
    let stop = false;
    setPhase("loading");
    fetch(`/api/academy/babel?langs=${set.targets.join(",")}&level=${lvl}&root=${root}`)
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
  }, [lvl, set, root]);

  return { lvl, setLvl, meanings, board, setBoard, picked, setPicked, moves, setMoves, cleared, setCleared, score, setScore, phase, setPhase, extra, setExtra, deal };
}

function useBabel() {
  const [set, setSet] = useState(SETS[0]);
  const [rewarded, setRewarded] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const [shake, setShake] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const adsVisible = useAdsVisible();
  const root = useLearnerRoot();
  const g = useBabelLevel(set, root);
  const { lvl, phase, setPhase } = g;
  const goal = levelOf(lvl);

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

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
    if (phase !== "play" || !g.deal.current) return;
    const step = tapStep(g.picked, i);
    if ("pick" in step) return g.setPicked(step.pick);
    const trial = swapped(g.board, step.swap[0], i);
    g.setPicked(null);
    if (!matches(trial).size) {
      setShake(i);
      play("tap", muted);
      window.setTimeout(() => setShake(null), 300);
      return;
    }
    const out = resolve(trial, g.deal.current);
    play("hit", muted);
    const nextCleared = [...g.cleared, ...out.cleared];
    const left = g.moves - 1;
    g.setBoard(playable(g.deal.current, out.board));
    g.setCleared(nextCleared);
    g.setScore((s) => s + points(out.cleared.length, out.cascades));
    g.setMoves(left);
    if (nextCleared.length >= goal.goal) finish(true);
    else if (left <= 0) finish(false);
  };

  return { ...g, set, setSet, rewarded, setRewarded, interstitial, setInterstitial, shake, adsVisible, root, goal, tap };
}

type Game = ReturnType<typeof useBabel>;

function Cells({ g, byId }: { g: Game; byId: Map<string, Meaning> }) {
  return (
    <div className={styles.bmBoard} style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }} data-testid="bm-board" data-round={g.phase === "play" ? "active" : undefined}>
      {g.board.map((c, i) => {
        const word = byId.get(c.meaning)?.forms[c.lang] ?? "";
        return (
          <Button bare key={c.key} className={`${styles.bmCell} ${pieceClass("azulejo")}`} data-picked={g.picked === i} data-shake={g.shake === i} data-long={word.length > 7} onClick={() => g.tap(i)} aria-label={`${word}, ${langName(c.lang)}`} dir={LANGS[c.lang]?.rtl ? "rtl" : undefined} data-testid="bm-cell">
            <FlagSquare lang={c.lang} size={12} />
            <span style={{ "--len": Math.max(4, Array.from(word).length) } as React.CSSProperties}>{word}</span>
          </Button>
        );
      })}
    </div>
  );
}

function Verdict({ g, byId, words }: { g: Game; byId: Map<string, Meaning>; words: Cell[] }) {
  const { phase, lvl, set, adsVisible, extra, rewarded, setRewarded } = g;
  return (
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
          <Button onClick={() => g.setLvl((n) => n + 1)} data-testid="bm-next">Next level</Button>
        ) : adsVisible && !extra ? (
          rewarded ? (
            <>
              <Ad placement="rewarded" testId="ad-rewarded" />
              <Button onClick={() => { setRewarded(false); g.setExtra(true); g.setMoves(5); g.setPhase("play"); }} data-testid="bm-extra-claim">Take five moves</Button>
            </>
          ) : (
            <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="bm-extra-offer">Watch an ad for five moves</Button>
          )
        ) : null}
        {phase === "lost" ? <Button onClick={() => { g.setLvl((n) => n); g.setPhase("loading"); g.setSet((s) => ({ ...s })); }} data-testid="bm-retry">Try again</Button> : null}
      </div>
    </section>
  );
}

function Results({ g, byId, words }: { g: Game; byId: Map<string, Meaning>; words: Cell[] }) {
  const { set } = g;
  return (
    <GameResults rootLang={g.root ?? "en"} title={`Level ${g.lvl} words`} words={words.slice(0, 4).flatMap((c) => {
      const m = byId.get(c.meaning);
      return m ? set.targets.filter((l) => m.forms[l]).map((l) => ({ lang: l, word: m.forms[l], meaning: m.meaning })) : [];
    })} missed={g.phase === "lost" ? g.meanings.filter((m) => !words.some((c) => c.meaning === m.id)).slice(0, 4).flatMap((m) => set.targets.filter((l) => m.forms[l]).slice(0, 1).map((l) => ({ lang: l, word: m.forms[l], meaning: m.meaning }))) : []} />
  );
}

function SetPicker({ g }: { g: Game }) {
  return (
    <div className={styles.chips} role="group" aria-label="Languages">
      {SETS.map((s) => (
        <Pill key={s.id} aria-pressed={s.id === g.set.id} onClick={() => g.setSet(s)} data-testid={`bm-set-${s.id}`}>
          {s.targets.map((l) => (
            <FlagSquare key={l} lang={l} size={16} />
          ))}
          {s.targets.map(langName).join(", ")}
        </Pill>
      ))}
    </div>
  );
}

function BabelMatchGame({ g }: { g: Game }) {
  const byId = useMemo(() => new Map(g.meanings.map((m) => [m.id, m])), [g.meanings]);
  const words = seenMeanings(g.cleared);
  const over = g.phase === "won" || g.phase === "lost";
  return (
    <div className={app.stack} data-testid="babel">
      <Interstitial open={g.interstitial} onClose={() => g.setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>Level {g.lvl}</p>
        <p className={app.small}>Swap two neighbours. Three words in a line that mean the same thing clear, in any language.</p>
      </section>
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="bm-moves">{g.moves} moves</span>
        <span className={styles.hudScore} data-testid="bm-progress">{Math.min(g.cleared.length, g.goal.goal)} / {g.goal.goal}</span>
        <span className={styles.hudRound}>{g.score} pts</span>
      </div>
      {g.phase === "loading" ? <p className={app.muted} aria-busy="true">Dealing</p> : <WorldStage id="babel-match"><Cells g={g} byId={byId} /></WorldStage>}
      {over ? <Verdict g={g} byId={byId} words={words} /> : null}
      {over ? <Results g={g} byId={byId} words={words} /> : null}
      <h2 className={app.fieldLabel}>Languages</h2>
      <SetPicker g={g} />
      <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
    </div>
  );
}

export default function BabelMatch() {
  const g = useBabel();
  return (
    <GamePage id="babel-match" status={g.phase === "error" ? { error: "Babel Match could not load. Try again in a minute." } : null}>
      {() => <BabelMatchGame g={g} />}
    </GamePage>
  );
}
