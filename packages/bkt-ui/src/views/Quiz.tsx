import { useCallback, useEffect, useRef, useState } from "react";
import type { Api, QuizQuestion, QuizResult } from "../api";

export function QuizView({ api }: { api: Api }) {
  const [qs, setQs] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());

  const load = useCallback(() => {
    setQs(null);
    setI(0);
    setScore(0);
    setPicked(null);
    setResult(null);
    api.quiz(10).then(
      (x) => {
        setQs(x);
        started.current = Date.now();
      },
      (e: Error) => setError(e.message),
    );
  }, [api]);

  useEffect(load, [load]);

  const q = qs?.[i];
  const choose = async (c: number) => {
    if (!q || result) return;
    setPicked(c);
    try {
      const r = await api.answer(q.itemId, c, Date.now() - started.current);
      setResult(r);
      if (r.correct) setScore((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const next = () => {
    setI((x) => x + 1);
    setPicked(null);
    setResult(null);
    started.current = Date.now();
  };

  if (error) return <p className="error">{error}</p>;
  if (!qs) return <p className="muted">Building a quiz…</p>;
  if (!q)
    return (
      <section>
        <header className="head">
          <h1>Quiz</h1>
        </header>
        <div className="panel empty">
          <h2>
            {score} of {qs.length} correct
          </h2>
          <button className="primary" onClick={load}>
            New quiz
          </button>
        </div>
      </section>
    );

  return (
    <section>
      <header className="head">
        <h1>Quiz</h1>
        <p className="muted">
          Question {i + 1} of {qs.length} · {q.limitSec}s
        </p>
      </header>
      <article className="panel card">
        <p className="q">{q.prompt}</p>
        <ol className="choices">
          {q.choices.map((c, k) => {
            const state = !result ? "" : c === result.answer ? "right" : k === picked ? "wrong" : "dim";
            return (
              <li key={k}>
                <button className={`choice ${state}`} disabled={!!result} onClick={() => choose(k)}>
                  <span className="key">{String.fromCharCode(65 + k)}</span>
                  {c}
                </button>
              </li>
            );
          })}
        </ol>
        {result && (
          <div className="after">
            <b className={result.correct ? "ok" : "bad"}>{result.correct ? "Correct" : result.timedOut ? "Out of time" : "Not quite"}</b>
            <button className="primary" onClick={next}>
              Next
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
