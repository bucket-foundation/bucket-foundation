"use client";

import { Button } from "@/ui";
import { MAX_GUESSES, score, type Mark } from "@/lib/polyword/puzzle";
import styles from "./polyword.module.css";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const MARK_LABEL: Record<Mark, string> = { hit: "right spot", near: "in the word", miss: "not in the word" };

export function Board({ guesses, draft, answer, shake }: { guesses: readonly string[]; draft: string; answer: string; shake: number }) {
  const n = answer.length;
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => r);
  return (
    <div className={styles.board} style={{ "--n": n } as React.CSSProperties} role="grid" aria-label="Guesses" data-testid="pw-board">
      {rows.map((r) => {
        const guess = guesses[r];
        const current = r === guesses.length;
        const marks = guess ? score(guess, answer) : null;
        const letters = guess ?? (current ? draft : "");
        return (
          <div key={current ? `c${shake}` : r} className={styles.row} role="row" data-shake={current && shake > 0 ? true : undefined} data-testid="pw-row">
            {Array.from({ length: n }, (_, i) => {
              const ch = letters[i] ?? "";
              const mark = marks?.[i];
              return (
                <span
                  key={i}
                  role="gridcell"
                  className={styles.cell}
                  data-mark={mark}
                  data-filled={ch ? true : undefined}
                  style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
                  aria-label={ch ? `${ch.toUpperCase()}${mark ? `, ${MARK_LABEL[mark]}` : ""}` : "empty"}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function Keyboard({ marks, onKey, disabled }: { marks: Record<string, Mark>; onKey: (k: string) => void; disabled: boolean }) {
  return (
    <div className={styles.keys} aria-label="Keyboard" data-testid="pw-keys">
      {ROWS.map((row, r) => (
        <div key={row} className={styles.keyRow}>
          {r === 2 ? (
            <Button bare className={styles.key} data-wide onClick={() => onKey("enter")} disabled={disabled} data-testid="pw-enter">
              Enter
            </Button>
          ) : null}
          {row.split("").map((k) => (
            <Button bare key={k} className={styles.key} data-mark={marks[k]} onClick={() => onKey(k)} disabled={disabled} aria-label={marks[k] ? `${k}, ${MARK_LABEL[marks[k]]}` : k} data-testid={`pw-key-${k}`}>
              {k}
            </Button>
          ))}
          {r === 2 ? (
            <Button bare className={styles.key} data-wide onClick={() => onKey("back")} disabled={disabled} aria-label="Delete letter" data-testid="pw-back">
              ⌫
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
