"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { displayNickname, MARKS, type Standing } from "@/lib/stoa/client";
import { loadMix, Stage, type Mix } from "@/lib/stoa/stage";
import { Glyph } from "./parts";
import styles from "./stoa.module.css";
import { Button, Pill } from "@/ui";

export function useStage(fallback: Mix) {
  const stage = useRef<Stage | null>(null);
  const [mix, setMixState] = useState<Mix>(fallback);
  const [ready, setReady] = useState(false);
  if (!stage.current) stage.current = new Stage(fallback);

  useEffect(() => {
    const m = loadMix(fallback);
    stage.current!.mix = m;
    setMixState(m);
    const s = stage.current!;
    s.onReady = setReady;
    return () => {
      s.stop();
      s.onReady = null;
    };
  }, []);

  const unlock = useCallback(() => {
    stage.current!.unlock();
  }, []);

  const setMix = useCallback((m: Mix) => {
    stage.current!.setMix(m);
    setMixState(m);
  }, []);

  return { stage: stage.current, mix, setMix, ready, unlock };
}

export function MixBar({ mix, setMix, ready, unlock, full }: { mix: Mix; setMix: (m: Mix) => void; ready: boolean; unlock: () => void; full: boolean }) {
  if (!ready)
    return (
      <Button variant="accent" size="sm" onClick={unlock} data-testid="sound-on">
        <span aria-hidden="true">♪</span> Sound on
      </Button>
    );
  const t = (k: keyof Mix, label: string) => (
    <Pill size="sm" aria-pressed={mix[k]} onClick={() => setMix({ ...mix, [k]: !mix[k] })} data-testid={`mix-${k}`}>
      {label}
    </Pill>
  );
  return (
    <div className={styles.mix} role="group" aria-label="Sound">
      {full ? t("music", "Music") : null}
      {full ? t("voice", "Narrator") : null}
      {t("sfx", full ? "Effects" : "Sound")}
    </div>
  );
}

export function TimerRing({ left, total, paused }: { left: number; total: number; paused: boolean }) {
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const tone = left <= 3 ? "hot" : left <= 5 ? "warm" : "calm";
  return (
    <div className={styles.ring} data-tone={tone} data-testid="timer-ring" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className={styles.ringTrack} />
        <circle cx="50" cy="50" r={r} className={styles.ringFill} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span key={left} className={styles.ringNum}>{paused ? "II" : left}</span>
    </div>
  );
}

const COLORS = ["#1F4E9A", "#D9381E", "#1E7A5A", "#E9A23B", "#5B1A4A", "#F6EEDC"];

export function Confetti({ burst = 160, testId = "confetti" }: { burst?: number; testId?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof window === "undefined") return;
    if (!window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const w = () => canvas.width;
    const h = () => canvas.height;
    const bits = Array.from({ length: burst }, () => ({
      x: w() * (0.2 + Math.random() * 0.6),
      y: h() * 0.35,
      vx: (Math.random() - 0.5) * 18 * dpr,
      vy: (-8 - Math.random() * 14) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      s: (6 + Math.random() * 8) * dpr,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w(), h());
      for (const b of bits) {
        b.vy += 0.35 * dpr;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.r += b.vr;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        ctx.restore();
      }
      if (frame < 260) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w(), h());
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [burst]);
  return <canvas ref={ref} className={styles.confetti} aria-hidden="true" data-testid={testId} />;
}

export function Podium({ rows }: { rows: Standing[] }) {
  const order = [rows[1], rows[0], rows[2]];
  return (
    <ol className={styles.podium} data-testid="podium">
      {order.map((r, i) =>
        r ? (
          <li key={r.player_id} data-place={i === 1 ? 1 : i === 0 ? 2 : 3}>
            <span className={styles.podiumName}>{displayNickname(r.nickname)}</span>
            <span className={styles.podiumPts}>{r.points}</span>
            <span className={styles.podiumStep}>{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
          </li>
        ) : (
          <li key={`empty-${i}`} data-place={i === 1 ? 1 : i === 0 ? 2 : 3} data-empty="true" />
        ),
      )}
    </ol>
  );
}

export function Drift() {
  return (
    <div className={styles.drift} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const m = MARKS[i % 4];
        return (
          <span key={i} className={styles.driftGlyph} data-pigment={m.pigment} style={{ left: `${(i * 83) % 100}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${16 + (i % 5) * 3}s` }}>
            <Glyph glyph={m.glyph} />
          </span>
        );
      })}
    </div>
  );
}
