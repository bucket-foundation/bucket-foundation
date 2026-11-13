"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOREHEAD_SECONDS, type ForeheadCard } from "@academy/forehead";
import { LANGS } from "@academy/lang-systems";
import { TileFace } from "@/app/tile";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { LEARN_HREF } from "@/lib/lobby/client";
import { play, readMuted } from "@/lib/lobby/sound";
import { classifyTilt, settled } from "@/lib/lobby/tilt";
import { bcp47 } from "@/lib/speak";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { LANG_CHOICES, LANG_SETS, langName } from "../langs";
import { entryReading, FlagSquare } from "../LearnWord";
import { PlayTile } from "../../word/Speak";
import styles from "../play.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

type Phase = "setup" | "count" | "play" | "done";
type Result = { card: ForeheadCard; got: boolean };

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type MotionPermission = { requestPermission?: () => Promise<string> };

export default function Forehead() {
  const [langs, setLangs] = useState<string[]>(LANG_SETS[0].targets);
  const [phase, setPhase] = useState<Phase>("setup");
  const [cards, setCards] = useState<ForeheadCard[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(FOREHEAD_SECONDS);
  const [count, setCount] = useState(3);
  const [flash, setFlash] = useState<"got" | "pass" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motion, setMotion] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const armed = useRef(true);
  const loading = useRef(false);
  const endAt = useRef(0);

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
  }, [phase, motion, mark]);

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
        const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
        setLeft(s);
        if (s === 0) setPhase("done");
      }, 200);
      return () => window.clearInterval(t);
    }
  }, [phase, count]);

  useEffect(() => {
    if (phase === "play" && cards.length && index >= cards.length) setPhase("done");
  }, [phase, index, cards.length]);

  useEffect(() => {
    if (phase !== "done") return;
    play("win", muted);
    const b = readBreaks(local);
    writeBreaks(local, { ...b, games: b.games + 1 });
    setShowAd(b.games + 1 >= 2);
  }, [phase, muted]);

  useEffect(() => {
    if (phase !== "play" && phase !== "count") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [phase]);

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
      const res = await fetch(`/api/academy/forehead?langs=${langs.join(",")}&seed=${seed}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { cards: ForeheadCard[] };
      setCards(data.cards);
      setIndex(0);
      setResults([]);
      setLeft(FOREHEAD_SECONDS);
      setCount(3);
      armed.current = true;
      setPhase("count");
    } catch {
      setError("The deck could not load. Try again.");
    } finally {
      loading.current = false;
    }
  };

  if (phase === "setup") {
    return (
      <div className={app.stack} data-testid="forehead">
        <section className={app.stackSm}>
          <p className={app.label}>Party mode · one phone</p>
          <h1 className={app.title}>Forehead</h1>
          <p className={app.muted}>Hold the phone to your forehead, screen out. Friends give clues in any language. Tilt down when you guess it, tilt up to pass. Sixty seconds a round.</p>
        </section>
        <div className={app.stackSm} role="group" aria-label="Languages">
          <span className={app.fieldLabel}>Languages on the cards</span>
          <div className={styles.chips}>
            {LANG_CHOICES.map((l) => (
              <Pill key={l} aria-pressed={langs.includes(l)} onClick={() => setLangs((xs) => (xs.includes(l) ? xs.filter((x) => x !== l) : xs.length >= 6 ? xs : [...xs, l]))} data-testid={`fh-lang-${l}`}>
                <FlagSquare lang={l} size={18} />
                {langName(l)}
              </Pill>
            ))}
          </div>
        </div>
        <div className={app.row}>
          <Button disabled={langs.length === 0} onClick={() => void start()} data-testid="fh-start">Start round</Button>
          <ButtonLink variant="ghost" size="md" href="/play">Lobbies</ButtonLink>
        </div>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  if (phase === "count") {
    return (
      <div className={styles.fhStage} data-testid="fh-count">
        <p className={styles.bigCount} key={count}>{count || "Go"}</p>
        <p className={styles.fhHint}>Put the phone on your forehead</p>
      </div>
    );
  }

  if (phase === "play" && cards[index]) {
    const c = cards[index];
    return (
      <div className={styles.fhStage} data-flash={flash ?? undefined} data-testid="fh-play">
        <div className={styles.fhTop}>
          <span className={styles.fhTime} data-testid="fh-time">{left}</span>
          <span className={styles.fhScore}>{results.filter((r) => r.got).length}</span>
        </div>
        <div className={styles.fhCard}>
          <span className={styles.fhLang}>
            <FlagSquare lang={c.lang} size={28} />
            {langName(c.lang)}
          </span>
          <b className={styles.fhWord} dir={LANGS[c.lang]?.rtl ? "rtl" : undefined} data-testid="fh-word">{c.form}</b>
        </div>
        <div className={styles.fhButtons}>
          <button type="button" className={styles.fhPass} onClick={() => mark(false)} data-testid="fh-pass">Pass</button>
          <button type="button" className={styles.fhGot} onClick={() => mark(true)} data-testid="fh-got">Got it</button>
        </div>
      </div>
    );
  }

  const got = results.filter((r) => r.got).length;
  return (
    <div className={app.stack} data-testid="fh-results">
      <section className={app.stackSm}>
        <p className={app.label}>Round over</p>
        <h1 className={app.title} data-testid="fh-final">{got} guessed</h1>
        <p className={app.small}>{results.length - got} passed. Tap a card to hear it.</p>
      </section>
      <ul className={styles.revealGrid}>
        {results.map((r, i) => (
          <li key={`${r.card.itemId}:${i}`} className={styles.revealCard} data-correct={r.got} data-testid="fh-card">
            <TileFace
              as="div"
              lang={r.card.lang}
              code={r.card.lang}
              label={langName(r.card.lang)}
              word={r.card.form}
              reading={entryReading({ reading: r.card.reading, roman: null })}
              rtl={LANGS[r.card.lang]?.rtl}
              index={Math.min(i, 3)}
              play={<PlayTile item={{ id: `fh:${i}`, text: r.card.form, lang: bcp47(r.card.lang) }} label={`Hear ${r.card.form}`} />}
            />
            <p className={styles.revealDef}>
              {r.got ? <b className={styles.revealMark}>✓ </b> : null}
              {r.card.meaning}
            </p>
          </li>
        ))}
      </ul>
      <div className={app.row}>
        <Button onClick={() => void start()} data-testid="fh-again">Play again</Button>
        <ButtonLink variant="ghost" size="md" href={LEARN_HREF}>Learn these words</ButtonLink>
        <Button variant="quiet" size="sm" onClick={() => setPhase("setup")}>Change languages</Button>
      </div>
      {showAd ? <Ad placement="results" /> : null}
    </div>
  );
}
