import { useCallback, useEffect, useRef, useState } from "react";
import type { Api, WorkAnswer, WorkQuestion, WorkStatus } from "../api";

export const WORK_QUIZ_CHANGED = "bkt-work-quiz-changed";

export function WorkQuizView({ api }: { api: Api }) {
  const [q, setQ] = useState<WorkQuestion | null>(null);
  const [result, setResult] = useState<WorkAnswer | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());

  const next = useCallback(() => {
    setResult(null);
    setValue("");
    setError(null);
    api.workNext().then(
      (x) => {
        setQ(x);
        started.current = Date.now();
      },
      (e: Error) => setError(e.message),
    );
  }, [api]);

  useEffect(next, [next]);

  const answer = async (response: string) => {
    if (!q || result) return;
    try {
      setResult(await api.workAnswer(q.id, response, Date.now() - started.current));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section>
      <header className="head">
        <h1>Work quiz</h1>
        <p className="muted">Questions from your own beads and commit history.</p>
      </header>
      {error && <p className="error">{error}</p>}
      {q && (
        <article className="panel card">
          <span className="tag ghost">{q.type.replace(/_/g, " ")}</span>
          <p className="q">{q.prompt}</p>
          {q.lines.length > 0 && (
            <ul className="lines">
              {q.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          {q.choices ? (
            <ol className="choices">
              {q.choices.map((c, k) => {
                const state = !result ? "" : c === result.answer ? "right" : c === value ? "wrong" : "dim";
                return (
                  <li key={k}>
                    <button className={`choice ${state}`} disabled={!!result} onClick={() => (setValue(c), void answer(c))}>
                      <span className="key">{String.fromCharCode(65 + k)}</span>
                      {c}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                void answer(value);
              }}
            >
              <input className="search" inputMode="decimal" placeholder="Your estimate" value={value} disabled={!!result} onChange={(e) => setValue(e.target.value)} />
              <button className="primary" disabled={!!result || !value.trim()}>
                Answer
              </button>
            </form>
          )}
          {result && (
            <div className="after-block">
              <p>
                <b className={result.correct ? "ok" : "bad"}>{result.correct ? "Correct" : result.timedOut ? "Out of time" : "Not quite"}</b> · answer {result.answer}
              </p>
              <p className="muted">{result.explain}</p>
              <button className="primary" onClick={next}>
                Next
              </button>
            </div>
          )}
          <p className="muted small">{q.limitSec}s limit</p>
        </article>
      )}
    </section>
  );
}

export function WorkQuizSources({ api }: { api: Api }) {
  const [status, setStatus] = useState<WorkStatus | null>(null);
  const [path, setPath] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api.workStatus().then((s) => {
      setStatus(s);
      setPath(s.repo ?? "");
      window.dispatchEvent(new Event(WORK_QUIZ_CHANGED));
    }, (e: Error) => setMsg(e.message));
  }, [api]);

  useEffect(load, [load]);

  const beads = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 32 * 1024 * 1024) return setMsg("That file is larger than 32 MB.");
    try {
      const r = await api.workBeads(await f.text());
      setMsg(`Read ${r.beads} beads.`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const repo = async (p: string | null) => {
    try {
      await api.workRepo(p);
      setMsg(p === null ? "Repository removed." : "Repository set.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <article className="panel card">
      <h2>Work quiz sources</h2>
      <p className="muted">
        {status ? `${status.beads} beads, ${status.prs} merged PRs${status.repoError ? `; ${status.repoError}` : ""}.` : "Loading…"} The Work quiz tab appears once either source is set.
      </p>
      <label className="file row">
        <input type="file" accept=".jsonl" onChange={(e) => void beads(e.target.files?.[0])} />
        <span>Pick .beads/issues.jsonl</span>
      </label>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void repo(path);
        }}
      >
        <input className="search" placeholder="~/code/your-repo" value={path} onChange={(e) => setPath(e.target.value)} />
        <button className="primary" disabled={!path.trim()}>
          Use repository
        </button>
        {status?.repo && (
          <button type="button" className="ghost" onClick={() => void repo(null)}>
            Remove
          </button>
        )}
      </form>
      {status && (status.beads > 0 || status.repo) && (
        <button className="ghost" onClick={() => window.confirm("Remove the work quiz sources from this computer?") && void api.workForget().then(load)}>
          Remove all sources
        </button>
      )}
      {msg && <p className="status">{msg}</p>}
    </article>
  );
}
