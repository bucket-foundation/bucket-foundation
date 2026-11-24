"use client";

import { useEffect, useRef, useState } from "react";
import { SilentSwitch, StreakFlame } from "@/ui";
import { play, type Cue } from "@/lib/lobby/sound";
import { applyReward, dayKey, EMPTY_REWARD, readReward, REWARD_EVENT, writeReward, type RewardKind, type RewardState } from "@/lib/reward";
import s from "./reward.module.css";

const CUE: Record<RewardKind, Cue> = { hit: "hit", save: "tap", miss: "miss", "round-end": "win" };
const CONFETTI = ["var(--pl-vermilion)", "var(--pl-ochre)", "var(--pl-malachite)", "var(--pl-lapis)", "var(--pl-maya)", "var(--pl-paper)"];

type Pop = { id: number; gained: number; combo: number };

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function Confetti({ burst }: { burst: number }) {
  if (!burst) return null;
  return (
    <div className={s.confetti} key={burst} aria-hidden="true" data-testid="confetti">
      {Array.from({ length: 48 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i % 12) * 40}ms`,
            ["--drift" as string]: `${((i * 53) % 120) - 60}px`,
            ["--spin" as string]: `${(i * 97) % 720}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function RewardLayer() {
  const [state, setState] = useState<RewardState>(EMPTY_REWARD);
  const [pops, setPops] = useState<Pop[]>([]);
  const [burst, setBurst] = useState(0);
  const ref = useRef(EMPTY_REWARD);
  const seq = useRef(0);

  useEffect(() => {
    ref.current = readReward(store());
    setState(ref.current);
    const onReward = (e: Event) => {
      const kind = (e as CustomEvent<RewardKind>).detail;
      const step = applyReward(ref.current, kind, dayKey(new Date()));
      ref.current = step.state;
      writeReward(store(), step.state);
      setState(step.state);
      play(CUE[kind], false);
      if (kind === "round-end") setBurst((b) => b + 1);
      if (step.gained > 0) {
        const id = ++seq.current;
        setPops((p) => [...p.slice(-3), { id, gained: step.gained, combo: step.state.combo }]);
        window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
      }
    };
    window.addEventListener(REWARD_EVENT, onReward);
    return () => window.removeEventListener(REWARD_EVENT, onReward);
  }, []);

  return (
    <>
      <div className={s.hud} data-testid="reward-hud">
        {state.combo > 1 ? (
          <span className={s.combo} key={state.combo} data-testid="combo">
            ×{state.combo} combo
          </span>
        ) : null}
        <span className={s.xp} data-testid="xp-total">{state.xp} XP</span>
        {state.streak > 0 ? <StreakFlame days={state.streak} caption="day" onDark size={26} /> : null}
        <span className={s.mute}><SilentSwitch onDark compact /></span>
      </div>
      <div className={s.pops} aria-hidden="true">
        {pops.map((p) => (
          <span key={p.id} className={s.pop} data-testid="xp-pop">
            +{p.gained} XP
          </span>
        ))}
      </div>
      <Confetti burst={burst} />
    </>
  );
}
