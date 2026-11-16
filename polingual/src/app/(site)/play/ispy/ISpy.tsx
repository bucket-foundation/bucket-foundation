"use client";

import GameResults from "../GameResults";
import { useLearnerRoot } from "../daily/useDaily";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SPY_ROUND_SECONDS, SPY_SCENES, spyScene, type SpyRound } from "@academy/ispy";
import type { RevealEntry } from "@academy/lobbies";
import { LANGS } from "@academy/lang-systems";
import { award, boardPlayers, botTurns, myRank, roundLeft, settle, SPY_BOTS, type Tally } from "@/lib/lobby/ispy-solo";
import { play, readMuted } from "@/lib/lobby/sound";
import app from "../../app/app.module.css";
import { LANG_SETS, langName } from "../langs";
import { RevealCard } from "../LearnWord";
import GamePage from "../GamePage";
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

function useBots(seed: { current: string }) {
  const [bots, setBots] = useState<Record<string, Tally>>({});
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const settleBots = useCallback((index: number, uptoMs: number) => {
    const turns = botTurns(seed.current, index, SPY_ROUND_SECONDS).filter((t) => t.atMs <= uptoMs);
    setAnswered((prev) => {
      const fresh = turns.filter((t) => !prev.has(t.botId));
      if (!fresh.length) return prev;
      setBots((b) => settle(b, fresh, SPY_ROUND_SECONDS));
      return new Set([...prev, ...fresh.map((t) => t.botId)]);
    });
  }, [seed]);
  return { bots, setBots, answered, setAnswered, settleBots };
}

function useRoundClock(phase: Phase, tapped: boolean, settleBots: (i: number, ms: number) => void, toReveal: (i: number, correct: boolean) => void, next: () => void) {
  const [now, setNow] = useState(0);
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
  useEffect(() => {
    if (phase.kind !== "reveal") return;
    const id = window.setTimeout(next, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, next]);
  return now;
}

function useRounds(set: (typeof SETS)[number], root: string | null, seed: { current: string }, onDealt: () => void) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [misses, setMisses] = useState<number[]>([]);
  const start = useCallback(() => {
    seed.current = String(Date.now());
    setPhase({ kind: "loading" });
    setMisses([]);
    fetch(`/api/academy/ispy?root=${root ?? set.root}&langs=${set.targets.join(",")}&seed=${seed.current}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { rounds: Round[] }) => {
        setRounds(d.rounds);
        onDealt();
        setPhase({ kind: "round", index: 0, startedAt: Date.now() });
      })
      .catch(() => setPhase({ kind: "error" }));
  }, [set]);
  return { rounds, phase, setPhase, misses, setMisses, start };
}

function useISpy() {
  const [set, setSet] = useState(SETS[0]);
  const root = useLearnerRoot();
  const [me, setMe] = useState<Tally>({ score: 0, streak: 0 });
  const [marks, setMarks] = useState<Record<string, SpyMark>>({});
  const [pop, setPop] = useState<{ key: number; points: number } | null>(null);
  const [tapped, setTapped] = useState(false);
  const [muted, setMuted] = useState(false);
  const seed = useRef("1");
  const b = useBots(seed);
  const r = useRounds(set, root, seed, () => { setMe({ score: 0, streak: 0 }); b.setBots({}); setMarks({}); b.setAnswered(new Set()); setTapped(false); });
  const { rounds, phase, setPhase } = r;

  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);

  const current = phase.kind === "round" || phase.kind === "reveal" ? rounds[phase.index] : null;
  const scene = useMemo(() => (current ? spyScene(current.scene) : null), [current]);
  const { settleBots, setAnswered } = b;
  const { setMisses } = r;

  const toReveal = useCallback((index: number, correct: boolean) => {
    settleBots(index, SPY_ROUND_SECONDS * 1000);
    setMarks((m) => (correct ? m : { ...m, [rounds[index].answer]: "answer" }));
    if (!correct) setMisses((xs) => (xs.includes(index) ? xs : [...xs, index]));
    setPhase({ kind: "reveal", index, correct });
  }, [rounds, settleBots, setMisses, setPhase]);

  const next = useCallback(() => {
    if (phase.kind !== "reveal") return;
    setMarks({});
    setAnswered(new Set());
    setTapped(false);
    if (phase.index + 1 >= rounds.length) setPhase({ kind: "done" });
    else setPhase({ kind: "round", index: phase.index + 1, startedAt: Date.now() });
  }, [phase, rounds.length, setAnswered, setPhase]);

  const now = useRoundClock(phase, tapped, settleBots, toReveal, next);

  const tap = (id: string) => {
    if (phase.kind !== "round" || !current || tapped) return;
    setTapped(true);
    const correct = id === current.answer;
    const res = award(me, correct, Date.now() - phase.startedAt, SPY_ROUND_SECONDS);
    setMe({ score: res.score, streak: res.streak });
    setMarks({ [id]: correct ? "right" : "wrong" });
    play(correct ? "win" : "miss", muted);
    if (res.points) setPop({ key: Date.now(), points: res.points });
    window.setTimeout(() => toReveal(phase.index, correct), correct ? 450 : 700);
  };

  const locked = phase.kind !== "round" || tapped;
  const remaining = phase.kind === "round" ? roundLeft(now, phase.startedAt, SPY_ROUND_SECONDS) : 0;
  const players = boardPlayers({ name: "You", score: me.score, answered: phase.kind === "round" && locked }, SPY_BOTS, b.bots, b.answered);
  return { set, setSet, root, me, marks, pop, current, scene, next, tap, locked, remaining, players, ...r };
}

type Game = ReturnType<typeof useISpy>;

function Setup({ g }: { g: Game }) {
  const { phase } = g;
  return (
    <div className={app.stack} data-testid="ispy-setup">
      <p className={app.muted}>A word appears in another language. Find it in the picture before the bots do.</p>
      <div className={styles.setup} role="group" aria-label="Languages">
        {SETS.map((s) => (
          <Pill key={s.id} active={s.id === g.set.id} onClick={() => g.setSet(s)}>{s.label}</Pill>
        ))}
      </div>
      <div>
        <Button onClick={g.start} disabled={phase.kind === "loading"} data-testid="ispy-start">{phase.kind === "loading" ? "Setting the scene" : "Play solo"}</Button>{" "}
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

function Done({ g }: { g: Game }) {
  const { rounds, misses, players } = g;
  const rank = myRank(players);
  return (
    <div className={app.stack} data-testid="ispy-done">
      <h2 className={app.title}>{rank === 1 ? "You spied them all first" : `You finished #${rank}`}</h2>
      <LiveBoard players={players} live={false} />
      <GameResults rootLang={g.root ?? "en"} title="Everything you spied" words={rounds.flatMap((r, i) => r.reveal.filter((e) => e.correct).slice(0, 1).map((e) => ({ lang: e.lang, word: e.word, meaning: e.meaning, gloss: e.gloss, roman: e.roman, reading: e.reading, correct: !misses.includes(i) })))} missed={misses.flatMap((i) => rounds[i]?.reveal.filter((e) => e.correct).slice(0, 1).map((e) => ({ lang: e.lang, word: e.word, meaning: e.meaning })) ?? [])} />
      <div>
        <Button onClick={g.start} data-testid="ispy-again">Play again</Button>{" "}
        <ButtonLink variant="ghost" href="/play">Back to games</ButtonLink>
      </div>
    </div>
  );
}

function Reveal({ g, current, scene, correct }: { g: Game; current: Round; scene: NonNullable<Game["scene"]>; correct: boolean }) {
  const obj = scene.objects.find((o) => o.id === current.answer);
  return (
    <div className={styles.reveal} data-testid="spy-reveal">
      <div className={styles.revealRow}>
        {obj ? <ObjectArt id={obj.id} size={64} /> : null}
        <b>{correct ? "✓ Spotted" : "Here it was"}</b>
        <Button size="sm" variant="ghost" onClick={g.next}>Next</Button>
      </div>
      <ul className={playStyles.revealGrid}>
        {current.reveal.map((e, i) => (
          <RevealCard key={`${e.lang}:${i}`} entry={e} index={i} rootLang={g.root ?? "en"} />
        ))}
      </ul>
    </div>
  );
}

function Room({ g, current, scene }: { g: Game; current: Round; scene: NonNullable<Game["scene"]> }) {
  const { phase, pop, me } = g;
  if (phase.kind !== "round" && phase.kind !== "reveal") return null;
  return (
    <div className={app.stack} data-testid="ispy-room" data-round={phase.kind === "round" ? "active" : "reveal"}>
      {pop ? <p className={playStyles.pop} key={pop.key} data-testid="score-pop">+{pop.points}</p> : null}
      <div className={styles.hud}>
        <span className={app.small}>{scene.name} · round {phase.index + 1} of {g.rounds.length}</span>
        <span className={app.small}>{me.streak > 1 ? `Streak ${me.streak}` : null}</span>
      </div>
      <div className={playStyles.stage}>
        <div className={playStyles.arena}>
          <div className={playStyles.timer} aria-hidden="true">
            <div className={playStyles.timerFill} style={{ width: `${g.remaining * 100}%` }} />
          </div>
          <div className={styles.spy}>
            <span className={styles.spyLead}>I spy…</span>
            <span className={styles.spyWord} lang={current.lang} dir={LANGS[current.lang]?.rtl ? "rtl" : undefined} data-testid="spy-word">{current.gloss}</span>
            <span className={app.small}>{langName(current.lang)}</span>
          </div>
          <Scene scene={scene} marks={g.marks} locked={g.locked} onTap={g.tap} />
          {phase.kind === "reveal" ? <Reveal g={g} current={current} scene={scene} correct={phase.correct} /> : null}
        </div>
        <aside className={playStyles.side}>
          <LiveBoard players={g.players} live={phase.kind === "round"} />
        </aside>
      </div>
    </div>
  );
}

function ISpyGame() {
  const g = useISpy();
  const { phase, current, scene } = g;
  if (phase.kind === "setup" || phase.kind === "loading" || phase.kind === "error") return <Setup g={g} />;
  if (phase.kind === "done") return <Done g={g} />;
  if (!current || !scene) return null;
  return <Room g={g} current={current} scene={scene} />;
}

export default function ISpy() {
  return <GamePage id="ispy">{() => <ISpyGame />}</GamePage>;
}
