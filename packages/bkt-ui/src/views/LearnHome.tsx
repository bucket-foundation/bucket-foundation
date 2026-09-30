import { useEffect, useState } from "react";
import type { Api, DeckRow } from "../api";
import { href } from "../router";

export function LearnHome({ api }: { api: Api }) {
  const [decks, setDecks] = useState<DeckRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.decks().then(setDecks, (e: Error) => setError(e.message));
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
