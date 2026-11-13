"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShiftBoard } from "@academy/shift";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { LEARN_HREF } from "@/lib/lobby/client";
import { centerWord, hintFor, rotate } from "@/lib/lobby/shift-play";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../play.module.css";

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function Shift() {
  const [board, setBoard] = useState<ShiftBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [hints, setHints] = useState<Record<string, number>>({});
  const [rewarded, setRewarded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [counted, setCounted] = useState(false);
  const adsVisible = useAdsVisible();

  useEffect(() => {
    setMuted(readMuted(() => window.localStorage));
    fetch("/api/academy/shift")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { board: ShiftBoard }) => {
        setBoard(d.board);
        setOffsets(d.board.columns.map(() => 0));
      })
      .catch(() => setError("Shift could not load. Try again in a minute."));
  }, []);

  const word = board && offsets.length ? centerWord(board.columns, offsets) : "";
  const isNew = !!board && !!board.valid[word] && !found.includes(word);

  useEffect(() => {
    if (!isNew) return;
    setFound((f) => [...f, word]);
    play("hit", muted);
  }, [isNew, word, muted]);

  const targetsLeft = useMemo(() => (board ? board.targets.filter((t) => !found.includes(t.form)) : []), [board, found]);
  const complete = !!board && targetsLeft.length === 0;

  useEffect(() => {
    if (!complete || counted) return;
    setCounted(true);
    play("win", muted);
    const b = readBreaks(local);
    writeBreaks(local, { ...b, games: b.games + 1 });
  }, [complete, counted, muted]);

  if (error) return <p className={app.error} role="alert">{error}</p>;
  if (!board) return <p className={app.muted} aria-busy="true">Loading today&apos;s board</p>;

  const hint = () => {
    const t = targetsLeft[0];
    if (!t) return;
    setHints((h) => ({ ...h, [t.form]: Math.min(Array.from(t.form).length, (h[t.form] ?? 0) + 1) }));
    setRewarded(false);
  };
  const extras = found.filter((w) => !board.targets.some((t) => t.form === w));

  return (
    <div className={app.stack} data-testid="shift">
      <section className={app.stackSm}>
        <p className={app.label}>Daily board · {board.date}</p>
        <h1 className={app.title}>Shift</h1>
        <p className={app.small}>Slide the columns to spell words in the middle row. Words count in {board.langs.map(langName).join(" or ")}.</p>
      </section>
      <div className={styles.shBoard} data-new={isNew} data-testid="sh-board">
        {board.columns.map((col, i) => (
          <div key={i} className={styles.shCol}>
            <button type="button" className={styles.shArrow} onClick={() => setOffsets((o) => rotate(o, i, -1))} aria-label={`Column ${i + 1} up`} data-testid="sh-up">▲</button>
            <span className={styles.shGhost}>{col[(((offsets[i] - 1) % col.length) + col.length) % col.length]}</span>
            <b className={styles.shLetter} data-testid="sh-letter">{col[((offsets[i] % col.length) + col.length) % col.length]}</b>
            <span className={styles.shGhost}>{col[(((offsets[i] + 1) % col.length) + col.length) % col.length]}</span>
            <button type="button" className={styles.shArrow} onClick={() => setOffsets((o) => rotate(o, i, 1))} aria-label={`Column ${i + 1} down`} data-testid="sh-down">▼</button>
          </div>
        ))}
      </div>
      <p className={styles.feedback} data-testid="sh-status">{board.valid[word] ? `${word} · ${board.valid[word].map(langName).join(", ")}` : "Keep sliding"}</p>
      <section className={app.stackSm}>
        <h2 className={app.fieldLabel}>Clues</h2>
        <ul className={styles.vaList} data-testid="sh-clues">
          {board.targets.map((t) => (
            <li key={t.form} className={styles.player} data-me={found.includes(t.form)}>
              <span className={styles.pickLabel}>
                <FlagSquare lang={t.lang} size={18} />
                <span>{t.meaning}</span>
              </span>
              <span className={styles.score}>{found.includes(t.form) ? t.form : hintFor(t.form, hints[t.form] ?? 0)}</span>
            </li>
          ))}
        </ul>
        {extras.length ? <p className={app.small} data-testid="sh-extras">{`Bonus words: ${extras.join(", ")}`}</p> : null}
      </section>
      {complete ? (
        <section className={styles.verdict} data-result="right" data-testid="sh-done">
          <p className={styles.verdictHead}>Board cleared</p>
          <p className={app.small}>{`${found.length} words found. A new board comes tomorrow.`}</p>
          <div className={app.row}>
            <a className={app.cta} href={LEARN_HREF}>Learn these words</a>
            <a className={app.ghost} href="/play">Lobbies</a>
          </div>
        </section>
      ) : adsVisible ? (
        rewarded ? (
          <>
            <Ad placement="rewarded" testId="ad-rewarded" />
            <button type="button" className={app.cta} onClick={hint} data-testid="sh-hint-claim">Reveal a letter</button>
          </>
        ) : (
          <button type="button" className={app.ghost} onClick={() => setRewarded(true)} data-testid="sh-hint-offer">Watch an ad for a hint</button>
        )
      ) : (
        <button type="button" className={app.ghost} onClick={hint} data-testid="sh-hint">Reveal a letter</button>
      )}
      {complete && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}
