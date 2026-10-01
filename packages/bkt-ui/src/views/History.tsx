import { useEffect, useState } from "react";
import type { Api, HistoryData } from "../api";

export const NO_ACTIVITY = "Nothing yet. Your study days will show here.";

export function HistoryView({ api }: { api: Api }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.history().then(setData, (e: Error) => setError(e.message));
  }, [api]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading history…</p>;
  const max = Math.max(1, ...data.activity.map((d) => d.learn + d.work + d.notes));
  const active = data.activity.some((d) => d.learn + d.work + d.notes > 0);

  return (
    <section>
      <header className="head">
        <h1>History</h1>
        <p className="muted">Your last 60 days on this computer.</p>
      </header>
      <article className="panel card">
        <h2>Activity</h2>
        {!active ? (
          <p className="muted">{NO_ACTIVITY}</p>
        ) : (
          <>
            <div className="activity" role="img" aria-label="Daily activity for 60 days">
              {data.activity.map((d) => {
                const total = d.learn + d.work + d.notes;
                return (
                  <span key={d.day} className="day" title={`${d.day}: ${d.learn} learn, ${d.work} work quiz, ${d.notes} notes`}>
                    <span className="learn" style={{ height: `${(100 * d.learn) / max}%` }} />
                    <span className="work" style={{ height: `${(100 * d.work) / max}%` }} />
                    <span className="note" style={{ height: `${(100 * d.notes) / max}%` }} />
                    {total === 0 && <span className="none" />}
                  </span>
                );
              })}
            </div>
            <p className="muted small legend">
              <i className="learn" /> learn <i className="work" /> work quiz <i className="note" /> notes
            </p>
          </>
        )}
      </article>
    </section>
  );
}
