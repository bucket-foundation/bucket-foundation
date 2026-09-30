import { useEffect, useState } from "react";
import { gripSphere, type GripSphere } from "@academy/grip-sphere";
import type { Api, DeckRow } from "../api";
import { href } from "../router";
import { GripPanel } from "./Grip";
import { loadLearnData } from "./learn-data";

export function LearnHome({ api }: { api: Api }) {
  const [decks, setDecks] = useState<DeckRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grip, setGrip] = useState<GripSphere | null>(null);

  useEffect(() => {
    api.decks().then(setDecks, (e: Error) => setError(e.message));
    loadLearnData(api).then(
      (d) => setGrip(gripSphere(d.decks.map((x) => ({ branch: x.id, atomIds: d.byDeck.get(x.id) ?? [], state: d.states.get(x.id) ?? null })))),
      () => setGrip(null),
    );
  }, [api]);

  if (error) return <p className="error">{error}</p>;
  if (!decks) return <p className="muted">Loading decks…</p>;
  const due = decks.reduce((n, d) => n + d.due, 0);
  const xp = decks.reduce((n, d) => n + d.xp, 0);

  return (
    <section>
      <header className="head">
        <h1>Learn</h1>
        <p className="muted">
          {due} due today · {xp} XP
        </p>
      </header>
      {grip && grip.axes.length > 0 && <GripPanel grip={grip} />}
      <p className="muted small">
        <a href={href({ name: "path" })}>Plan a path to any concept</a>
      </p>
      <div className="grid">
        {decks.map((d) => (
          <a key={d.id} className="deck" href={href({ name: "deck", deck: d.id })}>
            <span className="deck-title">{d.title}</span>
            <span className="bar" aria-hidden>
              <span style={{ width: `${Math.round((100 * d.introduced) / Math.max(1, d.atoms))}%` }} />
            </span>
            <span className="deck-meta">
              {d.introduced} of {d.atoms} started
              {d.due > 0 && <b className="pill">{d.due} due</b>}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
