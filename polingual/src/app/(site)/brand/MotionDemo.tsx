"use client";

import { useEffect, useState } from "react";
import s from "./kit.module.css";

export default function MotionDemo() {
  const [run, setRun] = useState(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    const target = 25;
    const t = setInterval(() => setN((v) => (v >= target ? v : v + 1)), 24);
    return () => clearInterval(t);
  }, [run]);

  return (
    <div className={s.cards}>
      <div className={s.card}>
        <div className={s.stage}><div key={`p${run}`} className={`${s.popBox} ${s.popRun}`} /></div>
        <h3>Pop, 160 ms</h3>
        <p>Cards and chips enter with a 4 px lift and ease-out.</p>
      </div>
      <div className={s.card}>
        <div className={s.stage}><span className={s.count}>+{n}</span></div>
        <h3>Count up</h3>
        <p>Coins and points tick up over 600 ms. The final number is always readable.</p>
      </div>
      <div className={s.card}>
        <div className={s.stage}><span key={`s${run}`} className={`${s.slide} ${s.code}`} style={{ fontSize: 28 }}>▲ 2</span></div>
        <h3>Rank slide, 300 ms</h3>
        <p>Leaderboard rows slide to their new place.</p>
      </div>
      <button className={s.cta} onClick={() => setRun(run + 1)}>Replay</button>
    </div>
  );
}
