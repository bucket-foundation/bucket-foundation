"use client";

import { useLearnerRoot } from "../daily/useDaily";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SPY_ROUND_SECONDS, SPY_SCENES, spyScene, type SpyRound } from "@academy/ispy";
import type { RevealEntry } from "@academy/lobbies";
import { LANGS } from "@academy/lang-systems";
import { award, boardPlayers, botTurns, SPY_BOTS, type Tally } from "@/lib/lobby/ispy-solo";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import { LANG_SETS, langName } from "../langs";
import { RevealCard } from "../LearnWord";
import GameWorld from "../GameWorld";
import { LearnPanel, WordReveal } from "../Reveal";
import LiveBoard from "../LiveBoard";
import playStyles from "../play.module.css";
import { ObjectArt } from "@/ui/art/objects";
import Scene, { type SpyMark } from "./Scene";
import styles from "./ispy.module.css";
import { Button, ButtonLink, Pill } from "@/ui";

type Round = SpyRound & { reveal: RevealEntry[] };
type Phase = { kind: "setup" } | { kind: "loading" } | { kind: "error" } | { kind: "round"; index: number; startedAt: number } | { kind: "reveal"; index: number; correct: boolean } | { kind: "done" };

const REVEAL_MS = 3200;
const SETS = [{ id: "mix", label: "Chinese, Russian, Hindi, Spanish", root: "en", targets: ["zh", "ru", "hi", "es"] }, ...LANG_SETS];

function ISpyGame() {
  const [set, setSet] = useState(SETS[0]);
  const root = useLearnerRoot();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [me, setMe] = useState<Tally>({ score: 0, streak: 0 });
  const [bots, setBots] = useState<Record<string, Tally>>({});
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState<number[]>([]);
  const [marks, setMarks] = useState<Record<string, SpyMark>>({});
  const [pop, setPop] = useState<{ key: number; points: number } | null>(null);
  const [now, setNow] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [muted, setMuted] = useState(false);
  const seed = useRef("1");

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const start = useCallback(() => {
    seed.current = String(Date.now());
    setPhase({ kind: "loading" });
    setMisses([]);
    fetch(`/api/academy/ispy?root=${root ?? set.root}&langs=${set.targets.join(",")}&seed=${seed.current}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { rounds: Round[] }) => {
        setRounds(d.rounds);
        setMe({ score: 0, streak: 0 });
        setBots({});
        setMarks({});
        setAnswered(new Set());
        setTapped(false);
        setPhase({ kind: "round", index: 0, startedAt: Date.now() });
      })
      .catch(() => setPhase({ kind: "error" }));
  }, [set]);

  const current = phase.kind === "round" || phase.kind === "reveal" ? rounds[phase.index] : null;
  const scene = useMemo(() => (current ? spyScene(current.scene) : null), [current]);

  const settleBots = useCallback((index: number, uptoMs: number) => {
    const turns = botTurns(seed.current, index, SPY_ROUND_SECONDS).filter((t) => t.atMs <= uptoMs);
    setAnswered((prev) => {
      const fresh = turns.filter((t) => !prev.has(t.botId));
      if (!fresh.length) return prev;
      setBots((b) => {
        const next = { ...b };
        for (const t of fresh) next[t.botId] = award(next[t.botId] ?? { score: 0, streak: 0 }, t.correct, t.atMs, SPY_ROUND_SECONDS);
        return next;
      });
      return new Set([...prev, ...fresh.map((t) => t.botId)]);
    });
  }, []);

  const toReveal = useCallback((index: number, correct: boolean) => {
    const r = rounds[index];
    settleBots(index, SPY_ROUND_SECONDS * 1000);
    setMarks((m) => (correct ? m : { ...m, [r.answer]: "answer" }));
    if (!correct) setMisses((xs) => (xs.includes(index) ? xs : [...xs, index]));
    setPhase({ kind: "reveal", index, correct });
  }, [rounds, settleBots]);

  useEffect(() => {
    if (phase.kind !== "round") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const elapsed = t - phase.startedAt;
      settleBots(phase.index, elapsed);
      if (elapsed >= SPY_ROUND_SECONDS * 1000 && !tapped) toReveal(phase.index, false);
    }, 150);
    return () => window.clearInterval(id);
  }, [phase, settleBots, toReveal, tapped]);

  const next = useCallback(() => {
    if (phase.kind !== "reveal") return;
    setMarks({});
    setAnswered(new Set());
    setTapped(false);
    if (phase.index + 1 >= rounds.length) setPhase({ kind: "done" });
    else setPhase({ kind: "round", index: phase.index + 1, startedAt: Date.now() });
  }, [phase, rounds.length]);

  useEffect(() => {
    if (phase.kind !== "reveal") return;
    const id = window.setTimeout(next, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, next]);

  const tap = (id: string) => {
    if (phase.kind !== "round" || !current || tapped) return;
    setTapped(true);
    const ms = Date.now() - phase.startedAt;
    const correct = id === current.answer;
    const res = award(me, correct, ms, SPY_ROUND_SECONDS);
    setMe({ score: res.score, streak: res.streak });
    setMarks({ [id]: correct ? "right" : "wrong" });
    play(correct ? "win" : "miss", muted);
    if (res.points) setPop({ key: Date.now(), points: res.points });
    window.setTimeout(() => toReveal(phase.index, correct), correct ? 450 : 700);
  };

  const locked = phase.kind !== "round" || tapped;
  const remaining = phase.kind === "round" ? Math.max(0, 1 - (now - phase.startedAt) / (SPY_ROUND_SECONDS * 1000)) : 0;
  const players = boardPlayers({ name: "You", score: me.score, answered: phase.kind === "round" && locked }, SPY_BOTS, bots, answered);

  if (phase.kind === "setup" || phase.kind === "loading" || phase.kind === "error") {
    return (
      <div className={app.stack} data-testid="ispy-setup">
        <p className={app.muted}>A word appears in another language. Find it in the picture before the bots do.</p>
        <div className={styles.setup} role="group" aria-label="Languages">
          {SETS.map((s) => (
            <Pill key={s.id} active={s.id === set.id} onClick={() => setSet(s)}>{s.label}</Pill>
          ))}
        </div>
        <div>
          <Button onClick={start} disabled={phase.kind === "loading"} data-testid="ispy-start">{phase.kind === "loading" ? "Setting the scene" : "Play solo"}</Button>{" "}
          <ButtonLink variant="ghost" href="/play">Play with friends</ButtonLink>
        </div>
        {phase.kind === "error" ? <p className={app.small} role="alert">The words did not load. Try again.</p> : null}
        <div className={styles.preview} data-testid="ispy-preview">
          <Scene scene={SPY_SCENES[0]} marks={{}} locked onTap={() => undefined} />
          <span className={styles.previewTag}>{`${SPY_SCENES.length} scenes · ${SPY_SCENES.reduce((n, sc) => n + sc.objects.length, 0)} things to spy`}</span>
        </div>
      </div>
    );
  }

  if (phase.kind === "done") {
    const rank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.isMe) + 1;
    return (
      <div className={app.stack} data-testid="ispy-done">
        <h2 className={app.title}>{rank === 1 ? "You spied them all first" : `You finished #${rank}`}</h2>
        <LiveBoard players={players} live={false} />
        <WordReveal rootLang={root ?? "en"} title="Everything you spied" words={rounds.flatMap((r, i) => r.reveal.filter((e) => e.correct).slice(0, 1).map((e) => ({ lang: e.lang, word: e.word, meaning: e.meaning, gloss: e.gloss, roman: e.roman, reading: e.reading, correct: !misses.includes(i) })))} />
        <LearnPanel missed={misses.flatMap((i) => rounds[i]?.reveal.filter((e) => e.correct).slice(0, 1).map((e) => ({ lang: e.lang, word: e.word, meaning: e.meaning })) ?? [])} />
        <div>
          <Button onClick={start} data-testid="ispy-again">Play again</Button>{" "}
          <ButtonLink variant="ghost" href="/play">Back to games</ButtonLink>
        </div>
      </div>
    );
  }

  if (!current || !scene) return null;
  const obj = scene.objects.find((o) => o.id === current.answer);
  return (
    <div className={app.stack} data-testid="ispy-room" data-round={phase.kind === "round" ? "active" : "reveal"}>
      {pop ? <p className={playStyles.pop} key={pop.key} data-testid="score-pop">+{pop.points}</p> : null}
      <div className={styles.hud}>
        <span className={app.small}>{scene.name} · round {phase.index + 1} of {rounds.length}</span>
        <span className={app.small}>{me.streak > 1 ? `Streak ${me.streak}` : null}</span>
      </div>
      <div className={playStyles.stage}>
        <div className={playStyles.arena}>
          <div className={playStyles.timer} aria-hidden="true">
            <div className={playStyles.timerFill} style={{ width: `${remaining * 100}%` }} />
          </div>
          <div className={styles.spy}>
            <span className={styles.spyLead}>I spy…</span>
            <span className={styles.spyWord} lang={current.lang} dir={LANGS[current.lang]?.rtl ? "rtl" : undefined} data-testid="spy-word">{current.gloss}</span>
            <span className={app.small}>{langName(current.lang)}</span>
          </div>
          <Scene scene={scene} marks={marks} locked={locked} onTap={tap} />
          {phase.kind === "reveal" ? (
            <div className={styles.reveal} data-testid="spy-reveal">
              <div className={styles.revealRow}>
                {obj ? <ObjectArt id={obj.id} size={64} /> : null}
                <b>{phase.correct ? "✓ Spotted" : "Here it was"}</b>
                <Button size="sm" variant="ghost" onClick={next}>Next</Button>
              </div>
              <ul className={playStyles.revealGrid}>
                {current.reveal.map((e, i) => (
                  <RevealCard key={`${e.lang}:${i}`} entry={e} index={i} rootLang={root ?? "en"} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <aside className={playStyles.side}>
          <LiveBoard players={players} live={phase.kind === "round"} />
        </aside>
      </div>
    </div>
  );
}

export default function ISpy() {
  return (
    <GameWorld id="ispy">
      <ISpyGame />
    </GameWorld>
  );
}
