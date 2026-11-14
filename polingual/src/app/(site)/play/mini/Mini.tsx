"use client";

import { useEffect, useMemo, useState } from "react";
import { cellKey, cells, dailyMini, miniAnswers, miniSize, type MiniEntry, type MiniPuzzle } from "@/lib/daily/mini";
import { miniRight, tapCell, writeAt, type MiniFill } from "@/lib/daily/mini-play";
import { starter } from "@/lib/daily/words";
import { Button, cssVars } from "@/ui";
import { dayLabel, Heading } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { DailyPage } from "../GamePage";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";

type Pos = { active: number; cursor: number };

function useMiniTyping(puzzle: MiniPuzzle | null) {
  const [fill, setFill] = useState<MiniFill>({});
  const [pos, setPos] = useState<Pos>({ active: 0, cursor: 0 });
  const entry: MiniEntry | undefined = puzzle?.entries[pos.active];

  function type(letter: string) {
    if (!entry) return;
    setFill((f) => writeAt(f, entry, pos.cursor, letter));
    setPos((p) => ({ ...p, cursor: Math.min(entry.letters.length - 1, p.cursor + 1) }));
  }

  function erase() {
    if (!entry) return;
    setFill((f) => writeAt(f, entry, pos.cursor, ""));
    setPos((p) => ({ ...p, cursor: Math.max(0, p.cursor - 1) }));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") return erase();
      if (e.key.length === 1 && /\p{L}/u.test(e.key)) type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return { fill, pos, setPos, entry, type, erase };
}

function Grid({ puzzle, fill, pos, onTap }: { puzzle: MiniPuzzle; fill: MiniFill; pos: Pos; onTap: (r: number, c: number) => void }) {
  const entry = puzzle.entries[pos.active];
  const answers = miniAnswers(puzzle);
  const { rows, cols } = miniSize(puzzle);
  const numbers = new Map(puzzle.entries.map((e) => [cellKey(e.row, e.col), e.number]));
  const inWord = new Set(cells(entry).map(([r, c]) => cellKey(r, c)));
  const [ar, ac] = cells(entry)[pos.cursor];
  return (
    <div className={styles.grid} style={cssVars({ "--cols": cols })} data-testid="mini-grid">
      {Array.from({ length: rows * cols }, (_, n) => {
        const r = Math.floor(n / cols);
        const c = n % cols;
        const k = cellKey(r, c);
        if (!answers.has(k)) return <span key={k} className={styles.block} aria-hidden />;
        return (
          <Button bare key={k} className={styles.cell} data-on={r === ar && c === ac} data-word={inWord.has(k)} aria-label={`Row ${r + 1} column ${c + 1}`} onClick={() => onTap(r, c)}>
            {numbers.has(k) ? <sup>{numbers.get(k)}</sup> : null}
            {fill[k] ?? ""}
          </Button>
        );
      })}
    </div>
  );
}

function Clues({ puzzle, active, onPick }: { puzzle: MiniPuzzle; active: number; onPick: (i: number) => void }) {
  return (
    <ol className={styles.clues}>
      {puzzle.entries.map((e, i) => (
        <li key={`${e.number}${e.across}`} data-active={i === active}>
          <Button bare className={styles.clueBtn} onClick={() => onPick(i)} data-testid="mini-clue" data-answer={e.letters.join("")}>
            <b>{e.number} {e.across ? "across" : "down"}</b> {e.word.gloss} · {e.letters.length} letters
          </Button>
        </li>
      ))}
    </ol>
  );
}

export default function Mini() {
  const daily = useDaily("mini");
  const { state, finish } = daily;
  const puzzle = useMemo(() => (state.status === "ready" ? dailyMini(starter(state.system.root, state.system.targets, state.corpus), state.day, state.system.root, state.system.targets) : null), [state]);
  const { fill, pos, setPos, entry, type, erase } = useMiniTyping(puzzle);

  function check(p: MiniPuzzle, day: string) {
    const right = miniRight(p, fill);
    const pattern = right.map((x) => (x ? "1" : "0")).join("");
    void finish({ game: "mini", day, score: right.filter(Boolean).length, total: right.length, pattern, words: p.entries.map((e, i) => ({ lang: e.word.lang, itemId: e.word.itemId, form: e.word.form, gloss: e.word.gloss, right: right[i] })) });
  }

  return (
    <DailyPage id="mini" title="Mini" daily={daily} playable={!!puzzle && !!entry}>
      {(s) => {
        const pz = puzzle!;
        const full = [...miniAnswers(pz).keys()].every((k) => fill[k]);
        return (
          <>
            <Heading eyebrow={`Mini · ${langName(pz.lang)} · ${dayLabel(s.day)}`} title="Today's small crossword" blurb="Write each word in the language. Tap a clue or a square to move." />
            <Grid puzzle={pz} fill={fill} pos={pos} onTap={(r, c) => setPos(tapCell(pz, pos.active, r, c))} />
            <Clues puzzle={pz} active={pos.active} onPick={(i) => setPos({ active: i, cursor: 0 })} />
            <div className={styles.keys}>
              {pz.keys.map((k) => (
                <Button key={k} size="sm" variant="secondary" onClick={() => type(k)} data-testid="mini-key">{k}</Button>
              ))}
              <Button size="sm" variant="ghost" onClick={erase}>Delete</Button>
            </div>
            <Button disabled={!full} onClick={() => check(pz, s.day)} data-testid="mini-check">Check</Button>
          </>
        );
      }}
    </DailyPage>
  );
}
