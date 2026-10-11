import { useCallback, useEffect, useRef, useState } from "react";
import { InlineMath } from "@/components/math/InlineMath";
import type { Api, ConceptPage, LessonPage, LessonWord, WordAnswerApi, WordCredit, WordLessons, WordQuizPick, WordView, WorkAnswer, WorkQuestion } from "../api";
import { href } from "../router";
import { Choice, QuestionBody, Why } from "./WorkQuiz";

export const WORD_LESSONS_NOTE = "Word lessons teach single words with their sound and origin, about 8 words at a time.";
export const PICK_LANGUAGES = "Pick languages in Settings to get word lessons.";
export const PICK_SECOND = "Pick a second language in Settings to see words side by side.";
export const NO_WORD_QUESTIONS = "Bucket has no question for these words yet.";
export const IN_REVIEW = "These words are now in your review schedule.";
export const WORDS_FAILED = "Word lessons did not load.";
export const LESSON_ONLY = "lesson only";
export const LESSON_ONLY_NOTE = "A word marked lesson only shares its concept with another word, so the quiz leaves it out.";
export const LICENCE_LINK = "Licence and changes";

export function WordAttribution({ credit }: { credit: WordCredit }) {
  return (
    <p className="muted small word-credit">
      {credit.text}{" "}
      <a href={credit.href} target="_blank" rel="noreferrer noopener">
        Wiktionary
      </a>
      {" · "}
      <a href={credit.sourceHref} target="_blank" rel="noreferrer noopener">
        Kaikki
      </a>
      {" · "}
      <a href={credit.licenceHref} target="_blank" rel="noreferrer noopener">
        {credit.licence}
      </a>
      {" · "}
      <a href={href({ name: "licence" })}>{LICENCE_LINK}</a>
    </p>
  );
}

export function WordForm({ w, big }: { w: Pick<WordView, "word" | "dir" | "lang" | "script">; big?: boolean }) {
  return (
    <span className={`word-form${big ? " big" : ""}`} dir={w.dir} lang={w.lang} data-script={w.script}>
      {w.word}
    </span>
  );
}

export function Ipa({ ipa }: { ipa: string }) {
  if (!ipa) return null;
  return (
    <span className="ipa" dir="ltr" lang="und-fonipa">
      /{ipa}/
    </span>
  );
}

function Etymology({ text }: { text: string }) {
  if (!text) return null;
  return (
    <details className="word-more">
      <summary>Etymology</summary>
      <p dir="ltr">{text}</p>
    </details>
  );
}

export function WordCard({ w }: { w: LessonWord }) {
  return (
    <article className="panel word-card">
      <header className="word-head">
        <WordForm w={w} big />
        <Ipa ipa={w.ipa} />
        <span className="tag ghost">{w.pos}</span>
        {!w.quiz && <span className="tag ghost">{LESSON_ONLY}</span>}
      </header>
      <p className="word-meaning" dir="ltr">
        <InlineMath text={w.meaning} />
      </p>
      {w.senses.length > 0 && (
        <details className="word-more">
          <summary>Other senses</summary>
          <ul dir="ltr">
            {w.senses.map((s, i) => (
              <li key={i}>
                <InlineMath text={s} />
              </li>
            ))}
          </ul>
        </details>
      )}
      <Etymology text={w.etymology} />
      {w.others.length > 0 && (
        <div className="word-others" role="group" aria-label="the same idea in your other languages">
          {w.others.map((o) => (
            <div key={`${o.lang}:${o.word}`} className="word-other">
              <span className="muted small">{o.name}</span>
              <WordForm w={o} />
              <Ipa ipa={o.ipa} />
            </div>
          ))}
        </div>
      )}
      <p className="muted small">
        <a href={w.href} target="_blank" rel="noreferrer noopener">
          Full entry
        </a>
      </p>
    </article>
  );
}

export function WordQuizRun({ api, pick, onLeave, leaveLabel }: { api: WordAnswerApi; pick: WordQuizPick; onLeave: () => void; leaveLabel: string }) {
  const [qs, setQs] = useState<WorkQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<WorkAnswer | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    let live = true;
    api.wordQuiz(pick).then(
      (r) => {
        if (!live) return;
        setQs(r.questions);
        started.current = Date.now();
      },
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const q = qs?.[i];
  const answer = async (response: string) => {
    if (!q || result) return;
    setValue(response);
    try {
      const r = await api.wordAnswer(q.id, response, Date.now() - started.current);
      setResult(r);
      if (r.correct) setScore((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const next = () => {
    setI((x) => x + 1);
    setResult(null);
    setValue("");
    started.current = Date.now();
  };

  if (error) return <p className="error">{error}</p>;
  if (!qs) return <p className="muted">Building questions…</p>;
  if (!q)
    return (
      <div className="panel empty">
        {qs.length > 0 ? (
          <>
            <h2>
              {score} of {qs.length} correct
            </h2>
            <p>{IN_REVIEW}</p>
          </>
        ) : (
          <p>{NO_WORD_QUESTIONS}</p>
        )}
        <button className="primary" onClick={onLeave}>
          {leaveLabel}
        </button>
      </div>
    );
  return (
    <article className="panel card">
      <p className="muted small">
        Question {i + 1} of {qs.length} · {q.limitSec}s
      </p>
      <QuestionBody q={q} />
      <ol className="choices">
        {(q.choices ?? []).map((c, k) => {
          const state = !result ? "" : c === result.answer ? "right" : c === value ? "wrong" : "dim";
          return (
            <li key={k}>
              <button className={`choice ${state}`} disabled={!!result} onClick={() => void answer(c)}>
                <span className="key">{String.fromCharCode(65 + k)}</span>
                <Choice q={q} text={c} />
              </button>
            </li>
          );
        })}
      </ol>
      {result && (
        <div className="after-block">
          <p>
            <b className={result.correct ? "ok" : "bad"}>{result.correct ? "Correct" : result.timedOut ? "Out of time" : "Not quite"}</b>
          </p>
          <Why result={result} />
          <button className="primary" onClick={next}>
            Next
          </button>
        </div>
      )}
    </article>
  );
}

function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { value: T | null; error: string | null } {
  const [state, setState] = useState<{ value: T | null; error: string | null }>({ value: null, error: null });
  useEffect(() => {
    let live = true;
    load().then(
      (value) => live && setState({ value, error: null }),
      (e: Error) => live && setState({ value: null, error: e.message }),
    );
    return () => {
      live = false;
    };
  }, deps);
  return state;
}

export function WordDeckView({ api, deck }: { api: Pick<Api, "wordLessons">; deck: string }) {
  const { value, error } = useLoad<WordLessons>(() => api.wordLessons(deck), [api, deck]);
  if (error) return <p className="error">{error}</p>;
  if (!value) return <p className="muted">Loading word lessons…</p>;
  const d = value.deck;
  return (
    <section>
      <header className="head">
        <h1>{d.name} word lessons</h1>
        <p className="muted">
          {d.words} words · {d.started} of {d.quiz} quiz words started · {d.due} due
        </p>
        <p className="muted small">
          <a href={href({ name: "learn" })}>Learn</a> · <a href={href({ name: "concepts" })}>By concept</a>
        </p>
      </header>
      <p className="muted">{WORD_LESSONS_NOTE}</p>
      <div className="grid">
        {value.lessons.map((l) => (
          <a key={l.n} className="deck" href={href({ name: "words", deck: d.lang, lesson: l.n })}>
            <span className="deck-title">
              {l.n}. {l.title}
            </span>
            <span className="word-list" dir={d.dir} lang={d.lang}>
              {l.words.join(" · ")}
            </span>
            <span className="deck-meta">
              {l.words.length} words · {l.started} of {l.quiz} quiz words started
            </span>
          </a>
        ))}
      </div>
      <WordAttribution credit={value.credit} />
    </section>
  );
}

export function WordLessonView({ api, deck, n }: { api: Pick<Api, "wordLesson"> & WordAnswerApi; deck: string; n: number }) {
  const { value, error } = useLoad<LessonPage & { credit: WordCredit }>(() => api.wordLesson(deck, n), [api, deck, n]);
  const [quiz, setQuiz] = useState(false);
  if (error) return <p className="error">{error}</p>;
  if (!value) return <p className="muted">Loading the lesson…</p>;
  const back = href({ name: "words", deck: value.deck.lang });
  const onward = n < value.of ? href({ name: "words", deck: value.deck.lang, lesson: n + 1 }) : back;
  return (
    <section>
      <header className="head">
        <h1>
          {value.deck.name} words: {value.title}
        </h1>
        <p className="muted">
          Word lesson {value.n} of {value.of} · {value.words.length} words
        </p>
        <p className="muted small">
          <a href={back}>All {value.deck.name} word lessons</a>
        </p>
      </header>
      {quiz ? (
        <WordQuizRun api={api} pick={{ deck: value.deck.lang, lesson: n }} leaveLabel={n < value.of ? "Next word lesson" : "Back to the word lessons"} onLeave={() => (window.location.hash = onward)} />
      ) : (
        <>
          <div className="word-cards">
            {value.words.map((w) => (
              <WordCard key={`${w.concept}:${w.word}`} w={w} />
            ))}
          </div>
          {value.words.some((w) => !w.quiz) && <p className="muted small">{LESSON_ONLY_NOTE}</p>}
          <button className="primary" onClick={() => setQuiz(true)}>
            Quiz me on these words
          </button>
        </>
      )}
      <WordAttribution credit={value.credit} />
    </section>
  );
}

function ConceptCell({ words }: { words: WordView[] }) {
  if (words.length === 0) return <td className="muted">no checked word</td>;
  return (
    <td>
      {words.map((w) => (
        <div key={w.word} className="concept-word">
          <WordForm w={w} big />
          <Ipa ipa={w.ipa} />
          <Etymology text={w.etymology} />
        </div>
      ))}
    </td>
  );
}

export function WordLicenceView({ api }: { api: Pick<Api, "wordLicence"> }) {
  const { value, error } = useLoad(() => api.wordLicence(), [api]);
  if (error) return <p className="error">{error}</p>;
  if (!value) return <p className="muted">Loading the licence…</p>;
  return (
    <section>
      <header className="head">
        <h1>Word list licence</h1>
        <p className="muted small">
          <a href={href({ name: "learn" })}>Learn</a>
        </p>
      </header>
      <article className="panel card">
        <p>{value.credit.text}</p>
        <p>{value.changes}</p>
        <p>
          <a href={value.credit.licenceHref} target="_blank" rel="noreferrer noopener">
            {value.title}
          </a>
        </p>
        <details className="fine">
          <summary>Full licence text</summary>
          <pre className="licence-text">{value.text}</pre>
        </details>
      </article>
    </section>
  );
}

export function WordConceptsView({ api, page }: { api: Pick<Api, "wordConcepts"> & WordAnswerApi; page: number }) {
  const load = useCallback(() => api.wordConcepts(page), [api, page]);
  const { value, error } = useLoad<ConceptPage & { credit: WordCredit }>(load, [load]);
  const [quiz, setQuiz] = useState(false);
  if (error) return <p className="error">{error}</p>;
  if (!value) return <p className="muted">Loading words…</p>;
  const settings = href({ name: "settings" });
  return (
    <section>
      <header className="head">
        <h1>Words by concept</h1>
        <p className="muted">
          {value.concepts} concepts in your languages · page {value.page} of {value.of}
        </p>
        <p className="muted small">
          <a href={href({ name: "learn" })}>Learn</a> · <a href={settings}>Settings</a>
        </p>
      </header>
      {value.languages.length === 0 && (
        <div className="panel empty">
          <p>{PICK_LANGUAGES}</p>
        </div>
      )}
      {value.languages.length === 1 && <p className="muted">{PICK_SECOND}</p>}
      {quiz && <WordQuizRun api={api} pick={{ concepts: value.page }} leaveLabel="Back to the words" onLeave={() => setQuiz(false)} />}
      {!quiz && value.languages.length > 0 && (
        <>
          <div className="panel concept-wrap">
            <table className="concept-table">
              <thead>
                <tr>
                  <th scope="col">Concept</th>
                  {value.languages.map((l) => (
                    <th key={l.code} scope="col">
                      {l.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.rows.map((r) => (
                  <tr key={r.concept}>
                    <th scope="row">
                      <span className="concept-name">{r.concept}</span>
                      <span className="muted small">
                        {r.pos} · {r.theme}
                      </span>
                    </th>
                    {r.words.map((words, i) => (
                      <ConceptCell key={value.languages[i].code} words={words} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="toolbar">
            {value.page > 1 && <a href={href({ name: "concepts", page: value.page - 1 })}>Previous page</a>}
            {value.page < value.of && <a href={href({ name: "concepts", page: value.page + 1 })}>Next page</a>}
            <button className="primary" onClick={() => setQuiz(true)}>
              Quiz me on these words
            </button>
          </div>
        </>
      )}
      <WordAttribution credit={value.credit} />
    </section>
  );
}
