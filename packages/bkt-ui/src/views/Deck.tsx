import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildEncompassingMap, grade, masteryFor, normalizeState, pickLevel, route, summary, withLeverage, type Atom, type EngineState } from "@academy/engine";
import type { Rating } from "@academy/fsrs";
import type { Api } from "../api";
import { href } from "../router";
import { Lesson } from "./Lesson";

const RATINGS: { r: Rating; label: string }[] = [
  { r: 1, label: "Again" },
  { r: 2, label: "Hard" },
  { r: 3, label: "Good" },
  { r: 4, label: "Easy" },
];

export function DeckView({ api, deck, focus }: { api: Api; deck: string; focus?: string }) {
  const [atoms, setAtoms] = useState<Atom[] | null>(null);
  const [state, setState] = useState<EngineState>(() => normalizeState(null));
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    Promise.all([api.atoms(deck), api.progress.load(deck)]).then(
      ([a, s]) => {
        if (!alive) return;
        setAtoms(withLeverage(a));
        setState(s);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [api, deck]);

  const list = atoms ?? [];
  const byId = useMemo(() => new Map(list.map((a) => [a.id, a])), [list]);
  const enc = useMemo(() => buildEncompassingMap(list), [list]);
  const queue = useMemo(() => route(state, list, now), [state, list, now]);
  const sum = useMemo(() => summary(state, list, now), [state, list, now]);
  const focused = focus ? byId.get(focus) : undefined;
  const head = focused ? { id: focused.id, kind: state.cards[focused.id] ? ("review" as const) : ("new" as const) } : queue[0];
  const next = head ? byId.get(head.id) : undefined;
  const level = next ? pickLevel(state, next) : "recall";
  const q = next?.quiz?.find((x) => (x.level ?? "recall") === level) ?? next?.quiz?.[0];

  const rate = useCallback(
    (r: Rating) => {
      if (!next) return;
      const t = Date.now();
      const s = grade(stateRef.current, list, enc, next.id, r, level, t);
      stateRef.current = s;
      setState(s);
      setNow(t);
      setRevealed(false);
      api.progress.save(deck, s);
      if (focused) window.history.back();
    },
    [api, deck, enc, level, list, next, focused],
  );

  if (error) return <p className="error">{error}</p>;
  if (!atoms) return <p className="muted">Loading deck…</p>;
  const title = deckTitle(deck);

  return (
    <section>
      <header className="head">
        <a className="back" href={href({ name: "learn" })}>
          All decks
        </a>
        <h1>{title}</h1>
      </header>
      <dl className="stats">
        <Stat k="Started" v={`${sum.introduced}/${sum.total}`} />
        <Stat k="Mastered" v={sum.mastered} />
        <Stat k="Due" v={sum.dueCount} />
        <Stat k="XP" v={sum.xp} />
        <Stat k="Streak" v={`${sum.streak}d`} />
      </dl>
      {!next ? (
        <div className="panel empty">
          <h2>Nothing due</h2>
          <p className="muted">New atoms unlock as you finish their prerequisites. Come back tomorrow for reviews.</p>
        </div>
      ) : (
        <article className="panel card">
          <div className="card-top">
            <span className="tag">{head!.kind === "new" ? "New" : "Review"}</span>
            {next.shell && <span className="tag ghost">{next.shell}</span>}
            <span className="tag ghost">{level}</span>
            <span className="mastery">mastery {Math.round(100 * masteryFor(state, next.id))}%</span>
          </div>
          <h2>{next.title}</h2>
          {next.equation && <p className="equation">{next.equation}</p>}
          {head!.kind === "new" && (next.lesson ? <Lesson text={next.lesson} /> : next.summary && <p>{next.summary}</p>)}
          {q && (
            <div className="prompt">
              <p className="q">{q.prompt}</p>
              {revealed ? (
                <>
                  <p className="a">{q.answer}</p>
                  <div className="rate">
                    {RATINGS.map(({ r, label }) => (
                      <button key={r} className={`r${r}`} onClick={() => rate(r)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button className="primary" onClick={() => setRevealed(true)}>
                  Show answer
                </button>
              )}
            </div>
          )}
          <p className="muted small">{queue.length - 1} more in today's queue</p>
        </article>
      )}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function deckTitle(id: string): string {
  const t = id.replace(/^\d+-/, "").replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
