"use client";

import { useState } from "react";
import { blankQuestion, fetchTrivia, triviaAct, type TriviaQuestion, type TriviaView } from "@/lib/family/rounds";
import { Button, Card, Pill, ReadAloud, SectionHeading } from "@/ui";
import type { RoundModule, RoundProps } from "./types";
import { usePoll } from "./usePoll";
import s from "./rounds.module.css";

const MAX = 10;
const bound = () => fetch.bind(globalThis);

const ERRORS: Record<string, string> = {
  bad_request: "Each question needs a prompt and two to four different answers. Keep the words friendly.",
  not_allowed: "That step is not open right now.",
  offline: "You are offline. Check the connection and try again.",
};

function Editor({ initial, save }: { initial: TriviaQuestion[] | null; save: (q: TriviaQuestion[]) => void }) {
  const [qs, setQs] = useState<TriviaQuestion[]>(initial?.length ? initial : [blankQuestion()]);
  const set = (i: number, q: TriviaQuestion) => setQs(qs.map((x, j) => (j === i ? q : x)));
  return (
    <div className={s.round} data-testid="trivia-editor">
      <p className={s.note}>Write up to ten questions about the family or the year. Tap the right answer for each.</p>
      {qs.map((q, i) => (
        <Card key={i} pad="sm">
          <label className={s.field}>
            <span className={s.status}>Question {i + 1}</span>
            <input value={q.prompt} maxLength={140} onChange={(e) => set(i, { ...q, prompt: e.target.value })} data-testid="trivia-prompt" />
          </label>
          {q.choices.map((c, k) => (
            <div key={k} className={s.row}>
              <label className={s.field}>
                <span className={s.status}>Answer {k + 1}</span>
                <input value={c} maxLength={60} onChange={(e) => set(i, { ...q, choices: q.choices.map((x, m) => (m === k ? e.target.value : x)) })} data-testid="trivia-choice" />
              </label>
              <Pill size="sm" active={q.answer === k} onClick={() => set(i, { ...q, answer: k })}>{q.answer === k ? "Right" : "Mark right"}</Pill>
            </div>
          ))}
          {q.choices.length < 4 ? <Button variant="link" size="sm" onClick={() => set(i, { ...q, choices: [...q.choices, ""] })}>Add an answer</Button> : null}
        </Card>
      ))}
      <div className={s.row}>
        {qs.length < MAX ? <Button variant="secondary" size="md" onClick={() => setQs([...qs, blankQuestion()])} data-testid="trivia-add">Add a question</Button> : null}
        <Button variant="primary" size="md" onClick={() => save(qs.map((q) => ({ ...q, prompt: q.prompt.trim(), choices: q.choices.map((c) => c.trim()) })))} data-testid="trivia-save">Save {qs.length} {qs.length === 1 ? "question" : "questions"}</Button>
      </div>
    </div>
  );
}

function Board({ view, root, host, act }: { view: TriviaView; root: string; host: boolean; act: (a: "open" | "answer" | "reveal", extra?: Record<string, unknown>) => void }) {
  if (view.current < 0 || !view.prompt) {
    return host ? <Button variant="primary" size="xl" onClick={() => act("open", { index: 0 })} data-testid="trivia-start">Start Our Trivia</Button> : <p className={s.note}>The host is writing questions.</p>;
  }
  return (
    <div className={s.round}>
      <p className={s.status}>Question {view.current + 1} of {view.count}</p>
      <div className={s.row}>
        <p className={s.prompt} data-testid="trivia-question">{view.prompt}</p>
        <ReadAloud text={view.prompt} lang={root} />
      </div>
      <ul className={s.choices}>
        {view.choices.map((c, i) => (
          <li key={c}>
            {host ? (
              <Card pad="sm" className={s.choice} data-right={view.answer === i || undefined}>{view.answer === i ? `Right: ${c}` : c}</Card>
            ) : (
              <Button variant={view.answer === i ? "success" : view.myPick === i ? "accent" : "secondary"} block className={s.choice} disabled={!view.open || view.myPick !== null} onClick={() => act("answer", { pick: i })} data-testid="trivia-pick">{c}</Button>
            )}
          </li>
        ))}
      </ul>
      <p className={s.note}>{view.picked} answered</p>
      {host && view.open ? <Button variant="primary" size="lg" onClick={() => act("reveal")} data-testid="trivia-reveal">Show the answer</Button> : null}
      {host && !view.open && view.current + 1 < view.count ? <Button variant="primary" size="lg" onClick={() => act("open", { index: view.current + 1 })} data-testid="trivia-next">Next question</Button> : null}
      {!view.open && view.current + 1 >= view.count ? <p className={s.prompt}>That was the last one</p> : null}
    </div>
  );
}

export function TriviaRound({ lobby, token, role }: RoundProps) {
  const { data, refresh } = usePoll(() => (token ? fetchTrivia(bound(), token, lobby.id) : Promise.resolve({ ok: false as const, error: "offline" })));
  const [error, setError] = useState<string | null>(null);
  const view = data?.trivia ?? null;
  const act = (action: Parameters<typeof triviaAct>[3], extra: Record<string, unknown> = {}) => {
    if (!token) return;
    void triviaAct(bound(), token, lobby.id, action, extra).then((r) => {
      setError(r.ok ? null : ERRORS[r.error] ?? "That did not save. Try again.");
      refresh();
    });
  };
  const editing = lobby.isHost && role !== "tv" && (!view || view.current < 0);
  return (
    <section className={s.round} data-role={role} data-testid="trivia-round">
      <SectionHeading eyebrow="Round">Our Trivia</SectionHeading>
      {editing ? <Editor key={view?.count ?? 0} initial={view?.questions ?? null} save={(questions) => act("save", { questions })} /> : null}
      {view && (!editing || view.count > 0) ? <Board view={view} root={lobby.root} host={lobby.isHost} act={act} /> : null}
      {!view && !lobby.isHost ? <p className={s.note}>The host is writing questions.</p> : null}
      {error ? <p className={s.error} role="alert">{error}</p> : null}
    </section>
  );
}

export const OUR_TRIVIA: RoundModule = { id: "our-trivia", title: "Our Trivia", blurb: "The host writes up to ten questions about the family or the year.", Round: TriviaRound };
