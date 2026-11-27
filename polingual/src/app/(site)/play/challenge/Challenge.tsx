"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPrompts, points } from "@academy/lobbies";
import { LANGS, langName, type LangItem } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { parseChallenge } from "@/lib/family/share";
import { Button, ButtonLink } from "@/ui";
import app from "../../app/app.module.css";
import f from "../family/family.module.css";

const ROUND_SECONDS = 10;

export default function Challenge() {
  const [query, setQuery] = useState<URLSearchParams | null>(null);
  const [items, setItems] = useState<LangItem[] | null>(null);
  const [at, setAt] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
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
  const prompts = useMemo(() => (c && items ? buildPrompts(items, { id: "challenge", seed: c.seed, root: c.root, targets: c.targets, rounds: c.rounds, game: "daily" }) : []), [c, items]);
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
  const pick = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    setScore((s) => s + points(choice === p.answer, Date.now() - shownAt, ROUND_SECONDS));
  };
  return (
    <div className={f.play} data-testid="challenge">
      <p className={f.step}>Round {at + 1} of {prompts.length} · {score} points · beat {c.score}</p>
      <p className={f.muted}>Find this word in {langName(p.lang)}</p>
      <p className={f.big}>{p.gloss}</p>
      <div className={f.choices}>
        {p.choices.map((o) => (
          <button key={o} type="button" className={f.choice} lang={LANGS[p.lang]?.bcp47} data-right={picked !== null && o === p.answer} data-wrong={picked === o && o !== p.answer} onClick={() => pick(o)} data-testid="challenge-choice">
            {o}
          </button>
        ))}
      </div>
      {picked ? <Button size="lg" onClick={() => { setPicked(null); setAt(at + 1); }} data-testid="challenge-next">Next</Button> : null}
    </div>
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
