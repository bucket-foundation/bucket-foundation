"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { LobbyPromptRow } from "@academy/lobbies";
import { LANGS, langName, type LangItem } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { sceneOfChoices } from "@academy/ispy";
import { parseTile } from "@academy/lobby-tiles";
import { flagEmoji, langFlag } from "@/lib/lobby/client";
import { challengePoints, challengePrompts } from "@/lib/family/challenge-play";
import { parseChallenge } from "@/lib/family/share";
import { Button, ButtonLink } from "@/ui";
import app from "../../app/app.module.css";
import f from "../family/family.module.css";
import { SceneHold } from "../LazyHolds";

const Scene = dynamic(() => import("../ispy/Scene"), { loading: () => <SceneHold /> });
type Pick = string | number[];

export default function Challenge() {
  const [query, setQuery] = useState<URLSearchParams | null>(null);
  const [items, setItems] = useState<LangItem[] | null>(null);
  const [at, setAt] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [shownAt, setShownAt] = useState(0);
  useEffect(() => setQuery(new URLSearchParams(window.location.search)), []);
  const c = useMemo(() => (query ? parseChallenge(query) : null), [query]);
  useEffect(() => {
    if (!c) return;
    let live = true;
    void loadLangCorpus().then((x) => live && setItems(x?.items ?? []));
    return () => {
      live = false;
    };
  }, [c]);
  const prompts = useMemo(() => (c && items ? challengePrompts(items, c) : []), [c, items]);
  useEffect(() => setShownAt(Date.now()), [at, prompts.length]);
  if (!query) return null;
  if (!c) {
    return (
      <div className={app.stack}>
        <p className={app.error} role="alert">That challenge link is broken.</p>
        <ButtonLink variant="ghost" size="md" href="/play">Back to games</ButtonLink>
      </div>
    );
  }
  if (!items) return <p className={app.muted} aria-busy="true">Loading words</p>;
  const p = prompts[at];
  if (!p) return <ChallengeDone score={score} target={c.score} />;
  const pick = (choice: Pick) => {
    if (picked) return;
    setPicked(choice);
    setScore((s) => s + challengePoints(p, choice, Date.now() - shownAt));
  };
  return (
    <div className={f.play} data-testid="challenge">
      <p className={f.step}>Round {at + 1} of {prompts.length} · {score} points · beat {c.score}</p>
      <ChallengeRound key={at} p={p} picked={picked} pick={pick} />
      {picked ? <Button size="lg" onClick={() => { setPicked(null); setAt(at + 1); }} data-testid="challenge-next">Next</Button> : null}
    </div>
  );
}

function state(p: LobbyPromptRow, picked: Pick | null, c: string): { right?: boolean; wrong?: boolean } {
  if (picked === null) return {};
  return { right: c === p.answer, wrong: picked === c && c !== p.answer };
}

function ChallengeRound({ p, picked, pick }: { p: LobbyPromptRow; picked: Pick | null; pick: (c: Pick) => void }) {
  const scene = p.mode === "spy" ? sceneOfChoices(p.choices) : null;
  if (scene) {
    return (
      <>
        <p className={f.muted}>I spy, in {langName(p.lang)}</p>
        <p className={f.big} lang={LANGS[p.lang]?.bcp47}>{p.gloss}</p>
        <Scene scene={scene} marks={picked === null ? {} : { [String(picked)]: picked === p.answer ? "right" : "wrong" }} locked={picked !== null} onTap={(id) => pick(id)} />
      </>
    );
  }
  if (p.mode === "tiles") return <TilesRound p={p} picked={picked} pick={pick} />;
  const label = p.mode === "flag" ? "Which language is this word?" : p.mode === "meaning" ? `What does this ${langName(p.lang)} word mean?` : `Find this word in ${p.mode === "mixed" ? "any language at the table" : langName(p.lang)}`;
  return (
    <>
      <p className={f.muted}>{label}</p>
      <p className={f.big} lang={p.mode === "meaning" ? LANGS[p.lang]?.bcp47 : undefined}>{p.gloss}</p>
      <div className={f.choices}>
        {p.choices.map((o) => {
          const s = state(p, picked, o);
          const tile = p.mode === "mixed" ? parseTile(o) : null;
          return (
            <button key={o} type="button" className={f.choice} data-right={s.right} data-wrong={s.wrong} onClick={() => pick(o)} data-testid="challenge-choice" lang={p.mode === "form" ? LANGS[p.lang]?.bcp47 : tile ? LANGS[tile.lang]?.bcp47 : undefined}>
              {p.mode === "flag" ? `${flagEmoji(langFlag(o))} ${langName(o)}` : tile ? `${flagEmoji(langFlag(tile.lang))} ${tile.form}` : o}
            </button>
          );
        })}
      </div>
    </>
  );
}

function TilesRound({ p, picked, pick }: { p: LobbyPromptRow; picked: Pick | null; pick: (c: Pick) => void }) {
  const [on, setOn] = useState<number[]>([]);
  const right = new Set(p.answer.split(",").filter(Boolean).map(Number));
  return (
    <>
      <p className={f.muted}>Tap every word that means</p>
      <p className={f.big}>{p.gloss}</p>
      <div className={f.choices}>
        {p.choices.map((o, i) => {
          const t = parseTile(o);
          return (
            <button key={o} type="button" className={f.choice} aria-pressed={on.includes(i)} data-right={picked !== null && right.has(i)} data-wrong={picked !== null && on.includes(i) && !right.has(i)} onClick={() => picked === null && setOn(on.includes(i) ? on.filter((x) => x !== i) : [...on, i])} lang={LANGS[t.lang]?.bcp47}>
              {flagEmoji(langFlag(t.lang))} {t.form}
            </button>
          );
        })}
      </div>
      {picked === null ? <Button size="lg" onClick={() => pick(on)} data-testid="tiles-done">Done</Button> : null}
    </>
  );
}

function ChallengeDone({ score, target }: { score: number; target: number }) {
  return (
    <div className={f.play} data-testid="challenge-done">
      <p className={f.step}>Challenge over</p>
      <h1 className={f.title}>{score > target ? `You beat ${target} with ${score}` : `${score} points. The score to beat was ${target}`}</h1>
      <div className={f.nav}>
        <ButtonLink size="lg" href="/play">Host your own night</ButtonLink>
        <ButtonLink variant="ghost" size="md" href="/learn">Start learning</ButtonLink>
      </div>
    </div>
  );
}
