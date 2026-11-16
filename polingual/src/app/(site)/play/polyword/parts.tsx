"use client";

import { useEffect, useState } from "react";
import { LANGS } from "@academy/lang-systems";
import { dateOfDay, dayNumber, type Hint } from "@/lib/polyword/puzzle";
import { bcp47 } from "@/lib/speak";
import { TileFace } from "@/app/tile";
import { langName } from "../langs";
import { PlayTile } from "../../word/Speak";
import styles from "./polyword.module.css";

export function useToday(): number | null {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setToday(dayNumber(new Date()));
    tick();
    const t = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return today;
}

export function shortDate(day: number): string {
  return dateOfDay(day).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function Countdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
      setLeft(`${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`);
    };
    tick();
    const t = window.setInterval(tick, 20_000);
    return () => window.clearInterval(t);
  }, []);
  return <span data-testid="pw-countdown">{left}</span>;
}

export function HintTile({ hint, index }: { hint: Hint; index: number }) {
  const item = { id: `pw:${hint.lang}:${hint.word}`, text: hint.word, lang: bcp47(hint.lang) };
  return (
    <TileFace
      as="li"
      lang={hint.lang}
      code={hint.lang}
      label={langName(hint.lang)}
      word={hint.word}
      reading={hint.roman}
      rtl={LANGS[hint.lang]?.rtl}
      index={index}
      className={styles.hint}
      attrs={{ "data-testid": "pw-hint" }}
      play={<PlayTile item={item} label={`Hear ${hint.word} in ${langName(hint.lang)}`} />}
    />
  );
}

