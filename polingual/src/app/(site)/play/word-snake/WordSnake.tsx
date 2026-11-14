"use client";

import { newArena, seedRand } from "@/lib/lobby/snake-arena";
import { draw, viewOf } from "./draw";
import GameResults from "../GameResults";
import Interstitial from "../Interstitial";
import { local } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SnakeDeck } from "@academy/word-snake";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";

import { advance, botTarget, collide, eat, makeSnake, WORLD_H, WORLD_W, type Arena, type FieldWord, type Snake } from "@/lib/lobby/snake";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { LANG_CHOICES, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GameWorld, { WorldStage } from "../GameWorld";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

const ROUND_MS = 120_000;

type Phase = "setup" | "play" | "dead" | "over";


function WordSnakeGame() {
  const [lang, setLang] = useState("es");
  const [phase, setPhase] = useState<Phase>("setup");
  const [deck, setDeck] = useState<SnakeDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState({ length: 0, left: ROUND_MS / 1000 });
  const [result, setResult] = useState<{ eaten: FieldWord[]; bad: FieldWord[]; length: number } | null>(null);
  const [respawned, setRespawned] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const [muted, setMuted] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const arena = useRef<Arena | null>(null);
  const aim = useRef<number | null>(null);
  const rand = useRef(seedRand(1));
  const endAt = useRef(0);
  const adsVisible = useAdsVisible();
  const root = useLearnerRoot();

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const start = async () => {
    setError(null);
    const others = LANG_CHOICES.filter((l) => l !== lang).slice(0, 5);
    try {
      const res = await fetch(`/api/academy/word-snake?langs=${[lang, ...others].join(",")}&seed=${1 + Math.floor(Math.random() * 1e12)}&root=${root ?? "en"}`);
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { deck: SnakeDeck };
      rand.current = seedRand(Date.now());
      setDeck(d.deck);
      arena.current = eat(newArena(rand.current), d.deck, rand.current);
      endAt.current = Date.now() + ROUND_MS;
      aim.current = null;
      setRespawned(false);
      setResult(null);
      setPhase("play");
    } catch {
      setError("Word Snake could not load. Try again.");
    }
  };

  const finish = useCallback(
    (dead: boolean) => {
      const a = arena.current;
      if (!a) return;
      const me = a.snakes.find((s) => s.id === "me");
      setResult({ eaten: a.eaten, bad: a.bad, length: me?.length ?? 0 });
      play(dead ? "miss" : "win", muted);
      if (dead) {
        setPhase("dead");
        return;
      }
      setPhase("over");
    },
    [muted],
  );

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
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || !deck) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      let a = arena.current as Arena;
      a = {
        ...a,
        snakes: a.snakes.map((s: Snake) => {
          if (!s.alive) return s;
          const target = s.bot ? botTarget(s, a.words, rand.current) : aim.current ?? s.angle;
          return advance(s, target, dt);
        }),
      };
      const goodBefore = a.eaten.length;
      const badBefore = a.bad.length;
      a = eat(a, deck, rand.current);
      if (a.bad.length > badBefore) play("miss", muted);
      else if (a.eaten.length > goodBefore) play("hit", muted);
      const c = collide(a);
      a = {
        ...c.arena,
        snakes: c.arena.snakes.map((s) => (s.bot && !s.alive ? makeSnake(s.id, s.name, true, s.skill, { x: 100 + rand.current() * 1400, y: 100 + rand.current() * 800 }, rand.current() * 6.28, s.color) : s)),
      };
      arena.current = a;
      draw(canvas.current, a, deck.lang);
      const me = a.snakes.find((s) => s.id === "me");
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setHud({ length: me?.length ?? 0, left });
      if (left <= 0) return finish(false);
      if (!me?.alive) return finish(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, deck, finish, muted]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = arena.current;
    const me = a?.snakes.find((s) => s.id === "me");
    const c = canvas.current;
    if (!me || !c) return;
    const r = c.getBoundingClientRect();
    const view = viewOf(c, me);
    const wx = view.x + ((e.clientX - r.left) / r.width) * view.w;
    const wy = view.y + ((e.clientY - r.top) / r.height) * view.h;
    aim.current = Math.atan2(wy - me.body[0].y, wx - me.body[0].x);
  };

  const respawn = () => {
    const a = arena.current;
    if (!a) return;
    const me = a.snakes.find((s) => s.id === "me");
    arena.current = { ...a, snakes: a.snakes.map((s) => (s.id === "me" ? { ...makeSnake("me", "You", false, 1, { x: WORLD_W / 2, y: WORLD_H / 2 }, 0, s.color), length: me?.length ?? s.length } : s)) };
    endAt.current = Date.now() + Math.max(5_000, hud.left * 1000);
    setRespawned(true);
    setRewarded(false);
    setPhase("play");
  };

  if (phase === "setup") {
    return (
      <div className={app.stack} data-testid="word-snake">
        <section className={app.stackSm}>
          <p className={app.label}>Arena</p>
          <p className={app.muted}>Steer with your finger or mouse. Eat words in your language to grow. Words in other languages shrink you. Touch a bigger snake and you are out.</p>
        </section>
        <div className={styles.chips} role="group" aria-label="Room language">
          {LANG_CHOICES.slice(0, 10).map((l) => (
            <Pill key={l} aria-pressed={lang === l} onClick={() => setLang(l)} data-testid={`ws-lang-${l}`}>
              <FlagSquare lang={l} size={18} />
              {langName(l)}
            </Pill>
          ))}
        </div>
        <div className={app.row}>
          <Button onClick={() => void start()} data-testid="ws-start">Play</Button>
          <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
        </div>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  if (phase === "play") {
    return (
      <div className={app.stack} data-testid="ws-play">
        <div className={styles.hudRow}>
          <span className={styles.hudScore} data-testid="ws-length">{hud.length}</span>
          <span className={styles.hudRound}>Eat {langName(deck?.lang ?? "")}</span>
          <span className={styles.hudRound}>{hud.left}s</span>
        </div>
        <WorldStage id="word-snake">
          <canvas ref={canvas} data-round="active" className={styles.wsCanvas} onPointerMove={point} onPointerDown={point} data-testid="ws-canvas" />
        </WorldStage>
      </div>
    );
  }

  const list = (words: FieldWord[]) => Array.from(new Map(words.map((w) => [`${w.lang}:${w.form}`, w])).values());
  return (
    <div className={app.stack} data-testid="ws-results">
      <Interstitial open={interstitial} onClose={() => setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>{phase === "dead" ? "Swallowed" : "Time is up"}</p>
        <h2 className={app.title} data-testid="ws-final">{`Length ${result?.length ?? 0}`}</h2>
      </section>
      {phase === "dead" && adsVisible && !respawned ? (
        rewarded ? (
          <>
            <Ad placement="rewarded" testId="ad-rewarded" />
            <Button onClick={respawn} data-testid="ws-respawn-claim">Respawn at this size</Button>
          </>
        ) : (
          <div className={app.row}>
            <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="ws-respawn-offer">Watch an ad to respawn</Button>
            <Button onClick={() => setPhase("over")} data-testid="ws-end">See results</Button>
          </div>
        )
      ) : null}
      {phase === "over" || respawned || !adsVisible ? (
        <>
          <GameResults rootLang={root ?? "en"} title="Words you ate" words={list(result?.eaten ?? []).slice(0, 12).map((w) => ({ lang: w.lang, word: w.form, meaning: w.meaning }))} missed={list(result?.bad ?? []).map((w) => ({ lang: w.lang, word: w.form, meaning: w.meaning }))} />
        </>
      ) : null}
      <section className={app.stackSm}>
        <h2 className={app.fieldLabel}>Words you ate</h2>
        <ul className={styles.vaList} data-testid="ws-eaten">
          {list(result?.eaten ?? []).map((w) => (
            <li key={`${w.lang}:${w.form}`} className={styles.pickLabel}>
              <FlagSquare lang={w.lang} size={16} />
              <b>{w.form}</b>
              <span>{w.meaning}</span>
            </li>
          ))}
        </ul>
        {result?.bad.length ? (
          <>
            <h2 className={app.fieldLabel}>Decoys</h2>
            <ul className={styles.vaList}>
              {list(result.bad).map((w) => (
                <li key={`${w.lang}:${w.form}`} className={styles.pickLabel}>
                  <FlagSquare lang={w.lang} size={16} />
                  <b>{w.form}</b>
                  <span>{`${langName(w.lang)} · ${w.meaning}`}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <div className={app.row}>
        <Button onClick={() => void start()} data-testid="ws-again">Play again</Button>
        <Button variant="quiet" size="sm" onClick={() => setPhase("setup")}>Change language</Button>
      </div>
      {phase === "over" && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

export default function WordSnake() {
  return (
    <GameWorld id="word-snake">
      <WordSnakeGame />
    </GameWorld>
  );
}
