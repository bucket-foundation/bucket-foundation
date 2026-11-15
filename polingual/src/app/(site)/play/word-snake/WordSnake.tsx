"use client";

import { newArena, respawnMe, seedRand, tick, uniqueWords } from "@/lib/lobby/snake-arena";
import { draw, viewOf } from "./draw";
import GameResults from "../GameResults";
import Interstitial from "../Interstitial";
import { local } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SnakeDeck } from "@academy/word-snake";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { eat, type Arena, type FieldWord } from "@/lib/lobby/snake";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { LANG_CHOICES, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage from "../GamePage";
import { WorldStage } from "../GameWorld";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

const ROUND_MS = 120_000;

type Phase = "setup" | "play" | "dead" | "over";
type Hud = { length: number; left: number };
type Refs = { canvas: MutableRefObject<HTMLCanvasElement | null>; arena: MutableRefObject<Arena | null>; aim: MutableRefObject<number | null>; rand: MutableRefObject<() => number>; endAt: MutableRefObject<number> };

function useCanvasFit(canvas: MutableRefObject<HTMLCanvasElement | null>, phase: Phase) {
  useEffect(() => {
    const c = canvas.current;
    if (phase !== "play" || !c) return;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      c.dataset.dpr = String(dpr);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [phase, canvas]);
}

function useLoop(phase: Phase, deck: SnakeDeck | null, refs: Refs, muted: boolean, setHud: (h: Hud) => void, finish: (dead: boolean) => void) {
  useEffect(() => {
    if (phase !== "play" || !deck) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const out = tick(refs.arena.current as Arena, deck, refs.rand.current, refs.aim.current, dt);
      if (out.sound) play(out.sound, muted);
      const a = out.arena;
      refs.arena.current = a;
      draw(refs.canvas.current, a, deck.lang);
      const me = a.snakes.find((s) => s.id === "me");
      const left = Math.max(0, Math.ceil((refs.endAt.current - Date.now()) / 1000));
      setHud({ length: me?.length ?? 0, left });
      if (left <= 0) return finish(false);
      if (!me?.alive) return finish(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, deck, finish, muted, refs, setHud]);
}

function useBreaks(phase: Phase, adsVisible: boolean, respawned: boolean) {
  const [interstitial, setInterstitial] = useState(false);
  useEffect(() => {
    if (phase !== "over" && phase !== "dead") return;
    if (phase === "dead" && adsVisible && !respawned) return;
    const b = readBreaks(local);
    const games = b.games + 1;
    const now = Date.now();
    const show = adsVisible && interstitialDue(games, b.lastInterstitial, now);
    writeBreaks(local, { games, lastInterstitial: show ? now : b.lastInterstitial });
    if (show) setInterstitial(true);
  }, [phase, adsVisible, respawned]);
  return { interstitial, setInterstitial };
}

function useStart(lang: string, root: string | null, refs: Refs, onDealt: (deck: SnakeDeck) => void) {
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setError(null);
    const others = LANG_CHOICES.filter((l) => l !== lang).slice(0, 5);
    try {
      const res = await fetch(`/api/academy/word-snake?langs=${[lang, ...others].join(",")}&seed=${1 + Math.floor(Math.random() * 1e12)}&root=${root ?? "en"}`);
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { deck: SnakeDeck };
      refs.rand.current = seedRand(Date.now());
      refs.arena.current = eat(newArena(refs.rand.current), d.deck, refs.rand.current);
      refs.endAt.current = Date.now() + ROUND_MS;
      refs.aim.current = null;
      onDealt(d.deck);
    } catch {
      setError("Word Snake could not load. Try again.");
    }
  };
  return { start, error };
}

function useWordSnake() {
  const [lang, setLang] = useState("es");
  const [phase, setPhase] = useState<Phase>("setup");
  const [deck, setDeck] = useState<SnakeDeck | null>(null);
  const [hud, setHud] = useState<Hud>({ length: 0, left: ROUND_MS / 1000 });
  const [result, setResult] = useState<{ eaten: FieldWord[]; bad: FieldWord[]; length: number } | null>(null);
  const [respawned, setRespawned] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [muted, setMuted] = useState(false);
  const refs = useRef<Refs>({ canvas: { current: null }, arena: { current: null }, aim: { current: null }, rand: { current: seedRand(1) }, endAt: { current: 0 } }).current;
  const adsVisible = useAdsVisible();
  const root = useLearnerRoot();

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const { start, error } = useStart(lang, root, refs, (d) => { setDeck(d); setRespawned(false); setResult(null); setPhase("play"); });

  const finish = useCallback((dead: boolean) => {
    const a = refs.arena.current;
    if (!a) return;
    const me = a.snakes.find((s) => s.id === "me");
    setResult({ eaten: a.eaten, bad: a.bad, length: me?.length ?? 0 });
    play(dead ? "miss" : "win", muted);
    setPhase(dead ? "dead" : "over");
  }, [muted, refs]);

  const breaks = useBreaks(phase, adsVisible, respawned);
  useCanvasFit(refs.canvas, phase);
  useLoop(phase, deck, refs, muted, setHud, finish);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const me = refs.arena.current?.snakes.find((s) => s.id === "me");
    const c = refs.canvas.current;
    if (!me || !c) return;
    const r = c.getBoundingClientRect();
    const view = viewOf(c, me);
    const wx = view.x + ((e.clientX - r.left) / r.width) * view.w;
    const wy = view.y + ((e.clientY - r.top) / r.height) * view.h;
    refs.aim.current = Math.atan2(wy - me.body[0].y, wx - me.body[0].x);
  };

  const respawn = () => {
    const a = refs.arena.current;
    if (!a) return;
    refs.arena.current = respawnMe(a);
    refs.endAt.current = Date.now() + Math.max(5_000, hud.left * 1000);
    setRespawned(true);
    setRewarded(false);
    setPhase("play");
  };

  return { lang, setLang, phase, setPhase, deck, hud, result, respawned, rewarded, setRewarded, adsVisible, root, start, error, point, respawn, canvas: refs.canvas, ...breaks };
}

type Game = ReturnType<typeof useWordSnake>;

function Setup({ g }: { g: Game }) {
  return (
    <div className={app.stack} data-testid="word-snake">
      <section className={app.stackSm}>
        <p className={app.label}>Arena</p>
        <p className={app.muted}>Steer with your finger or mouse. Eat words in your language to grow. Words in other languages shrink you. Touch a bigger snake and you are out.</p>
      </section>
      <div className={styles.chips} role="group" aria-label="Room language">
        {LANG_CHOICES.slice(0, 10).map((l) => (
          <Pill key={l} aria-pressed={g.lang === l} onClick={() => g.setLang(l)} data-testid={`ws-lang-${l}`}>
            <FlagSquare lang={l} size={18} />
            {langName(l)}
          </Pill>
        ))}
      </div>
      <div className={app.row}>
        <Button onClick={() => void g.start()} data-testid="ws-start">Play</Button>
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function Playing({ g }: { g: Game }) {
  return (
    <div className={app.stack} data-testid="ws-play">
      <div className={styles.hudRow}>
        <span className={styles.hudScore} data-testid="ws-length">{g.hud.length}</span>
        <span className={styles.hudRound}>Eat {langName(g.deck?.lang ?? "")}</span>
        <span className={styles.hudRound}>{g.hud.left}s</span>
      </div>
      <WorldStage id="word-snake">
        <canvas ref={g.canvas} data-round="active" className={styles.wsCanvas} onPointerMove={g.point} onPointerDown={g.point} data-testid="ws-canvas" />
      </WorldStage>
    </div>
  );
}

function WordList({ words, testId, line }: { words: FieldWord[]; testId?: string; line: (w: FieldWord) => string }) {
  return (
    <ul className={styles.vaList} data-testid={testId}>
      {uniqueWords(words).map((w) => (
        <li key={`${w.lang}:${w.form}`} className={styles.pickLabel}>
          <FlagSquare lang={w.lang} size={16} />
          <b>{w.form}</b>
          <span>{line(w)}</span>
        </li>
      ))}
    </ul>
  );
}

function Results({ g }: { g: Game }) {
  const { phase, adsVisible, respawned, rewarded, setRewarded, result } = g;
  return (
    <div className={app.stack} data-testid="ws-results">
      <Interstitial open={g.interstitial} onClose={() => g.setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>{phase === "dead" ? "Swallowed" : "Time is up"}</p>
        <h2 className={app.title} data-testid="ws-final">{`Length ${result?.length ?? 0}`}</h2>
      </section>
      {phase === "dead" && adsVisible && !respawned ? (
        rewarded ? (
          <>
            <Ad placement="rewarded" testId="ad-rewarded" />
            <Button onClick={g.respawn} data-testid="ws-respawn-claim">Respawn at this size</Button>
          </>
        ) : (
          <div className={app.row}>
            <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="ws-respawn-offer">Watch an ad to respawn</Button>
            <Button onClick={() => g.setPhase("over")} data-testid="ws-end">See results</Button>
          </div>
        )
      ) : null}
      {phase === "over" || respawned || !adsVisible ? (
        <GameResults rootLang={g.root ?? "en"} title="Words you ate" words={uniqueWords(result?.eaten ?? []).slice(0, 12).map((w) => ({ lang: w.lang, word: w.form, meaning: w.meaning }))} missed={uniqueWords(result?.bad ?? []).map((w) => ({ lang: w.lang, word: w.form, meaning: w.meaning }))} />
      ) : null}
      <section className={app.stackSm}>
        <h2 className={app.fieldLabel}>Words you ate</h2>
        <WordList words={result?.eaten ?? []} testId="ws-eaten" line={(w) => w.meaning} />
        {result?.bad.length ? (
          <>
            <h2 className={app.fieldLabel}>Decoys</h2>
            <WordList words={result.bad} line={(w) => `${langName(w.lang)} · ${w.meaning}`} />
          </>
        ) : null}
      </section>
      <div className={app.row}>
        <Button onClick={() => void g.start()} data-testid="ws-again">Play again</Button>
        <Button variant="quiet" size="sm" onClick={() => g.setPhase("setup")}>Change language</Button>
      </div>
      {phase === "over" && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

function WordSnakeGame() {
  const g = useWordSnake();
  if (g.phase === "setup") return <Setup g={g} />;
  if (g.phase === "play") return <Playing g={g} />;
  return <Results g={g} />;
}

export default function WordSnake() {
  return <GamePage id="word-snake">{() => <WordSnakeGame />}</GamePage>;
}
