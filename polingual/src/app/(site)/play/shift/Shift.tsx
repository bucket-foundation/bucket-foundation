"use client";

import GameResults from "../GameResults";
import { local } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";
import type { ShiftBoard } from "@academy/shift";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { centerWord, hintFor, letterAt, revealOne, rotate } from "@/lib/lobby/shift-play";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { useAdsVisible } from "../AdsContext";
import { useLearnerRoot } from "../daily/useDaily";
import { langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage, { type GameStatus } from "../GamePage";
import { pieceClass, WorldStage } from "../GameWorld";
import styles from "../play.module.css";
import { Button, ButtonLink } from "@/ui";

function useShiftBoard(root: string | null) {
  const [board, setBoard] = useState<ShiftBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!root) return;
    setMuted(readMuted(() => window.localStorage));
    fetch(`/api/academy/shift?root=${root}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { board: ShiftBoard }) => {
        setBoard(d.board);
        setOffsets(d.board.columns.map(() => 0));
      })
      .catch(() => setError("Shift could not load. Try again in a minute."));
  }, [root]);
  return { board, error, offsets, setOffsets, muted };
}

function useFound(board: ShiftBoard | null, word: string, muted: boolean) {
  const [found, setFound] = useState<string[]>([]);
  const [counted, setCounted] = useState(false);
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
  return { found, isNew, targetsLeft, complete };
}

function Columns({ board, offsets, isNew, onRotate }: { board: ShiftBoard; offsets: number[]; isNew: boolean; onRotate: (i: number, by: number) => void }) {
  return (
    <div className={styles.shBoard} data-new={isNew} data-testid="sh-board">
      {board.columns.map((col, i) => (
        <div key={i} className={styles.shCol}>
          <Button bare className={styles.shArrow} onClick={() => onRotate(i, -1)} aria-label={`Column ${i + 1} up`} data-testid="sh-up">▲</Button>
          <span className={styles.shGhost}>{letterAt(col, offsets[i] - 1)}</span>
          <b className={`${styles.shLetter} ${pieceClass("paper")}`} data-testid="sh-letter">{letterAt(col, offsets[i])}</b>
          <span className={styles.shGhost}>{letterAt(col, offsets[i] + 1)}</span>
          <Button bare className={styles.shArrow} onClick={() => onRotate(i, 1)} aria-label={`Column ${i + 1} down`} data-testid="sh-down">▼</Button>
        </div>
      ))}
    </div>
  );
}

function Clues({ board, found, hints }: { board: ShiftBoard; found: string[]; hints: Record<string, number> }) {
  const extras = found.filter((w) => !board.targets.some((t) => t.form === w));
  return (
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
  );
}

function Done({ board, found, hints, root }: { board: ShiftBoard; found: string[]; hints: Record<string, number>; root: string | null }) {
  return (
    <>
      <section className={styles.verdict} data-result="right" data-testid="sh-done">
        <p className={styles.verdictHead}>Board cleared</p>
        <p className={app.small}>{`${found.length} words found. A new board comes tomorrow.`}</p>
        <div className={app.row}>
          <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
        </div>
      </section>
      <GameResults rootLang={root ?? "en"} title="Today's words" words={board.targets.map((t) => ({ lang: t.lang, word: t.form, meaning: t.meaning }))} missed={Object.keys(hints).flatMap((f) => board.targets.filter((t) => t.form === f).map((t) => ({ lang: t.lang, word: t.form, meaning: t.meaning })))} />
    </>
  );
}

function HintOffer({ adsVisible, rewarded, onOffer, hint }: { adsVisible: boolean; rewarded: boolean; onOffer: () => void; hint: () => void }) {
  return adsVisible ? (
    rewarded ? (
      <>
        <Ad placement="rewarded" testId="ad-rewarded" />
        <Button onClick={hint} data-testid="sh-hint-claim">Reveal a letter</Button>
      </>
    ) : (
      <Button variant="ghost" size="md" onClick={onOffer} data-testid="sh-hint-offer">Watch an ad for a hint</Button>
    )
  ) : (
    <Button variant="ghost" size="md" onClick={hint} data-testid="sh-hint">Reveal a letter</Button>
  );
}

export default function Shift() {
  const root = useLearnerRoot();
  const { board, error, offsets, setOffsets, muted } = useShiftBoard(root);
  const [hints, setHints] = useState<Record<string, number>>({});
  const [rewarded, setRewarded] = useState(false);
  const adsVisible = useAdsVisible();
  const word = board && offsets.length ? centerWord(board.columns, offsets) : "";
  const { found, isNew, targetsLeft, complete } = useFound(board, word, muted);

  const status: GameStatus = error ? { error } : !board ? { loading: "Loading today's board" } : null;
  const hint = () => {
    const next = revealOne(targetsLeft, hints);
    if (next === hints) return;
    setHints(next);
    setRewarded(false);
  };

  return (
    <GamePage id="shift" caption={board ? `DAILY BOARD · ${board.date}` : undefined} active={!complete} status={status}>
      {() => board && (
        <div className={app.stack} data-testid="shift">
          <section className={app.stackSm}>
            <p className={app.small}>Slide the columns to spell words in the middle row. Words count in {board.langs.map(langName).join(" or ")}.</p>
          </section>
          <WorldStage id="shift">
            <Columns board={board} offsets={offsets} isNew={isNew} onRotate={(i, by) => setOffsets((o) => rotate(o, i, by))} />
          </WorldStage>
          <p className={styles.feedback} data-testid="sh-status">{board.valid[word] ? `${word} · ${board.valid[word].map(langName).join(", ")}` : "Keep sliding"}</p>
          <Clues board={board} found={found} hints={hints} />
          {complete ? (
            <Done board={board} found={found} hints={hints} root={root} />
          ) : <HintOffer adsVisible={adsVisible} rewarded={rewarded} onOffer={() => setRewarded(true)} hint={hint} />}
          {complete && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
        </div>
      )}
    </GamePage>
  );
}
