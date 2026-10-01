import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Api, type DailyAnswer, type DailyQuiz, type WorkAnswer, type WorkQuestion, type WorkStatus } from "../api";
import { href } from "../router";

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

export const NO_QUIZ = "no quiz for that day";
export const OUTDATED = "This copy of Bucket is older than the daily quiz. Update Bucket, then open this page again.";
export const QUIZ_CHANGED = "This quiz changed while the page was open. Reload the page to get the current questions.";
export const GRADED_ONCE = "This question was already graded. Each daily question is graded once.";

export function factorOff(log10Distance: number): string {
  const f = 10 ** log10Distance;
  return f < 1.05 ? "on the mark" : `off by a factor of ${f >= 100 ? Math.round(f).toLocaleString("en-US") : f.toFixed(1)}`;
}

type DailyApi = Pick<Api, "dailyQuiz" | "dailyAnswer">;

export function DailyQuizView({ api, day }: { api: DailyApi; day: string }) {
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [right, setRight] = useState(0);
  const [at, setAt] = useState<string | null>(null);
  const [result, setResult] = useState<DailyAnswer | null>(null);
  const [refused, setRefused] = useState(false);
  const [outdated, setOutdated] = useState(false);
  const [stale, setStale] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    api.dailyQuiz(day).then(
      (x) => {
        if (!live) return;
        const answered = new Set(x.answered);
        setQuiz(x);
        setDone(answered);
        setAt(x.questions.find((q) => !answered.has(q.id))?.id ?? null);
        started.current = Date.now();
      },
      (e: Error) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404 && e.message === NO_QUIZ) setMissing(true);
        else if (e instanceof ApiError && e.status === 404) setOutdated(true);
        else setError(e.message);
      },
    );
    return () => {
      live = false;
    };
  }, [api, day]);

  const q = quiz?.questions.find((x) => x.id === at) ?? null;
  const settled = !!result || refused || stale;

  const answer = async (response: string) => {
    if (!q || settled || busy.current) return;
    busy.current = true;
    try {
      const r = await api.dailyAnswer(day, q.id, response, Date.now() - started.current);
      setResult(r);
      if (r.correct) setRight((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return setStale(true);
      if (e instanceof ApiError && e.status === 409) setRefused(true);
      else return setError((e as Error).message);
    } finally {
      busy.current = false;
    }
    setDone((d) => new Set(d).add(q.id));
  };

  const next = () => {
    setResult(null);
    setRefused(false);
    setValue("");
    setError(null);
    setAt(quiz?.questions.find((x) => !done.has(x.id))?.id ?? null);
    started.current = Date.now();
  };

  return (
    <section>
      <header className="head">
        <h1>Daily quiz</h1>
        <p className="muted">
          {day}
          {quiz ? ` · ${done.size} of ${quiz.questions.length} answered` : ""}
        </p>
      </header>
      {error && <p className="error">{error}</p>}
      {missing && (
        <div className="panel empty">
          <h2>No quiz for {day}</h2>
          <p>Bucket has no quiz saved for this day. A quiz is built from your recent chat sessions when its page opens on its own day, and nothing was built for this one. Either both chat sources were off under Import, or the sessions from those two days held no line Bucket could ask about.</p>
          <p>
            <a href={href({ name: "work" })}>Open the work quiz</a>
          </p>
        </div>
      )}
      {outdated && (
        <div className="panel empty">
          <h2>Bucket needs an update</h2>
          <p>{OUTDATED}</p>
        </div>
      )}
      {quiz && !q && (
        <div className="panel empty">
          <h2>Done for {day}</h2>
          <p>
            All {quiz.questions.length} questions are answered{right > 0 ? `, ${right} right in this sitting` : ""}. Each daily question is graded once.
          </p>
        </div>
      )}
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
                    <button className={`choice ${state}`} disabled={settled} onClick={() => (setValue(c), void answer(c))}>
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
              <input className="search" inputMode="decimal" placeholder="Your estimate" value={value} disabled={settled} onChange={(e) => setValue(e.target.value)} />
              <button className="primary" disabled={settled || !value.trim()}>
                Answer
              </button>
            </form>
          )}
          {result && (
            <div className="after-block">
              <p>
                <b className={result.correct ? "ok" : "bad"}>{result.correct ? "Correct" : result.timedOut ? "Out of time" : "Not quite"}</b> · answer {result.answer}
                {result.log10Distance !== null ? ` · ${factorOff(result.log10Distance)}` : ""}
              </p>
              <p className="muted">{result.explain}</p>
            </div>
          )}
          {refused && (
            <div className="after-block">
              <p className="bad">{GRADED_ONCE}</p>
            </div>
          )}
          {stale && (
            <div className="after-block">
              <p className="bad">{QUIZ_CHANGED}</p>
              <button className="primary" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          )}
          {settled && !stale && (
            <button className="primary" onClick={next}>
              Next
            </button>
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

  const chat = status?.chat ?? { claude: false, codex: false };
  const setChat = async (next: { claude: boolean; codex: boolean }) => {
    try {
      await api.workChat(next);
      setMsg(next.claude || next.codex ? "The daily quiz reads your recent chat sessions on this computer." : "Chat sessions are off.");
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
      <p className="muted small">The daily quiz can read the last two days of chat sessions. The text stays on this computer.</p>
      <label className="row">
        <input type="checkbox" checked={chat.claude} disabled={!status} onChange={(e) => void setChat({ ...chat, claude: e.target.checked })} /> Claude sessions in ~/.claude/projects
      </label>
      <label className="row">
        <input type="checkbox" checked={chat.codex} disabled={!status} onChange={(e) => void setChat({ ...chat, codex: e.target.checked })} /> Codex sessions in ~/.codex/sessions
      </label>
      {status && (status.beads > 0 || status.repo || chat.claude || chat.codex) && (
        <button className="ghost" onClick={() => window.confirm("Remove the work quiz sources from this computer?") && void api.workForget().then(load)}>
          Remove all sources
        </button>
      )}
      {msg && <p className="status">{msg}</p>}
    </article>
  );
}
