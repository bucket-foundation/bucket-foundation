"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SnakeDeck } from "@academy/word-snake";
import { BOTS } from "@academy/lobby-bots";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { LEARN_HREF } from "@/lib/lobby/client";
import { advance, botTarget, collide, eat, makeSnake, WORLD_H, WORLD_W, type Arena, type FieldWord, type Snake } from "@/lib/lobby/snake";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { LANG_CHOICES, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../play.module.css";

const ROUND_MS = 120_000;
const COLORS = ["#3B6FB6", "#E9A23B", "#7A4FA0", "#2E8B57", "#C2410C"];
const SKILL: Record<string, number> = { easy: 0.55, medium: 0.8, hard: 0.95 };

type Phase = "setup" | "play" | "dead" | "over";

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function seedRand(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

function newArena(rand: () => number): Arena {
  const bots = BOTS.slice(0, 4).map((b, i) => makeSnake(b.userId, b.name, true, SKILL[b.skill] ?? 0.8, { x: 200 + rand() * 1200, y: 150 + rand() * 700 }, rand() * 6.28, COLORS[i + 1]));
  return { snakes: [makeSnake("me", "You", false, 1, { x: WORLD_W / 2, y: WORLD_H / 2 }, 0, "#9B2414"), ...bots], words: [], nextWord: 0, eaten: [], bad: [] };
}

export default function WordSnake() {
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

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const start = async () => {
    setError(null);
    const others = LANG_CHOICES.filter((l) => l !== lang).slice(0, 5);
    try {
      const res = await fetch(`/api/academy/word-snake?langs=${[lang, ...others].join(",")}&seed=${1 + Math.floor(Math.random() * 1e12)}`);
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
      if (!me?.alive) return finish(true);
      if (left <= 0) return finish(false);
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
    endAt.current = Date.now() + Math.max(20_000, hud.left * 1000);
    setRespawned(true);
    setRewarded(false);
    setPhase("play");
  };

  if (phase === "setup") {
    return (
      <div className={app.stack} data-testid="word-snake">
        <section className={app.stackSm}>
          <p className={app.label}>Arena</p>
          <h1 className={app.title}>Word Snake</h1>
          <p className={app.muted}>Steer with your finger or mouse. Eat words in your language to grow. Words in other languages shrink you. Touch a bigger snake and you are out.</p>
        </section>
        <div className={styles.chips} role="group" aria-label="Room language">
          {LANG_CHOICES.slice(0, 10).map((l) => (
            <button key={l} type="button" className={styles.chip} aria-pressed={lang === l} onClick={() => setLang(l)} data-testid={`ws-lang-${l}`}>
              <FlagSquare lang={l} size={18} />
              {langName(l)}
            </button>
          ))}
        </div>
        <div className={app.row}>
          <button type="button" className={app.cta} onClick={() => void start()} data-testid="ws-start">Play</button>
          <a className={app.ghost} href="/play">Lobbies</a>
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
        <canvas ref={canvas} className={styles.wsCanvas} onPointerMove={point} onPointerDown={point} data-testid="ws-canvas" />
      </div>
    );
  }

  const list = (words: FieldWord[]) => Array.from(new Map(words.map((w) => [`${w.lang}:${w.form}`, w])).values());
  return (
    <div className={app.stack} data-testid="ws-results">
      {interstitial ? (
        <div className={styles.interstitial} role="dialog" aria-modal="true" aria-label="Advertisement" data-testid="interstitial">
          <div className={styles.interstitialBox}>
            <Ad placement="interstitial" testId="ad-interstitial" />
            <button type="button" className={app.cta} onClick={() => setInterstitial(false)}>Close</button>
          </div>
        </div>
      ) : null}
      <section className={app.stackSm}>
        <p className={app.label}>{phase === "dead" ? "Swallowed" : "Time is up"}</p>
        <h1 className={app.title} data-testid="ws-final">{`Length ${result?.length ?? 0}`}</h1>
      </section>
      {phase === "dead" && adsVisible && !respawned ? (
        rewarded ? (
          <>
            <Ad placement="rewarded" testId="ad-rewarded" />
            <button type="button" className={app.cta} onClick={respawn} data-testid="ws-respawn-claim">Respawn at this size</button>
          </>
        ) : (
          <div className={app.row}>
            <button type="button" className={app.ghost} onClick={() => setRewarded(true)} data-testid="ws-respawn-offer">Watch an ad to respawn</button>
            <button type="button" className={app.cta} onClick={() => setPhase("over")} data-testid="ws-end">See results</button>
          </div>
        )
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
        <button type="button" className={app.cta} onClick={() => void start()} data-testid="ws-again">Play again</button>
        <a className={app.ghost} href={LEARN_HREF}>Learn these words</a>
        <button type="button" className={app.link} onClick={() => setPhase("setup")}>Change language</button>
      </div>
      {phase === "over" && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

function viewOf(c: HTMLCanvasElement, me: Snake): { x: number; y: number; w: number; h: number } {
  const dpr = Number(c.dataset.dpr ?? 1);
  const w = Math.min(WORLD_W, c.width / dpr);
  const h = Math.min(WORLD_H, c.height / dpr);
  const x = Math.max(0, Math.min(WORLD_W - w, me.body[0].x - w / 2));
  const y = Math.max(0, Math.min(WORLD_H - h, me.body[0].y - h / 2));
  return { x, y, w, h };
}

function draw(c: HTMLCanvasElement | null, a: Arena, lang: string) {
  const ctx = c?.getContext("2d");
  const me = a.snakes.find((s) => s.id === "me");
  if (!c || !ctx || !me) return;
  const v = viewOf(c, me);
  const dpr = Number(c.dataset.dpr ?? 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#F6EEDC";
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.strokeStyle = "rgba(0,0,0,.06)";
  ctx.lineWidth = 1;
  for (let gx = -(v.x % 50); gx < v.w; gx += 50) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, v.h);
    ctx.stroke();
  }
  ctx.font = "bold 16px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const w of a.words) {
    const x = w.x - v.x;
    const y = w.y - v.y;
    if (x < -80 || y < -30 || x > v.w + 80 || y > v.h + 30) continue;
    const tw = ctx.measureText(w.form).width + 16;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(35,31,32,.25)";
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - 14, tw, 28, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#231F20";
    ctx.fillText(w.form, x, y);
  }
  for (const s of a.snakes) {
    if (!s.alive) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    s.body.forEach((p, i) => (i ? ctx.lineTo(p.x - v.x, p.y - v.y) : ctx.moveTo(p.x - v.x, p.y - v.y)));
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.body[0].x - v.x, s.body[0].y - v.y, 4, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = "#231F20";
    ctx.font = "bold 12px Nunito, sans-serif";
    ctx.fillText(`${s.name} ${s.length}`, s.body[0].x - v.x, s.body[0].y - v.y - 18);
    ctx.font = "bold 16px Nunito, sans-serif";
  }
  ctx.fillStyle = "rgba(35,31,32,.5)";
  ctx.font = "bold 12px Nunito, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Eat ${lang.toUpperCase()}`, 10, 14);
}
