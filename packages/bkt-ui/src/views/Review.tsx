import { useEffect, useRef, useState } from "react";
import type { Api, ReviewItem } from "../api";

const RATINGS = [
  { r: 1, label: "Again" },
  { r: 2, label: "Hard" },
  { r: 3, label: "Good" },
  { r: 4, label: "Easy" },
] as const;

export function ReviewView({ api }: { api: Api }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    api.due(50).then(setItems, (e: Error) => setError(e.message));
  }, [api]);

  const item = items?.[0];
  const rate = async (r: 1 | 2 | 3 | 4) => {
    if (!item) return;
    try {
      await api.rate(item.id, r, Date.now() - started.current);
      setItems((xs) => (xs ?? []).slice(1));
      setDone((n) => n + 1);
      setShown(false);
      started.current = Date.now();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="muted">Loading reviews…</p>;

  return (
    <section>
      <header className="head">
        <h1>Review</h1>
        <p className="muted">
          {items.length} due · {done} done
        </p>
      </header>
      {!item ? (
        <div className="panel empty">
          <h2>All caught up</h2>
          <p className="muted">Reviews come back as their intervals run out.</p>
        </div>
      ) : (
        <article className="panel card">
          <span className="tag ghost">{item.title}</span>
          <p className="q">{item.prompt}</p>
          {shown ? (
            <>
              <p className="a">{item.answer}</p>
              <div className="rate">
                {RATINGS.map(({ r, label }) => (
                  <button key={r} className={`r${r}`} onClick={() => rate(r)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="primary" onClick={() => setShown(true)}>
              Show answer
            </button>
          )}
        </article>
      )}
    </section>
  );
}
