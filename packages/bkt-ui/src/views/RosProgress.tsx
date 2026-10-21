import { useEffect, useState } from "react";
import ConnectionsPanel from "@/app/research-os/(app)/home/ConnectionsPanel";
import LoopPanel from "@/app/research-os/(app)/home/LoopPanel";
import type { Api, DeckRow } from "../api";
import { href } from "../router";
import { trouble, TroubleNote, type Trouble } from "../trouble";
import "../ros.css";

interface Game {
  level: number;
  xp: number;
  into?: number;
  span?: number;
  streakDays: number;
  badges: unknown[];
}

export const LEVEL_TROUBLE = "Bucket could not load your level. Close the window and open it again.";
export const EXPORT_PROGRESS_TROUBLE = "Bucket could not save your progress. Try again.";

type ProgressApi = Pick<Api, "decks" | "exportProgress">;

function Tiles() {
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/research-os/profile", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ game: Game | null }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setGame(d.game),
        () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  if (failed) return <p className="muted">{LEVEL_TROUBLE}</p>;
  if (game === undefined) return <p className="muted">Loading your level…</p>;
  const g = game;
  const tiles: [string, string][] = [
    ["Level", String(g?.level ?? 1)],
    ["XP this level", g && g.span ? `${g.into ?? 0} of ${g.span}` : "0"],
    ["Streak", g ? `${g.streakDays} ${g.streakDays === 1 ? "day" : "days"}` : "0 days"],
    ["Badges", String(g?.badges.length ?? 0)],
  ];
  return (
    <div className="tiles" aria-label="your level">
      {tiles.map(([label, value]) => (
        <div key={label} className="panel tile">
          <span className="muted small">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Decks({ api }: { api: ProgressApi }) {
  const [decks, setDecks] = useState<DeckRow[] | null>(null);
  const [error, setError] = useState<Trouble | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api.decks().then((d) => live && setDecks(d), (e: unknown) => live && setError(trouble(e)));
    return () => {
      live = false;
    };
  }, [api]);

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const out = await api.exportProgress();
      setNote(`Saved your progress in ${out.folder} as ${out.name.replace(/\.[a-z]+$/i, "")}.`);
    } catch {
      setNote(EXPORT_PROGRESS_TROUBLE);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <TroubleNote t={error} />;
  if (!decks) return <p className="muted">Loading your decks…</p>;
  const started = decks.filter((d) => d.introduced > 0).sort((a, b) => b.due - a.due || b.xp - a.xp);
  return (
    <article className="panel card" aria-label="your decks">
      <h2>Your decks</h2>
      {started.length === 0 ? (
        <p className="muted">
          Nothing studied yet. Start a deck in <a href={href({ name: "learn" })}>Learn</a>.
        </p>
      ) : (
        <table className="decks-progress">
          <thead>
            <tr>
              <th>Deck</th>
              <th>Started</th>
              <th>Due today</th>
              <th>XP</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {started.map((d) => (
              <tr key={d.id}>
                <td>
                  <a href={href({ name: "deck", deck: d.id })}>{d.title}</a>
                </td>
                <td>
                  {d.introduced} of {d.atoms}
                </td>
                <td>{d.due}</td>
                <td>{d.xp}</td>
                <td>{d.streak === 1 ? "1 day" : `${d.streak} days`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="toolbar">
        <button type="button" disabled={busy} onClick={() => void save()}>
          Save my progress to a file
        </button>
      </div>
      {note && (
        <p className="muted small" role="status">
          {note}
        </p>
      )}
    </article>
  );
}

export function RosProgressView({ api }: { api: ProgressApi }) {
  return (
    <section>
      <header className="head">
        <h1>Progress</h1>
        <p className="muted">
          How far each idea has gone for you, from first look to your own work. Open ideas from the <a href={href({ name: "graph" })}>knowledge graph</a>.
        </p>
      </header>
      <div className="ros-stack">
        <Tiles />
        <Decks api={api} />
        <LoopPanel />
        <ConnectionsPanel />
      </div>
    </section>
  );
}
