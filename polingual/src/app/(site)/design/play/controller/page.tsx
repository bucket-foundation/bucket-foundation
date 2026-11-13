"use client";

import { useState } from "react";
import { ANSWERS, ME } from "../mock";
import { Avatar, Coins, Flag, Shape } from "../../../play-kit/parts";
import s from "../design.module.css";

type Step = "join" | "in" | "answer" | "result";

function Controller({ remote }: { remote: boolean }) {
  const [step, setStep] = useState<Step>("join");
  const [picked, setPicked] = useState<number | null>(null);
  const [code, setCode] = useState("K7M2QX");

  const tap = (i: number) => {
    setPicked(i);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
    setTimeout(() => setStep("result"), 700);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span className={s.label}>{remote ? "Virtual player" : "TV controller"}</span>
      <div className={s.phone} data-light={step === "join"}>
        {step === "join" && (
          <div className={s.phoneMsg} style={{ color: "var(--ink)" }}>
            <img src="/brand/kit/mark.svg" alt="" width={56} height={56} />
            <h2 style={{ color: "var(--tyrian)" }}>Join a game</h2>
            <input aria-label="Room code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} className={s.mono} style={{ fontSize: 30, letterSpacing: ".2em", textAlign: "center", width: "100%", padding: 12, borderRadius: 14, border: "2px solid var(--hair)" }} />
            <div className={s.row} style={{ justifyContent: "center" }}><Avatar look={ME.look} size={48} /><b>{ME.handle}</b><Flag lang={ME.lang} size={14} /></div>
            <button className={s.cta} style={{ width: "100%" }} onClick={() => setStep("in")}>Join</button>
          </div>
        )}
        {step === "in" && (
          <div className={s.phoneMsg}>
            <Avatar look={ME.look} size={140} bounce />
            <h2>You&apos;re in!</h2>
            <p style={{ margin: 0 }}>{remote ? "Playing from afar. The question shows here too." : "Look at the TV. Your buttons appear here."}</p>
            <button className={s.cta} onClick={() => setStep("answer")}>Next: round starts</button>
          </div>
        )}
        {step === "answer" && (
          <>
            <div className={s.between}><span className={s.mono}>3 / 10</span><span className={s.mono}>streak 2 🔥</span></div>
            {remote && (
              <div style={{ textAlign: "center" }}>
                <Flag lang="es" size={22} />
                <div className={s.tvWord} style={{ fontSize: 48 }}>perro</div>
              </div>
            )}
            <div className={s.padGrid}>
              {ANSWERS.map((a, i) => (
                <button key={a.text} className={s.pad} style={{ background: a.color }} aria-label={remote ? a.text : `${a.shape} button`} data-state={picked !== null && picked !== i ? "dim" : undefined} onClick={() => tap(i)}>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#F6EEDC", fontFamily: "Fredoka", fontWeight: 700, fontSize: 22 }}>
                    <Shape shape={a.shape} size={remote ? 32 : 56} />
                    {remote && a.text}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === "result" && (
          <div className={s.phoneMsg} style={{ background: picked === 0 ? "var(--malachite)" : "#9B2414", borderRadius: 24, margin: -6 }}>
            <h2>{picked === 0 ? "Correct!" : "Not this time"}</h2>
            <span className={s.mono} style={{ fontSize: 30 }}>{picked === 0 ? "+840" : "+0"}</span>
            <p style={{ margin: 0 }}>{picked === 0 ? "2nd place, 120 behind nonna.r" : "perro means dog. Added to missed words."}</p>
            <Coins n={ME.coins} />
            <button className={s.ghost} style={{ borderColor: "#F6EEDC", color: "#F6EEDC" }} onClick={() => { setPicked(null); setStep("answer"); }}>Next round</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControllerMock() {
  return (
    <main className={s.main}>
      <p className={s.label}>Phone</p>
      <h1 className={s.title}>Controller and virtual play</h1>
      <p className={s.muted}>Left: the room has a TV, so the phone shows shapes only. Right: a player joining from afar sees the full prompt.</p>
      <div className={s.phoneWrap}>
        <Controller remote={false} />
        <Controller remote />
      </div>
    </main>
  );
}
