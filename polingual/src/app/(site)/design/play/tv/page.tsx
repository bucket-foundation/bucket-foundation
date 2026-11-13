"use client";

import { useEffect, useState } from "react";
import { ANSWERS, FRIENDS, GROUP_BOARD } from "../mock";
import { Avatar, Flag, Shape } from "../../../play-kit/parts";
import s from "../design.module.css";

const PHASES = ["lobby", "question", "reveal", "board", "finale"] as const;
type Phase = (typeof PHASES)[number];

const ROSTER = [...GROUP_BOARD.map((p) => ({ handle: p.handle, lang: p.lang, look: p.look })), ...FRIENDS.slice(0, 2).map((f) => ({ handle: f.handle, lang: f.lang, look: f.look }))];
const PICKS = [1, 6, 0, 0];

export default function TvMock() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [left, setLeft] = useState(10);

  useEffect(() => {
    if (phase !== "question") return;
    setLeft(10);
    const t = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className={s.stage}>
      <div className={s.tvTop}>
        <div className={s.row}>
          <img src="/brand/kit/mark-on-dark.svg" alt="" width={44} height={44} />
          <span style={{ fontFamily: "Fredoka", fontSize: 26, fontWeight: 600 }}>Rossi family</span>
        </div>
        {phase === "lobby" ? (
          <div style={{ textAlign: "right" }}>
            <span className={s.mono} style={{ fontSize: 14 }}>polingual.com/join</span>
            <div className={s.tvCode}>K7M2QX</div>
          </div>
        ) : (
          <span className={s.mono} style={{ fontSize: 22 }}>ROUND 3 / 10</span>
        )}
      </div>

      {phase === "lobby" && (
        <>
          <div className={s.tvQ}>
            <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ width: 180, height: 180, background: "#F6EEDC", borderRadius: 18, display: "grid", placeItems: "center", color: "#231F20" }} className={s.mono}>QR</div>
              <div style={{ textAlign: "left" }}>
                <div className={s.tvWord} style={{ fontSize: "clamp(36px,5vw,72px)" }}>Scan to play</div>
                <p style={{ fontSize: 22, margin: "8px 0 0" }}>{ROSTER.length} players in. Flags, Spanish, French, Italian, Portuguese.</p>
              </div>
            </div>
          </div>
          <div className={s.tvPlayers}>
            {ROSTER.map((p, i) => (
              <div key={p.handle} className={`${s.tvPlayer} ${s.pop}`} style={{ animationDelay: `${i * 120}ms` }}>
                <Avatar look={p.look} size={92} bounce />
                <span className={s.row} style={{ gap: 6 }}><Flag lang={p.lang} size={14} />{p.handle}</span>
              </div>
            ))}
            <div className={s.tvPlayer} style={{ opacity: 0.6 }}><span style={{ fontSize: 46 }}>🌐</span><span>sofi plays remote</span></div>
          </div>
        </>
      )}

      {(phase === "question" || phase === "reveal") && (
        <>
          <div className={s.tvQ}>
            <div className={s.row} style={{ gap: 14 }}>
              <Flag lang="es" size={40} />
              <span className={s.mono} style={{ fontSize: 20 }}>SPANISH</span>
            </div>
            <div className={s.tvWord}>perro</div>
            <div className={s.row} style={{ gap: 28 }}>
              {phase === "question" ? (
                <div className={s.ring} style={{ ["--p" as string]: `${left * 10}%` }}><span>{left}</span></div>
              ) : (
                <div className={s.row} style={{ alignItems: "flex-end", gap: 10, height: 90 }}>
                  {ANSWERS.map((a, i) => (
                    <div key={a.text} style={{ width: 44, height: 12 + PICKS[i] * 12, background: a.color, borderRadius: 8, display: "grid", placeItems: "start center", color: "#F6EEDC" }} className={s.mono}>{PICKS[i]}</div>
                  ))}
                </div>
              )}
              <span className={s.mono} style={{ fontSize: 22 }}>{phase === "question" ? "5 / 7 answered" : "6 of 7 got it"}</span>
            </div>
          </div>
          <div className={s.tvGrid}>
            {ANSWERS.map((a, i) => (
              <div key={a.text} className={s.tvAns} style={{ background: a.color }} data-state={phase === "reveal" ? (i === 0 ? "right" : "dim") : undefined}>
                <Shape shape={a.shape} size={44} />
                {a.text}
                {phase === "reveal" && i === 0 && <span style={{ marginLeft: "auto" }}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {phase === "board" && (
        <div className={s.tvQ}>
          <div className={s.tvWord} style={{ fontSize: "clamp(36px,5vw,64px)" }}>Leaderboard</div>
          <div className={s.board}>
            {ROSTER.slice(0, 5).map((p, i) => (
              <div key={p.handle} className={`${s.boardRow} ${s.pop}`} style={{ animationDelay: `${i * 90}ms` }}>
                <span className={s.mono} style={{ color: "#E9A23B" }}>{i + 1}</span>
                <Avatar look={p.look} size={44} variant="head" />
                <Flag lang={p.lang} size={16} />
                {p.handle}
                {i === 1 && <span className={s.mono} style={{ fontSize: 14, color: "#3BD18A" }}>▲2</span>}
                <b>{2400 - i * 310}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "finale" && (
        <div className={s.tvQ}>
          <div className={s.tvWord} style={{ fontSize: "clamp(36px,5vw,72px)" }}>nonna.r wins!</div>
          <div className={s.podium}>
            {[1, 0, 2].map((i) => {
              const p = ROSTER[i];
              const h = [220, 160, 120][i];
              const c = ["#E9A23B", "#6FB7C2", "#D9381E"][i];
              return (
                <div key={p.handle} className={s.step}>
                  <Avatar look={p.look} size={i === 0 ? 120 : 90} bounce />
                  <span style={{ fontWeight: 800, fontSize: 20 }}>{p.handle}</span>
                  <div style={{ height: h, background: c, color: "#3A0F2F" }}>{i + 1}</div>
                </div>
              );
            })}
          </div>
          <p className={s.mono} style={{ fontSize: 18 }}>+15 COINS TO 1ST, GROUP BOARD UPDATED</p>
        </div>
      )}

      <div className={s.tvCtl} role="group" aria-label="Mockup phase and host controls">
        {PHASES.map((p) => <button key={p} aria-pressed={phase === p} onClick={() => setPhase(p)}>{p}</button>)}
        <button>pause</button>
        <button>skip</button>
        <button>lock room</button>
        <button onClick={() => setPhase("lobby")}>play again</button>
      </div>
    </div>
  );
}
