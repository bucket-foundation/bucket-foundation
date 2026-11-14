"use client";

import GameResults from "../GameResults";
import Interstitial from "../Interstitial";
import { local } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SnakeDeck } from "@academy/word-snake";
import { BOTS } from "@academy/lobby-bots";
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
import { Button, ButtonLink, Pill, tokens } from "@/ui";

const ROUND_MS = 120_000;
const COLORS = [tokens.color.lapis, tokens.color.ochre, tokens.color.maya, tokens.color.malachite, tokens.color.vermilion];
const SKILL: Record<string, number> = { easy: 0.55, medium: 0.8, hard: 0.95 };

type Phase = "setup" | "play" | "dead" | "over";


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
  return { snakes: [makeSnake("me", "You", false, 1, { x: WORLD_W / 2, y: WORLD_H / 2 }, 0, tokens.color.card), ...bots], words: [], nextWord: 0, eaten: [], bad: [] };
}

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

function viewOf(c: HTMLCanvasElement, me: Snake): { x: number; y: number; w: number; h: number } {
  const dpr = Number(c.dataset.dpr ?? 1);
  const w = Math.min(WORLD_W, c.width / dpr);
  const h = Math.min(WORLD_H, c.height / dpr);
  const x = Math.max(0, Math.min(WORLD_W - w, me.body[0].x - w / 2));
  const y = Math.max(0, Math.min(WORLD_H - h, me.body[0].y - h / 2));
  return { x, y, w, h };
}

const C = tokens.color;
const KENTE: [number, number, number, number][] = [
  [0, 22, WORLD_W, 22],
  [0, WORLD_H - 22, WORLD_W, WORLD_H - 22],
  [22, 0, 22, WORLD_H],
  [WORLD_W - 22, 0, WORLD_W - 22, WORLD_H],
];
function kente(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, v: { x: number; y: number }) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(x0 - v.x, y0 - v.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = 0.5;
  const band = [C.ochre, C.malachite, C.ochre, C.vermilion, C.ochre, C.ink];
  for (let x = 0; x < len; x += 36) {
    ctx.fillStyle = band[Math.floor(x / 36) % band.length];
    ctx.fillRect(x, -22, 36, 44);
  }
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, -3, len, 6);
  ctx.restore();
}

function brush(ctx: CanvasRenderingContext2D, s: Snake, v: { x: number; y: number }) {
  const pts = s.body.map((p) => ({ x: p.x - v.x, y: p.y - v.y }));
  const n = pts.length;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pass of [0, 1, 2]) {
    for (let i = n - 1; i > 0; i--) {
      const t = 1 - i / n;
      const w = 6 + 14 * Math.sqrt(t);
      ctx.strokeStyle = pass === 0 ? C.ink : pass === 1 ? s.color : C.paper;
      ctx.globalAlpha = pass === 2 ? 0.28 : 1;
      ctx.lineWidth = pass === 0 ? w + 4 : pass === 1 ? w : Math.max(1.5, w * 0.18);
      ctx.beginPath();
      const o = pass === 2 ? w * 0.22 : 0;
      ctx.moveTo(pts[i].x + o, pts[i].y - o);
      ctx.lineTo(pts[i - 1].x + o, pts[i - 1].y - o);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const h = pts[0];
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(h.x - 4, h.y - 3, 3.5, 0, 6.29);
  ctx.arc(h.x + 4, h.y - 3, 3.5, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(h.x - 4, h.y - 3, 1.6, 0, 6.29);
  ctx.arc(h.x + 4, h.y - 3, 1.6, 0, 6.29);
  ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, tilt: number) {
  const tw = ctx.measureText(text).width + 20;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(-tw / 2 + 4, -12, tw, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C["paper-2"];
  ctx.beginPath();
  ctx.moveTo(-tw / 2, -15);
  for (let k = 1; k <= 8; k++) ctx.lineTo(-tw / 2 + (tw * k) / 8, -15 + (k % 2 ? 3 : -1));
  ctx.lineTo(tw / 2 - 2, 14);
  for (let k = 7; k >= 0; k--) ctx.lineTo(-tw / 2 + (tw * k) / 8, 14 + (k % 2 ? -3 : 1));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.tyrian;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function draw(c: HTMLCanvasElement | null, a: Arena, lang: string) {
  const ctx = c?.getContext("2d");
  const me = a.snakes.find((s) => s.id === "me");
  if (!c || !ctx || !me) return;
  const v = viewOf(c, me);
  const dpr = Number(c.dataset.dpr ?? 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.tyrian;
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.strokeStyle = C.maya;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  for (let gx = -(v.x % 90); gx < v.w + 90; gx += 90) {
    for (let gy = -(v.y % 90); gy < v.h + 90; gy += 90) {
      ctx.strokeRect(gx + 27, gy + 27, 36, 36);
      ctx.save();
      ctx.translate(gx + 45, gy + 45);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  for (const [x0, y0, x1, y1] of KENTE) kente(ctx, x0, y0, x1, y1, v);
  ctx.strokeStyle = C.ochre;
  ctx.lineWidth = 6;
  ctx.strokeRect(-v.x + 3, -v.y + 3, WORLD_W - 6, WORLD_H - 6);
  ctx.font = "800 16px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const w of a.words) {
    const x = w.x - v.x;
    const y = w.y - v.y;
    if (x < -80 || y < -30 || x > v.w + 80 || y > v.h + 30) continue;
    label(ctx, x, y, w.form, ((w.id % 7) - 3) * 0.03);
  }
  for (const s of a.snakes) {
    if (!s.alive) continue;
    brush(ctx, s, v);
    ctx.fillStyle = C.paper;
    ctx.font = "800 12px Nunito, sans-serif";
    ctx.fillText(`${s.name} ${s.length}`, s.body[0].x - v.x, s.body[0].y - v.y - 22);
    ctx.font = "800 16px Nunito, sans-serif";
  }
  ctx.fillStyle = C.paper;
  ctx.font = "700 12px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`EAT ${lang.toUpperCase()}`, 12, 16);
}

export default function WordSnake() {
  return (
    <GameWorld id="word-snake">
      <WordSnakeGame />
    </GameWorld>
  );
}
