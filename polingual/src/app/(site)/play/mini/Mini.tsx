"use client";

import { useEffect, useMemo, useState } from "react";
import { cellKey, cells, dailyMini, miniAnswers, miniSize, type MiniEntry } from "@/lib/daily/mini";
import { starter } from "@/lib/daily/words";
import { Button, cssVars } from "@/ui";
import { DailyWorld, Heading, Loading, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";


export default function Mini() {
  const { state, finish } = useDaily("mini");
  const puzzle = useMemo(() => (state.status === "ready" ? dailyMini(starter(state.system.root, state.system.targets, state.corpus), state.day, state.system.root, state.system.targets) : null), [state]);
  const [fill, setFill] = useState<Record<string, string>>({});
  const [active, setActive] = useState(0);
  const [cursor, setCursor] = useState(0);
  const entry: MiniEntry | undefined = puzzle?.entries[active];

  function type(letter: string) {
    if (!entry) return;
    const [r, c] = cells(entry)[cursor];
    setFill((f) => ({ ...f, [cellKey(r, c)]: letter }));
    setCursor((k) => Math.min(entry.letters.length - 1, k + 1));
  }

  function erase() {
    if (!entry) return;
    const [r, c] = cells(entry)[cursor];
    setFill((f) => ({ ...f, [cellKey(r, c)]: "" }));
    setCursor((k) => Math.max(0, k - 1));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") return erase();
      if (e.key.length === 1 && /\p{L}/u.test(e.key)) type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (state.status !== "ready") return <DailyWorld id="mini"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="mini"><Results title="Mini" result={state.done} url="https://polingual.com/play/mini" /></DailyWorld>;
  if (!puzzle || !entry) return <DailyWorld id="mini"><Loading state="error" /></DailyWorld>;

  const answers = miniAnswers(puzzle);
  const { rows, cols } = miniSize(puzzle);
  const numbers = new Map(puzzle.entries.map((e) => [cellKey(e.row, e.col), e.number]));
  const inWord = new Set(cells(entry).map(([r, c]) => cellKey(r, c)));
  const [ar, ac] = cells(entry)[cursor];
  const full = [...answers.keys()].every((k) => fill[k]);

  function check() {
    if (!puzzle || state.status !== "ready") return;
    const right = puzzle.entries.map((e) => cells(e).every(([r, c], i) => fill[cellKey(r, c)] === e.letters[i]));
    const pattern = right.map((x) => (x ? "1" : "0")).join("");
    void finish({ game: "mini", day: state.day, score: right.filter(Boolean).length, total: right.length, pattern, words: puzzle.entries.map((e, i) => ({ lang: e.word.lang, itemId: e.word.itemId, form: e.word.form, gloss: e.word.gloss, right: right[i] })) });
  }

  return (
    <DailyWorld id="mini">
      <Heading eyebrow={`Mini · ${langName(puzzle.lang)} · ${state.day}`} title="Today's small crossword" blurb="Write each word in the language. Tap a clue or a square to move." />
      <div className={styles.grid} style={cssVars({ "--cols": cols })} data-testid="mini-grid">
        {Array.from({ length: rows * cols }, (_, n) => {
          const r = Math.floor(n / cols);
          const c = n % cols;
          const k = cellKey(r, c);
          if (!answers.has(k)) return <span key={k} className={styles.block} aria-hidden />;
          return (
            <button
              key={k}
              type="button"
              className={styles.cell}
              data-on={r === ar && c === ac}
              data-word={inWord.has(k)}
              aria-label={`Row ${r + 1} column ${c + 1}`}
              onClick={() => {
                const idx = puzzle.entries.findIndex((e) => cells(e).some(([er, ec]) => er === r && ec === c) && (e === entry || !inWord.has(k)));
                const at = Math.max(0, idx);
                setActive(at);
                setCursor(cells(puzzle.entries[at]).findIndex(([er, ec]) => er === r && ec === c));
              }}
            >
              {numbers.has(k) ? <sup>{numbers.get(k)}</sup> : null}
              {fill[k] ?? ""}
            </button>
          );
        })}
      </div>
      <ol className={styles.clues}>
        {puzzle.entries.map((e, i) => (
          <li key={`${e.number}${e.across}`} data-active={i === active}>
            <button type="button" className={styles.clueBtn} onClick={() => { setActive(i); setCursor(0); }} data-testid="mini-clue" data-answer={e.letters.join("")}>
              <b>{e.number} {e.across ? "across" : "down"}</b> {e.word.gloss} · {e.letters.length} letters
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.keys}>
        {puzzle.keys.map((k) => (
          <Button key={k} size="sm" variant="secondary" onClick={() => type(k)} data-testid="mini-key">{k}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={erase}>Delete</Button>
      </div>
      <Button disabled={!full} onClick={check} data-testid="mini-check">Check</Button>
    </DailyWorld>
  );
}
