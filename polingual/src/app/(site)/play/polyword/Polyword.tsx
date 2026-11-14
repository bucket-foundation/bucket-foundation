"use client";

import { useLearnerRoot } from "../daily/useDaily";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SITE } from "@/lib/facts";
import { ADS } from "@/lib/lobby/ads";
import { TARGETS, type Bank } from "@/lib/polyword/bank";
import { accountOf, archiveOffer, ctasFor, pauseFrameAds, resultsAd, type Phase } from "@/lib/polyword/policy";
import { emptyProgress, firstGame, gameOf, isUnlocked, parseProgress, PROGRESS_KEY, statsFor, withGame, withUnlock, type Progress } from "@/lib/polyword/progress";
import { checkGuess, finished, keyMarks, MAX_GUESSES, puzzleFor, revealedHints, solved, meaningIn } from "@/lib/polyword/puzzle";
import { installH5, requestReward } from "@/lib/polyword/reward";
import { shareText } from "@/lib/polyword/share";
import app from "../../app/app.module.css";
import Ad, { loadAdSense } from "../Ad";
import { useAccount } from "../Account";
import { usePauseAds } from "../AdsContext";
import { FlagSquare, RevealCard } from "../LearnWord";
import { langName } from "../langs";
import { Board, Keyboard } from "./Board";
import { WorldStage } from "../GameWorld";
import { LearnPanel } from "../Reveal";
import styles from "./polyword.module.css";
import { Countdown, HintTile, shortDate, useToday } from "./parts";
import { local } from "@/lib/storage";
import { Button, ButtonLink, Pill } from "@/ui";

const SHARE_URL = `${SITE}/play/polyword`;
const PLACEHOLDER_AD_MS = 5000;

type Unlock = { day: number; state: "offer" | "watching" | "nofill" | "dismissed" } | null;

export default function Polyword({ bank }: { bank: Bank }) {
  const today = useToday();
  const { entitlement, openSignIn } = useAccount();
  const account = accountOf(entitlement);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<string>("es");
  const [day, setDay] = useState<number | null>(null);
  const [view, setView] = useState<"game" | "archive">("game");
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [unlock, setUnlock] = useState<Unlock>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const strip = useRef<HTMLUListElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parseProgress(local()?.getItem(PROGRESS_KEY) ?? null);
    setProgress(p);
    if (p.lang && bank.langs[p.lang]?.length) setLang(p.lang);
    setLoaded(true);
  }, [bank]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const lastToday = useRef<number | null>(null);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const dirty = useRef(false);
  const rewardTimer = useRef<number | undefined>(undefined);
  const watchId = useRef(0);

  useEffect(() => () => window.clearTimeout(rewardTimer.current), []);

  useEffect(() => {
    if (today === null) return;
    const prev = lastToday.current;
    lastToday.current = today;
    setDay((d) => {
      if (d === null || d > today) return today;
      if (prev !== null && d === prev && prev !== today) {
        const g = gameOf(progressRef.current, lang, d);
        if (!g || g.done) return today;
      }
      return d;
    });
  }, [today, lang]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    dirty.current = true;
    setProgress(fn);
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      local()?.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      flash("This browser is not saving your progress");
    }
  }, [progress, flash]);

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === PROGRESS_KEY && e.newValue) setProgress(parseProgress(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const puzzle = useMemo(() => (day ? puzzleFor(bank, lang, day) : null), [bank, lang, day]);
  const learnerRoot = useLearnerRoot();
  const rootMeaning = puzzle ? meaningIn(bank, puzzle, learnerRoot ?? "en") : { lang: "en", text: "" };
  const game = puzzle ? gameOf(progress, lang, puzzle.day) : undefined;
  const guesses = useMemo(() => game?.guesses ?? [], [game]);
  const over = puzzle ? finished(guesses, puzzle.answer) : false;
  const won = puzzle ? solved(guesses, puzzle.answer) : false;
  const first = puzzle ? firstGame(progress, lang, puzzle.day) : true;
  const phase: Phase = view === "archive" ? "archive" : over ? "done" : "playing";
  const ready = loaded && today !== null && puzzle !== null;
  const pro = account === "paid";

  usePauseAds(!ready || pauseFrameAds(phase, first));

  const shown = puzzle ? revealedHints(puzzle, guesses).length : 0;
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const item = el.children[over ? 0 : Math.max(0, shown - 1)] as HTMLElement | undefined;
    el.scrollTo({ left: item ? item.offsetLeft - el.offsetLeft - 4 : 0, behavior: "smooth" });
  }, [shown, over]);

  const submit = useCallback(() => {
    if (!puzzle || over || today === null) return;
    const c = checkGuess(draft, puzzle.answer, guesses);
    if (!c.ok) {
      flash(c.reason === "short" ? `Use ${puzzle.answer.length} letters` : c.reason === "repeat" ? "You tried that word" : "Letters only");
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

  useEffect(() => {
    if (view !== "game" || unlock || over || !ready) return;
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") {
        if (el?.tagName === "BUTTON" || el?.tagName === "A") return;
        e.preventDefault();
        onKey("enter");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onKey("back");
      } else {
        const ch = e.key.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
        if (/^[a-z]$/.test(ch)) onKey(ch);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [view, unlock, over, ready, onKey]);

  const pickLang = (l: string) => {
    setLang(l);
    setDraft("");
    setView("game");
    if (today !== null) setDay(today);
    update((p) => ({ ...p, lang: l }));
  };

  const openDay = (d: number) => {
    if (today === null) return;
    if (isUnlocked(progress, lang, d, today, pro)) {
      setDay(d);
      setDraft("");
      setView("game");
      return;
    }
    setUnlock({ day: d, state: "offer" });
  };

  const grant = (d: number) => {
    update((p) => withUnlock(p, lang, d));
    setUnlock(null);
    setDay(d);
    setDraft("");
    setView("game");
  };

  const closeSheet = () => {
    watchId.current++;
    window.clearTimeout(rewardTimer.current);
    setUnlock(null);
  };

  const watch = async (d: number) => {
    const id = ++watchId.current;
    setUnlock({ day: d, state: "watching" });
    if (ADS.mode === "placeholder") {
      rewardTimer.current = window.setTimeout(() => grant(d), PLACEHOLDER_AD_MS);
      return;
    }
    if (ADS.client) loadAdSense(ADS.client);
    installH5(window as unknown as Parameters<typeof installH5>[0]);
    const r = await requestReward(window as unknown as Parameters<typeof requestReward>[0], "polyword-archive");
    if (id !== watchId.current) return;
    if (r === "viewed") grant(d);
    else setUnlock({ day: d, state: r === "dismissed" ? "dismissed" : "nofill" });
  };

  useEffect(() => {
    if (!unlock || unlock.state === "watching") return;
    sheet.current?.querySelector<HTMLElement>("button, a")?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [unlock]);

  const share = async () => {
    if (!puzzle) return;
    const text = shareText(puzzle, guesses, SHARE_URL);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      flash("Copied. Paste it in your group chat.");
    } catch {
      flash("Could not copy. Long-press to select the grid.");
    }
  };

  if (!ready || !puzzle || today === null) {
    return (
      <div className={styles.wrap} data-testid="polyword" aria-busy="true">
        <p className={app.muted}>Loading today’s word</p>
      </div>
    );
  }

  const stats = statsFor(progress, lang, today);
  const hints = revealedHints(puzzle, guesses);
  const marks = keyMarks(guesses, puzzle.answer);
  const ctas = ctasFor(account);
  const offer = archiveOffer(account, ADS.mode, true);
  const isToday = puzzle.day === today;

  return (
    <div className={styles.wrap} data-testid="polyword" data-phase={phase} data-account={account} data-round={phase === "playing" ? "active" : undefined}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Polyword</h2>
          <span className={styles.streak} data-testid="pw-streak" title="Daily streak">
            🔥 {stats.streak}
          </span>
        </div>
        <div className={styles.subRow}>
          <p className={styles.sub}>
            <FlagSquare lang={lang} size={18} /> {langName(lang)} · #{puzzle.day} · {isToday ? "Today" : shortDate(puzzle.day)}
          </p>
          <span className={styles.nav}>
            {view === "archive" || !isToday ? (
              <Pill onClick={() => openDay(today)} data-testid="pw-today">
                Today
              </Pill>
            ) : null}
            {view === "game" ? (
              <Pill onClick={() => setView("archive")} data-testid="pw-archive-open">
                Archive
              </Pill>
            ) : null}
          </span>
        </div>
        <div className={styles.langs} role="group" aria-label="Language" data-testid="pw-langs">
          {TARGETS.filter((l) => bank.langs[l]?.length).map((l) => (
            <button key={l} type="button" className={styles.lang} aria-pressed={l === lang} onClick={() => pickLang(l)} title={langName(l)} data-testid={`pw-lang-${l}`}>
              <FlagSquare lang={l} size={20} />
              <span>{l.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </header>

      <p className={styles.toast} role="status" aria-live="polite" data-testid="pw-toast" data-on={toast ? true : undefined}>
        {toast}
      </p>

      {view === "archive" ? (
        <section className={styles.archive} aria-labelledby="pw-archive" data-testid="pw-archive">
          <h2 id="pw-archive" className={styles.h2}>
            Past puzzles in {langName(lang)}
          </h2>
          <p className={app.small}>{pro ? "Pro opens every past puzzle." : "Today’s puzzle is free. Open a past one with a short ad, or go Pro for all of them."}</p>
          <ol className={styles.days}>
            {Array.from({ length: today - 1 }, (_, i) => today - 1 - i).map((d) => {
              const g = gameOf(progress, lang, d);
              const open = isUnlocked(progress, lang, d, today, pro);
              const state = g?.done ? (g.won ? "won" : "lost") : g ? "started" : open ? "open" : "locked";
              return (
                <li key={d}>
                  <button type="button" className={styles.day} data-state={state} onClick={() => openDay(d)} data-testid={`pw-day-${d}`} aria-label={`Puzzle ${d}, ${shortDate(d)}, ${state}`}>
                    <b>#{d}</b>
                    <span>{shortDate(d)}</span>
                    <i aria-hidden="true">{state === "won" ? "✓" : state === "lost" ? "✕" : state === "locked" ? "🔒" : "▶"}</i>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <>
          <WorldStage id="polyword" className={styles.pwStage}>
            <Board guesses={guesses} draft={draft} answer={puzzle.answer} shake={shake} />
          </WorldStage>

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

          {over ? (
            <section className={styles.results} aria-labelledby="pw-result" data-testid="pw-results" data-won={won}>
              <h2 id="pw-result" className={styles.resultHead}>
                {won ? (guesses.length === 1 ? "First try!" : `Solved in ${guesses.length}`) : "Next time"}
              </h2>
              <ul className={styles.answer}>
                <RevealCard entry={{ lang, word: puzzle.word, roman: puzzle.roman ?? null, reading: null, meaning: rootMeaning.text, gloss: rootMeaning.text, correct: won }} index={0} rootLang={rootMeaning.lang} />
              </ul>
              <dl className={styles.stats} data-testid="pw-stats">
                <div>
                  <dt>Played</dt>
                  <dd>{stats.played}</dd>
                </div>
                <div>
                  <dt>Win %</dt>
                  <dd>{stats.played ? Math.round((100 * stats.won) / stats.played) : 0}</dd>
                </div>
                <div>
                  <dt>Streak</dt>
                  <dd>{stats.streak}</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd>{stats.best}</dd>
                </div>
              </dl>
              <ol className={styles.dist} aria-label="Guess distribution">
                {stats.dist.map((n, i) => (
                  <li key={i} data-mine={won && !game?.archive && guesses.length === i + 1 ? true : undefined}>
                    <span>{i + 1}</span>
                    <b style={{ width: `${Math.max(8, (100 * n) / Math.max(1, ...stats.dist))}%` }}>{n}</b>
                  </li>
                ))}
              </ol>
              <div className={styles.actions}>
                <Button onClick={() => void share()} data-testid="pw-share">
                  Share {won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}
                </Button>
                <Button variant="ghost" size="md" onClick={() => setView("archive")} data-testid="pw-more">
                  Play past puzzles
                </Button>
              </div>
              {isToday ? (
                <p className={app.small}>
                  Next {langName(lang)} word in <Countdown />. Or try today’s word in another language above.
                </p>
              ) : null}
              {ctas.length ? (
                <div className={styles.learn} data-testid="pw-ctas">
                  <p>
                    <b>{pro ? "Keep the words you met today." : `Learn ${puzzle.word} and the words around it.`}</b> {pro ? "Your review deck is waiting." : "Polingual teaches one meaning across all your languages at once."}
                  </p>
                  <div className={app.row}>
                    {ctas.map((c) =>
                      c.id === "sign-in" ? (
                        <Button key={c.id} variant="ghost" size="md" onDark onClick={openSignIn} data-testid={`pw-cta-${c.id}`}>
                          {c.label}
                        </Button>
                      ) : (
                        <ButtonLink key={c.id} href={c.href} variant={c.primary ? "primary" : "ghost"} size={c.primary ? "lg" : "md"} data-testid={`pw-cta-${c.id}`}>
                          {c.label}
                        </ButtonLink>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              <LearnPanel cta={!ctas.length} missed={won ? [] : [{ lang, word: puzzle.word, meaning: puzzle.gloss }]} />
              {resultsAd(phase, first, account) ? <Ad placement="results" testId="pw-ad-results" /> : null}
            </section>
          ) : (
            <Keyboard marks={marks} onKey={onKey} disabled={over} />
          )}
        </>
      )}

      {unlock ? (
        <div className={styles.sheetBack} role="dialog" aria-modal="true" aria-labelledby="pw-unlock" data-testid="pw-unlock">
          <div className={styles.sheet} ref={sheet}>
            <h2 id="pw-unlock" className={styles.h2}>
              Puzzle #{unlock.day}, {shortDate(unlock.day)}
            </h2>
            {unlock.state === "watching" ? (
              <div className={styles.adBox} data-testid="pw-ad-reward" aria-label="Advertisement">
                {ADS.mode === "placeholder" ? "Ad · your puzzle opens in a few seconds" : "Loading ad"}
              </div>
            ) : (
              <>
                <p className={app.small}>
                  {unlock.state === "nofill" ? "No ad is ready right now. Try again in a minute, or go Pro." : unlock.state === "dismissed" ? "The ad closed early, so the puzzle stays locked." : "Past puzzles open with a short ad, or all at once with Pro."}
                </p>
                <div className={styles.sheetActions}>
                  {!offer.pro && offer.rewarded ? (
                    <Button onClick={() => void watch(unlock.day)} data-testid="pw-watch">
                      Watch an ad
                    </Button>
                  ) : null}
                  <ButtonLink href="/app?from=polyword-archive" variant={!offer.pro && offer.rewarded ? "ghost" : "primary"} size={!offer.pro && offer.rewarded ? "md" : "lg"} data-testid="pw-pro">
                    Go Pro
                  </ButtonLink>
                </div>
              </>
            )}
            {unlock.state !== "watching" || ADS.mode !== "placeholder" ? (
              <Button variant="quiet" size="sm" onClick={closeSheet} data-testid="pw-unlock-close">
                Not now
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
