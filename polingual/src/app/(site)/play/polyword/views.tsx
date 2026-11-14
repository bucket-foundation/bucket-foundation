"use client";

import type { RefObject } from "react";
import { TARGETS, type Bank } from "@/lib/polyword/bank";
import { gameOf, isUnlocked, type Progress } from "@/lib/polyword/progress";
import type { Hint, Puzzle } from "@/lib/polyword/puzzle";
import { DAY_ICON, dayState } from "@/lib/polyword/view";
import app from "../../app/app.module.css";
import { FlagSquare } from "../LearnWord";
import { langName } from "../langs";
import styles from "./polyword.module.css";
import { HintTile, shortDate } from "./parts";
import { Pill } from "@/ui";

type HeaderProps = { bank: Bank; lang: string; puzzle: Puzzle; streak: number; isToday: boolean; view: "game" | "archive"; onToday: () => void; onArchive: () => void; onLang: (l: string) => void };

export function Header({ bank, lang, puzzle, streak, isToday, view, onToday, onArchive, onLang }: HeaderProps) {
  return (
    <header className={styles.head}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Polyword</h2>
        <span className={styles.streak} data-testid="pw-streak" title="Daily streak">
          🔥 {streak}
        </span>
      </div>
      <div className={styles.subRow}>
        <p className={styles.sub}>
          <FlagSquare lang={lang} size={18} /> {langName(lang)} · #{puzzle.day} · {isToday ? "Today" : shortDate(puzzle.day)}
        </p>
        <span className={styles.nav}>
          {view === "archive" || !isToday ? <Pill onClick={onToday} data-testid="pw-today">Today</Pill> : null}
          {view === "game" ? <Pill onClick={onArchive} data-testid="pw-archive-open">Archive</Pill> : null}
        </span>
      </div>
      <div className={styles.langs} role="group" aria-label="Language" data-testid="pw-langs">
        {TARGETS.filter((l) => bank.langs[l]?.length).map((l) => (
          <button key={l} type="button" className={styles.lang} aria-pressed={l === lang} onClick={() => onLang(l)} title={langName(l)} data-testid={`pw-lang-${l}`}>
            <FlagSquare lang={l} size={20} />
            <span>{l.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

export function Archive({ progress, lang, today, pro, onDay }: { progress: Progress; lang: string; today: number; pro: boolean; onDay: (d: number) => void }) {
  return (
    <section className={styles.archive} aria-labelledby="pw-archive" data-testid="pw-archive">
      <h2 id="pw-archive" className={styles.h2}>
        Past puzzles in {langName(lang)}
      </h2>
      <p className={app.small}>{pro ? "Pro opens every past puzzle." : "Today’s puzzle is free. Open a past one with a short ad, or go Pro for all of them."}</p>
      <ol className={styles.days}>
        {Array.from({ length: today - 1 }, (_, i) => today - 1 - i).map((d) => {
          const state = dayState(gameOf(progress, lang, d), isUnlocked(progress, lang, d, today, pro));
          return (
            <li key={d}>
              <button type="button" className={styles.day} data-state={state} onClick={() => onDay(d)} data-testid={`pw-day-${d}`} aria-label={`Puzzle ${d}, ${shortDate(d)}, ${state}`}>
                <b>#{d}</b>
                <span>{shortDate(d)}</span>
                <i aria-hidden="true">{DAY_ICON[state]}</i>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Clues({ puzzle, hints, over, strip }: { puzzle: Puzzle; hints: Hint[]; over: boolean; strip: RefObject<HTMLUListElement | null> }) {
  return (
    <section className={styles.clues} aria-labelledby="pw-clues" data-testid="pw-clues">
      <h2 id="pw-clues" className={styles.h2}>
        {over ? `“${puzzle.gloss}” in other languages` : hints.length ? "Clues" : "Each miss opens a clue"}
      </h2>
      <ul className={styles.hintGrid} ref={strip}>
        {hints.map((h, i) => (
          <HintTile key={`${puzzle.slug}:${h.lang}`} hint={h} index={i} />
        ))}
        {over
          ? null
          : Array.from({ length: Math.max(0, puzzle.hints.length - hints.length) }, (_, i) => (
              <li key={`slot${i}`} className={styles.slot} aria-hidden="true">
                ?
              </li>
            ))}
      </ul>
    </section>
  );
}
