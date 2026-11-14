"use client";

import { useLearnerRoot } from "../daily/useDaily";
import { useCallback, useMemo, useRef, useState } from "react";
import { SITE } from "@/lib/facts";
import { ADS } from "@/lib/lobby/ads";
import type { Bank } from "@/lib/polyword/bank";
import { accountOf, archiveOffer, pauseFrameAds, type Phase } from "@/lib/polyword/policy";
import { firstGame, gameOf, isUnlocked, statsFor, withGame, withUnlock, type Progress } from "@/lib/polyword/progress";
import { checkGuess, finished, keyMarks, puzzleFor, revealedHints, solved, meaningIn } from "@/lib/polyword/puzzle";
import { shareText } from "@/lib/polyword/share";
import { guessError } from "@/lib/polyword/view";
import app from "../../app/app.module.css";
import { useAccount } from "../Account";
import { usePauseAds } from "../AdsContext";
import { langName } from "../langs";
import { Board, Keyboard } from "./Board";
import GamePage from "../GamePage";
import { WorldStage } from "../GameWorld";
import styles from "./polyword.module.css";
import { useToday } from "./parts";
import { useDay, useProgress, useStripScroll, useToast, useTyping, useUnlock } from "./hooks";
import { Archive, Clues, Header } from "./views";
import Results from "./Results";
import UnlockSheet from "./UnlockSheet";

const SHARE_URL = `${SITE}/play/polyword`;

function usePuzzle(bank: Bank, lang: string, day: number | null, progress: Progress) {
  const puzzle = useMemo(() => (day ? puzzleFor(bank, lang, day) : null), [bank, lang, day]);
  const learnerRoot = useLearnerRoot();
  const rootMeaning = puzzle ? meaningIn(bank, puzzle, learnerRoot ?? "en") : { lang: "en", text: "" };
  const game = puzzle ? gameOf(progress, lang, puzzle.day) : undefined;
  const guesses = useMemo(() => game?.guesses ?? [], [game]);
  const over = puzzle ? finished(guesses, puzzle.answer) : false;
  const won = puzzle ? solved(guesses, puzzle.answer) : false;
  const first = puzzle ? firstGame(progress, lang, puzzle.day) : true;
  return { puzzle, rootMeaning, game, guesses, over, won, first };
}

function usePolyword(bank: Bank) {
  const today = useToday();
  const { entitlement, openSignIn } = useAccount();
  const account = accountOf(entitlement);
  const { toast, flash } = useToast();
  const { progress, loaded, lang, setLang, update } = useProgress(bank, flash);
  const { day, setDay } = useDay(today, lang, progress);
  const [view, setView] = useState<"game" | "archive">("game");
  const [draft, setDraft] = useState("");
  const [shake, setShake] = useState(0);
  const strip = useRef<HTMLUListElement>(null);

  const { puzzle, rootMeaning, game, guesses, over, won, first } = usePuzzle(bank, lang, day, progress);
  const phase: Phase = view === "archive" ? "archive" : over ? "done" : "playing";
  const ready = loaded && today !== null && puzzle !== null;
  const pro = account === "paid";

  usePauseAds(!ready || pauseFrameAds(phase, first));
  useStripScroll(strip, puzzle ? revealedHints(puzzle, guesses).length : 0, over);

  const submit = useCallback(() => {
    if (!puzzle || over || today === null) return;
    const c = checkGuess(draft, puzzle.answer, guesses);
    if (!c.ok) {
      flash(guessError(c.reason, puzzle.answer.length));
      setShake((s) => s + 1);
      return;
    }
    const next = [...guesses, c.guess];
    const done = finished(next, puzzle.answer);
    const archive = game ? !!game.archive : puzzle.day !== today;
    update((p) => withGame(p, lang, puzzle.day, archive ? { guesses: next, done, won: solved(next, puzzle.answer), archive } : { guesses: next, done, won: solved(next, puzzle.answer) }));
    setDraft("");
    if (!done) {
      const hint = puzzle.hints[next.length - 1];
      if (hint) flash(`New clue in ${langName(hint.lang)}`);
    }
  }, [puzzle, over, today, draft, guesses, game, lang, update, flash]);

  const onKey = useCallback(
    (k: string) => {
      if (!puzzle || over) return;
      if (k === "enter") return submit();
      if (k === "back") return setDraft((d) => d.slice(0, -1));
      setDraft((d) => (d.length < puzzle.answer.length ? d + k : d));
    },
    [puzzle, over, submit],
  );

  const show = (d: number) => { setDay(d); setDraft(""); setView("game"); };
  const unlocking = useUnlock((d) => {
    update((p) => withUnlock(p, lang, d));
    unlocking.setUnlock(null);
    show(d);
  });
  useTyping(view === "game" && !unlocking.unlock && !over && ready, onKey);

  return { today, account, openSignIn, toast, flash, progress, lang, setLang, update, setDay, view, setView, draft, setDraft, shake, strip, puzzle, rootMeaning, game, guesses, over, won, first, phase, ready, pro, onKey, show, ...unlocking };
}

type Pw = ReturnType<typeof usePolyword>;

function useActions(g: Pw) {
  const pickLang = (l: string) => {
    g.setLang(l);
    g.setDraft("");
    g.setView("game");
    if (g.today !== null) g.setDay(g.today);
    g.update((p) => ({ ...p, lang: l }));
  };
  const openDay = (d: number) => {
    if (g.today === null) return;
    if (isUnlocked(g.progress, g.lang, d, g.today, g.pro)) return g.show(d);
    g.setUnlock({ day: d, state: "offer" });
  };
  const share = async () => {
    if (!g.puzzle) return;
    const text = shareText(g.puzzle, g.guesses, SHARE_URL);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      g.flash("Copied. Paste it in your group chat.");
    } catch {
      g.flash("Could not copy. Long-press to select the grid.");
    }
  };
  return { pickLang, openDay, share };
}

function PolywordGame({ bank }: { bank: Bank }) {
  const g = usePolyword(bank);
  const { pickLang, openDay, share } = useActions(g);
  const { puzzle, today, lang, phase, account, view, over, guesses, unlock } = g;

  if (!g.ready || !puzzle || today === null) {
    return (
      <div className={styles.wrap} data-testid="polyword" aria-busy="true">
        <p className={app.muted}>Loading today’s word</p>
      </div>
    );
  }

  const stats = statsFor(g.progress, lang, today);
  const isToday = puzzle.day === today;

  return (
    <div className={styles.wrap} data-testid="polyword" data-phase={phase} data-account={account} data-round={phase === "playing" ? "active" : undefined}>
      <Header bank={bank} lang={lang} puzzle={puzzle} streak={stats.streak} isToday={isToday} view={view} onToday={() => openDay(today)} onArchive={() => g.setView("archive")} onLang={pickLang} />
      <p className={styles.toast} role="status" aria-live="polite" data-testid="pw-toast" data-on={g.toast ? true : undefined}>
        {g.toast}
      </p>
      {view === "archive" ? (
        <Archive progress={g.progress} lang={lang} today={today} pro={g.pro} onDay={openDay} />
      ) : (
        <>
          <WorldStage id="polyword" className={styles.pwStage}>
            <Board guesses={guesses} draft={g.draft} answer={puzzle.answer} shake={g.shake} />
          </WorldStage>
          <Clues puzzle={puzzle} hints={revealedHints(puzzle, guesses)} over={over} strip={g.strip} />
          {over ? (
            <Results lang={lang} puzzle={puzzle} guesses={guesses} game={g.game} won={g.won} stats={stats} rootMeaning={g.rootMeaning} isToday={isToday} account={account} phase={phase} first={g.first} onShare={() => void share()} onArchive={() => g.setView("archive")} openSignIn={g.openSignIn} />
          ) : (
            <Keyboard marks={keyMarks(guesses, puzzle.answer)} onKey={g.onKey} disabled={over} />
          )}
        </>
      )}
      {unlock ? <UnlockSheet unlock={unlock} offer={archiveOffer(account, ADS.mode, true)} sheet={g.sheet} onWatch={() => void g.watch(unlock.day)} onClose={g.closeSheet} /> : null}
    </div>
  );
}

export default function Polyword({ bank }: { bank: Bank }) {
  return <GamePage id="polyword">{() => <PolywordGame bank={bank} />}</GamePage>;
}
