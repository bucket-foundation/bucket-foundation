"use client";

import GameResults from "../GameResults";
import { local } from "@/lib/storage";
import { useLearnerRoot } from "../daily/useDaily";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { FOREHEAD_SECONDS, type ForeheadCard } from "@academy/forehead";
import { LANGS } from "@academy/lang-systems";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { cardFit, secondsUntil, toggleLang } from "@/lib/lobby/forehead-play";
import { play, readMuted } from "@/lib/lobby/sound";
import { classifyTilt, settled } from "@/lib/lobby/tilt";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { LANG_CHOICES, LANG_SETS, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import GamePage from "../GamePage";
import { pieceClass, WorldStickers } from "../GameWorld";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

type Phase = "setup" | "count" | "play" | "done";
type Result = { card: ForeheadCard; got: boolean };

type MotionPermission = { requestPermission?: () => Promise<string> };

function useTilt(phase: Phase, motion: boolean, armed: MutableRefObject<boolean>, mark: (got: boolean) => void) {
  useEffect(() => {
    if (phase !== "play" || !motion) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const z = e.accelerationIncludingGravity?.z ?? null;
      if (!armed.current) {
        if (settled(z)) armed.current = true;
        return;
      }
      const t = classifyTilt(z);
      if (t) {
        armed.current = false;
        mark(t === "score");
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [phase, motion, mark, armed]);
}

function useClock(phase: Phase, setPhase: (p: Phase) => void, count: number, setCount: (f: (c: number) => number) => void, setLeft: (s: number) => void) {
  const endAt = useRef(0);
  useEffect(() => {
    if (phase === "count") {
      if (count <= 0) {
        endAt.current = Date.now() + FOREHEAD_SECONDS * 1000;
        setPhase("play");
        return;
      }
      const t = window.setTimeout(() => setCount((c) => c - 1), 1000);
      return () => window.clearTimeout(t);
    }
    if (phase === "play") {
      const t = window.setInterval(() => {
        const s = secondsUntil(endAt.current, Date.now());
        setLeft(s);
        if (s === 0) setPhase("done");
      }, 200);
      return () => window.clearInterval(t);
    }
  }, [phase, count, setPhase, setCount, setLeft]);
}

function useWakeLock(phase: Phase) {
  useEffect(() => {
    if (phase !== "play" && phase !== "count") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [phase]);
}

function useRoundEnd(phase: Phase, setPhase: (p: Phase) => void, index: number, total: number, muted: boolean) {
  const [showAd, setShowAd] = useState(false);
  useEffect(() => {
    if (phase === "play" && total && index >= total) setPhase("done");
  }, [phase, index, total, setPhase]);
  useEffect(() => {
    if (phase !== "done") return;
    play("win", muted);
    const b = readBreaks(local);
    writeBreaks(local, { ...b, games: b.games + 1 });
    setShowAd(b.games + 1 >= 2);
  }, [phase, muted]);
  return showAd;
}

function useDeck(langs: string[], root: string | null, onDealt: (cards: ForeheadCard[]) => void) {
  const [error, setError] = useState<string | null>(null);
  const [motion, setMotion] = useState(false);
  const loading = useRef(false);
  const start = async () => {
    if (loading.current) return;
    loading.current = true;
    setError(null);
    const perm = (globalThis as { DeviceMotionEvent?: MotionPermission }).DeviceMotionEvent;
    let ok = typeof window !== "undefined" && "DeviceMotionEvent" in window && window.matchMedia("(pointer:coarse)").matches;
    if (ok && perm?.requestPermission) ok = await perm.requestPermission().then((r) => r === "granted").catch(() => false);
    setMotion(ok);
    const seed = String(1 + Math.floor(Math.random() * 1e12));
    try {
      const res = await fetch(`/api/academy/forehead?langs=${langs.join(",")}&seed=${seed}&root=${root ?? "en"}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { cards: ForeheadCard[] };
      onDealt(data.cards);
    } catch {
      setError("The deck could not load. Try again.");
    } finally {
      loading.current = false;
    }
  };
  return { start, error, motion };
}

function useForehead() {
  const [langs, setLangs] = useState<string[]>(LANG_SETS[0].targets);
  const root = useLearnerRoot();
  const [phase, setPhase] = useState<Phase>("setup");
  const [cards, setCards] = useState<ForeheadCard[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(FOREHEAD_SECONDS);
  const [count, setCount] = useState(3);
  const [flash, setFlash] = useState<"got" | "pass" | null>(null);
  const [muted, setMuted] = useState(false);
  const armed = useRef(true);

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const mark = useCallback(
    (got: boolean) => {
      if (phase !== "play" || !cards[index]) return;
      play(got ? "hit" : "tap", muted);
      setResults((r) => [...r, { card: cards[index], got }]);
      setFlash(got ? "got" : "pass");
      window.setTimeout(() => setFlash(null), 450);
      setIndex((i) => i + 1);
    },
    [phase, cards, index, muted],
  );

  const deck = useDeck(langs, root, (dealt) => {
    setCards(dealt);
    setIndex(0);
    setResults([]);
    setLeft(FOREHEAD_SECONDS);
    setCount(3);
    armed.current = true;
    setPhase("count");
  });
  useTilt(phase, deck.motion, armed, mark);
  useClock(phase, setPhase, count, setCount, setLeft);
  useWakeLock(phase);
  const showAd = useRoundEnd(phase, setPhase, index, cards.length, muted);

  return { langs, setLangs, root, phase, setPhase, cards, index, results, left, count, flash, mark, showAd, ...deck };
}

type Game = ReturnType<typeof useForehead>;

function Setup({ g }: { g: Game }) {
  return (
    <div className={app.stack} data-testid="forehead">
      <section className={app.stackSm}>
        <p className={app.label}>Party mode · one phone</p>
        <p className={app.muted}>Hold the phone to your forehead, screen out. Friends give clues in any language. Tilt down when you guess it, tilt up to pass. Sixty seconds a round.</p>
      </section>
      <div className={app.stackSm} role="group" aria-label="Languages">
        <span className={app.fieldLabel}>Languages on the cards</span>
        <div className={styles.chips}>
          {LANG_CHOICES.map((l) => (
            <Pill key={l} aria-pressed={g.langs.includes(l)} onClick={() => g.setLangs((xs) => toggleLang(xs, l))} data-testid={`fh-lang-${l}`}>
              <FlagSquare lang={l} size={18} />
              {langName(l)}
            </Pill>
          ))}
        </div>
      </div>
      <div className={app.row}>
        <Button disabled={g.langs.length === 0} onClick={() => void g.start()} data-testid="fh-start">Start round</Button>
        <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
      </div>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function Countdown({ count }: { count: number }) {
  return (
    <div className={styles.fhStage} data-testid="fh-count" data-round="active">
      <WorldStickers id="forehead" />
      <p className={styles.bigCount} key={count}>{count || "Go"}</p>
      <p className={styles.fhHint}>Put the phone on your forehead</p>
    </div>
  );
}

function Card({ g, c }: { g: Game; c: ForeheadCard }) {
  return (
    <div className={styles.fhStage} data-flash={g.flash ?? undefined} data-testid="fh-play" data-round="active">
      <WorldStickers id="forehead" />
      <div className={styles.fhTop}>
        <span className={styles.fhTime} data-testid="fh-time">{g.left}</span>
        <span className={styles.fhScore}>{g.results.filter((r) => r.got).length}</span>
      </div>
      <div className={`${styles.fhCard} ${pieceClass("ticket")}`}>
        <span className={styles.fhLang}>
          <FlagSquare lang={c.lang} size={28} />
          {langName(c.lang)}
        </span>
        <span className={styles.fhStub}>{`CARD ${g.index + 1} · ${FOREHEAD_SECONDS} SECONDS`}</span>
        <b className={styles.fhWord} style={{ "--len": cardFit(c.form) } as React.CSSProperties} dir={LANGS[c.lang]?.rtl ? "rtl" : undefined} data-testid="fh-word">{c.form}</b>
      </div>
      <div className={styles.fhButtons}>
        <button type="button" className={styles.fhPass} onClick={() => g.mark(false)} data-testid="fh-pass">Pass</button>
        <button type="button" className={styles.fhGot} onClick={() => g.mark(true)} data-testid="fh-got">Got it</button>
      </div>
    </div>
  );
}

function RoundOver({ g }: { g: Game }) {
  const { results, showAd } = g;
  const got = results.filter((r) => r.got).length;
  return (
    <div className={app.stack} data-testid="fh-results">
      <section className={app.stackSm}>
        <p className={app.label}>Round over</p>
        <h2 className={app.title} data-testid="fh-final">{got} guessed</h2>
        <p className={app.small}>{results.length - got} passed. Tap a card to hear it.</p>
      </section>
      <GameResults rootLang={g.root ?? "en"} title="This round's cards" words={results.map((r) => ({ lang: r.card.lang, word: r.card.form, meaning: r.card.meaning, reading: r.card.reading, correct: r.got }))} missed={results.filter((r) => !r.got).map((r) => ({ lang: r.card.lang, word: r.card.form, meaning: r.card.meaning }))} />
      <div className={app.row}>
        <Button onClick={() => void g.start()} data-testid="fh-again">Play again</Button>
        <Button variant="quiet" size="sm" onClick={() => g.setPhase("setup")}>Change languages</Button>
      </div>
      {showAd ? <Ad placement="results" /> : null}
    </div>
  );
}

function ForeheadGame() {
  const g = useForehead();
  if (g.phase === "setup") return <Setup g={g} />;
  if (g.phase === "count") return <Countdown count={g.count} />;
  if (g.phase === "play" && g.cards[g.index]) return <Card g={g} c={g.cards[g.index]} />;
  return <RoundOver g={g} />;
}

export default function Forehead() {
  return <GamePage id="forehead">{() => <ForeheadGame />}</GamePage>;
}
