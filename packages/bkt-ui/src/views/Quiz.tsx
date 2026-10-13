import { useCallback, useEffect, useRef, useState } from "react";
import { InlineMath } from "@/components/math/InlineMath";
import type { Api, QuizQuestion, QuizResult } from "../api";
import { href, type Route } from "../router";
import { DailyQuizView, localDay } from "./WorkQuiz";

type Kind = "quiz" | "practice";

export const QUIZ_KINDS: { kind: Kind; route: Route; label: string }[] = [
  { kind: "quiz", route: { name: "quiz" }, label: "Daily quiz" },
  { kind: "practice", route: { name: "practice" }, label: "Practice quiz" },
];
export const QUIZ_KINDS_NAME = "Kinds of quiz";
export const PRACTICE_NOTE = "Questions from your decks, with a score at the end.";

export function QuizKinds({ on }: { on: Kind | null }) {
  return (
    <nav className="quiz-kinds" aria-label={QUIZ_KINDS_NAME}>
      {QUIZ_KINDS.map((k) => (
        <a key={k.kind} href={href(k.route)} className={on === k.kind ? "on" : undefined} aria-current={on === k.kind ? "page" : undefined}>
          {k.label}
        </a>
      ))}
    </nav>
  );
}

export function DailyScreen({ api, day }: { api: Api; day: string }) {
  return (
    <>
      <QuizKinds on={day === localDay(Date.now()) ? "quiz" : null} />
      <DailyQuizView key={day} api={api} day={day} />
    </>
  );
}

export function QuizView({ api }: { api: Api }) {
  return <DailyScreen api={api} day={localDay(Date.now())} />;
}

export function PracticeQuizView({ api }: { api: Api }) {
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
  const lesson = result && !result.correct ? result.lesson : null;

  return (
    <>
      <QuizKinds on="practice" />
      {error ? (
        <p className="error">{error}</p>
      ) : !qs ? (
        <p className="muted">Building a quiz…</p>
      ) : (
        <section>
          <header className="head">
            <h1>Practice quiz</h1>
            <p className="muted">{q ? `Question ${i + 1} of ${qs.length} · ${q.limitSec}s` : PRACTICE_NOTE}</p>
          </header>
          {!q ? (
            <div className="panel empty">
              <h2>
                {score} of {qs.length} correct
              </h2>
              <button className="primary" onClick={load}>
                New quiz
              </button>
            </div>
          ) : (
            <article className="panel card">
              <p className="q">
                <InlineMath text={q.prompt} />
              </p>
              <ol className="choices">
                {q.choices.map((c, k) => {
                  const state = !result ? "" : c === result.answer ? "right" : k === picked ? "wrong" : "dim";
                  return (
                    <li key={k}>
                      <button className={`choice ${state}`} disabled={!!result} onClick={() => choose(k)}>
                        <span className="key">{String.fromCharCode(65 + k)}</span>
                        <span>
                          <InlineMath text={c} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {result && (
                <div className="after-block">
                  <p className="feedback">
                    <b className={result.correct ? "ok" : "bad"}>{result.correct ? "Correct" : result.timedOut ? "Out of time" : "Not quite"}</b> · answer <InlineMath text={result.answer} />
                  </p>
                  {(result.explain || lesson) && (
                    <p className="muted why">
                      {result.explain && <InlineMath text={result.explain} />}
                      {result.explain && lesson && " "}
                      {lesson && (
                        <a className="learn-this" href={href({ name: "deck", deck: lesson.deck, atom: lesson.atom })}>
                          Open the lesson on <InlineMath text={lesson.title} />
                        </a>
                      )}
                    </p>
                  )}
                  <button className="primary" onClick={next}>
                    Next
                  </button>
                </div>
              )}
            </article>
          )}
        </section>
      )}
    </>
  );
}
