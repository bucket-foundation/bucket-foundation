import { useCallback, useEffect, useRef, useState } from "react";
import { languagesByName, textDir, toggleLanguage, wordCaption } from "@ros/work-quiz/languages";
import { QUIZ_QUESTIONS } from "@ros/work-quiz/limits";
import { ApiError, type Api, type DailyAnswer, type DailyQuiz, type WorkAnswer, type WorkQuestion, type WorkStatus } from "../api";
import { href } from "../router";
import { windowHref } from "../site-fetch";
import { FILE_UNREADABLE } from "./file";

export const WORK_QUIZ_CHANGED = "bkt-work-quiz-changed";
export const LANGUAGES_SAVE_FAILED = "Your languages were not saved.";

type LanguageApi = Pick<Api, "workLanguages" | "workSetLanguages">;

export function LanguageChips({ api, onSaved }: { api: LanguageApi; onSaved?: (languages: string[]) => void }) {
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.workLanguages().then(
      (r) => live && setChosen(r.languages),
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const toggle = async (code: string) => {
    if (!chosen) return;
    const next = toggleLanguage(chosen, code);
    setChosen(next);
    setBusy(true);
    try {
      const saved = (await api.workSetLanguages(next)).languages;
      setChosen(saved);
      setError(null);
      onSaved?.(saved);
      window.dispatchEvent(new Event(WORK_QUIZ_CHANGED));
    } catch {
      setChosen(chosen);
      setError(LANGUAGES_SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lang-pick">
      <p className="muted small">Pick the languages you know or are learning. Word questions in them join the quiz. Changes save as you tap.</p>
      <div className="lang-chips" role="group" aria-label="languages">
        {languagesByName().map((l) => {
          const on = chosen?.includes(l.code) ?? false;
          return (
            <button key={l.code} type="button" className={`lang-chip${on ? " on" : ""}`} aria-pressed={on} disabled={busy || !chosen} onClick={() => void toggle(l.code)}>
              {l.name}
            </button>
          );
        })}
      </div>
      <p className="muted small">Words and definitions from Wiktionary via Kaikki, CC-BY-SA.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function WordCredit({ q }: { q: Pick<WorkQuestion, "word"> }) {
  const caption = wordCaption(q);
  if (!caption) return null;
  return (
    <p className="muted small word-credit">
      {caption.language ? `${caption.language} · ` : ""}
      {caption.href ? (
        <a href={caption.href} target="_blank" rel="noreferrer noopener">
          {caption.credit}
        </a>
      ) : (
        caption.credit
      )}
    </p>
  );
}

export function QuestionBody({ q }: { q: WorkQuestion }) {
  return (
    <>
      <p className="q">{q.prompt}</p>
      {q.lines.length > 0 && (
        <ul className={`lines${q.word ? " word" : ""}`}>
          {q.lines.map((l, i) => (
            <li key={i} dir={textDir(l)} lang={q.word?.lang ?? undefined}>
              {l}
            </li>
          ))}
        </ul>
      )}
      <WordCredit q={q} />
    </>
  );
}

export function Choice({ q, text }: { q: WorkQuestion; text: string }) {
  return (
    <span dir={textDir(text)} lang={q.word?.choicesLang ?? undefined} className={q.word?.choicesLang ? "word" : undefined}>
      {text}
    </span>
  );
}

export const SITE_ORIGIN = "https://www.bucket.foundation";

export function resourceHref(path: string): string {
  if (/^https:\/\//.test(path)) return path;
  return windowHref(path.replace(/#evidence$/, "")) ?? `${SITE_ORIGIN}${path}`;
}

export function Why({ result }: { result: WorkAnswer }) {
  const source = result.sources?.[0];
  return (
    <p className="muted why">
      {result.explain}
      {source && " "}
      {source &&
        (source.href?.startsWith("https://") ? (
          <a href={source.href} target="_blank" rel="noreferrer noopener">
            {source.label}
          </a>
        ) : (
          <span className="source">{source.label}</span>
        ))}
      {!result.correct && result.resource && (
        <>
          {" "}
          <a className="learn-this" href={resourceHref(result.resource.href)}>
            {result.resource.label}
          </a>
        </>
      )}
    </p>
  );
}

export const NO_WORK_QUESTIONS = "Bucket needs more of your tasks or merged changes to ask a question.";

export function WorkQuizView({ api }: { api: Api }) {
  const [q, setQ] = useState<WorkQuestion | null>(null);
  const [result, setResult] = useState<WorkAnswer | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [none, setNone] = useState(false);
  const started = useRef(Date.now());

  const next = useCallback(() => {
    setResult(null);
    setValue("");
    setError(null);
    api.workNext().then(
      (x) => {
        setQ(x);
        setNone(false);
        started.current = Date.now();
      },
      (e: Error) => {
        if (e instanceof ApiError && e.status === 404) {
          setQ(null);
          setNone(true);
        } else setError(e.message);
      },
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
        <p className="muted">Questions from your own tasks, merged changes and the languages you pick.</p>
        {q && (
          <p className="muted small">
            <a href={href({ name: "setup" })}>Work quiz setup</a>
          </p>
        )}
      </header>
      <details className="panel lang-panel">
        <summary>Languages</summary>
        <LanguageChips api={api} onSaved={() => (q ? undefined : next())} />
      </details>
      {error && <p className="error">{error}</p>}
      {none && (
        <div className="panel empty">
          <h2>No questions yet</h2>
          <p>{NO_WORK_QUESTIONS}</p>
        </div>
      )}
      {q && (
        <article className="panel card">
          <span className="tag ghost">{q.type.replace(/_/g, " ")}</span>
          <QuestionBody q={q} />
          {q.choices ? (
            <ol className="choices">
              {q.choices.map((c, k) => {
                const state = !result ? "" : c === result.answer ? "right" : c === value ? "wrong" : "dim";
                return (
                  <li key={k}>
                    <button className={`choice ${state}`} disabled={!!result} onClick={() => (setValue(c), void answer(c))}>
                      <span className="key">{String.fromCharCode(65 + k)}</span>
                      <Choice q={q} text={c} />
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
              <Why result={result} />
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
export const DAILY_MIN = QUIZ_QUESTIONS.min;
export const DAILY_MAX = QUIZ_QUESTIONS.max;
export const TOO_FEW = `fewer than ${DAILY_MIN} questions could be built for that day`;
export const TOO_FEW_SHOWN = `A daily quiz holds ${DAILY_MIN} to ${DAILY_MAX} questions. Your sources gave fewer than ${DAILY_MIN} today, so Bucket built none. Add a beads file or a repository, or turn on a chat source, then open this page again.`;
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
  const [tooFew, setTooFew] = useState(false);
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
        if (e instanceof ApiError && e.status === 404 && e.code === NO_QUIZ) setMissing(true);
        else if (e instanceof ApiError && e.status === 404 && e.code === TOO_FEW) setTooFew(true);
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
          <p>Bucket has no quiz saved for this day. A daily quiz is built from your recent chats on the day itself, and nothing was built for this one. Either reading your chats was turned off, or the chats from those two days held nothing Bucket could ask about.</p>
          <p>
            <a href={href({ name: "work" })}>Open the work quiz</a>
          </p>
        </div>
      )}
      {tooFew && (
        <div className="panel empty">
          <h2>No quiz for {day}</h2>
          <p>{TOO_FEW_SHOWN}</p>
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
          <QuestionBody q={q} />
          {q.choices ? (
            <ol className="choices">
              {q.choices.map((c, k) => {
                const state = !result ? "" : c === result.answer ? "right" : c === value ? "wrong" : "dim";
                return (
                  <li key={k}>
                    <button className={`choice ${state}`} disabled={settled} onClick={() => (setValue(c), void answer(c))}>
                      <span className="key">{String.fromCharCode(65 + k)}</span>
                      <Choice q={q} text={c} />
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
              <Why result={result} />
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

export const FOLDER_UNUSABLE = "Bucket could not read that folder.";

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
      setMsg(`Read ${r.beads} tasks.`);
      load();
    } catch {
      setMsg(FILE_UNREADABLE);
    }
  };

  const repo = async (p: string | null) => {
    try {
      await api.workRepo(p);
      setMsg(p === null ? "Project folder removed." : "Project folder set.");
      load();
    } catch {
      setMsg(FOLDER_UNUSABLE);
    }
  };

  const chat = status?.chat ?? { claude: false, codex: false };
  const setChat = async (next: { claude: boolean; codex: boolean }) => {
    try {
      await api.workChat(next);
      setMsg(next.claude || next.codex ? "The daily quiz reads your recent chats on this computer." : "Chats are off.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <article className="panel card">
      <h2>Work quiz</h2>
      <p className="muted">
        Get quizzed on your own recent work. {status ? `${status.beads} tasks, ${status.prs} merged changes.${status.repoError ? ` ${FOLDER_UNUSABLE}` : ""}` : "Loading…"} Work quiz joins the menu once tasks, a project folder or a language are set.
      </p>
      <label className="file row">
        <input type="file" accept=".jsonl" onChange={(e) => void beads(e.target.files?.[0])} />
        <span>Choose tasks file</span>
      </label>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void repo(path);
        }}
      >
        <input className="search" placeholder="Your project folder" value={path} onChange={(e) => setPath(e.target.value)} />
        <button className="primary" disabled={!path.trim()}>
          Use this folder
        </button>
        {status?.repo && (
          <button type="button" className="ghost" onClick={() => void repo(null)}>
            Remove
          </button>
        )}
      </form>
      <p className="muted small">The daily quiz can read your last two days of chats. The text stays on this computer.</p>
      <label className="row">
        <input type="checkbox" checked={chat.claude} disabled={!status} onChange={(e) => void setChat({ ...chat, claude: e.target.checked })} /> Claude chats
      </label>
      <label className="row">
        <input type="checkbox" checked={chat.codex} disabled={!status} onChange={(e) => void setChat({ ...chat, codex: e.target.checked })} /> Codex chats
      </label>
      <LanguageChips api={api} onSaved={load} />
      {status && (status.beads > 0 || status.repo || chat.claude || chat.codex || (status.languages ?? []).length > 0) && (
        <button className="ghost" onClick={() => window.confirm("Remove everything the work quiz reads from this computer?") && void api.workForget().then(load)}>
          Remove all
        </button>
      )}
      {msg && <p className="status">{msg}</p>}
    </article>
  );
}
