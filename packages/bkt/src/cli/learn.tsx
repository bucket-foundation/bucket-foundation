import React, { useEffect, useState } from "react";
import { Box, render, Text, useApp, useInput } from "ink";
import type { LearnBackend } from "../core/backend";
import { LearnError, type PublicQuestion, type QuizOutcome, type ReviewCard } from "../core/learn";
import type { PackDeck } from "../pack/export";
import type { Atom } from "../../../../src/lib/academy/engine";
import { jsonLine, textRows } from "./out";
import { CancelledError, NoDataError, UsageError } from "./run";
import { EXIT, type CommandSpec } from "./table";

export type Lines = AsyncIterable<string>;

export interface LearnIo {
  print: (line: string) => void;
  lines: () => Lines;
}

const consoleIo: LearnIo = { print: (l) => console.log(l), lines: () => console as unknown as Lines };

function parseLine(line: string, n: number, spec: CommandSpec): Record<string, unknown> {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    throw new UsageError(`answer line ${n} is not one JSON object`, spec);
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new UsageError(`answer line ${n} is not one JSON object`, spec);
  const r = v as Record<string, unknown>;
  if (typeof r.elapsedMs !== "number" || !Number.isFinite(r.elapsedMs) || r.elapsedMs < 0) throw new UsageError(`answer line ${n} needs elapsedMs, a number of milliseconds`, spec);
  return r;
}

async function* answers(io: LearnIo, spec: CommandSpec): AsyncGenerator<{ n: number; row: Record<string, unknown> }> {
  let n = 0;
  for await (const raw of io.lines()) {
    const line = raw.trim();
    if (!line) continue;
    n++;
    yield { n, row: parseLine(line, n, spec) };
  }
}

function matchId(row: Record<string, unknown>, key: string, want: string, n: number, spec: CommandSpec) {
  if (row[key] !== undefined && row[key] !== want) throw new UsageError(`answer line ${n} names ${String(row[key])}; the next question is ${want}`, spec);
}

export async function learnDue(b: LearnBackend, size: number, json: boolean, io: LearnIo = consoleIo): Promise<number> {
  const cards = await b.review(size);
  if (json) io.print(jsonLine("learn due", { cards }));
  else if (cards.length) {
    io.print(cards.length === 1 ? "1 card is due." : `${cards.length} cards are due.`);
    for (const c of cards) io.print(`  ${c.title}${c.long ? " (long)" : ""}`);
  }
  if (!cards.length) throw new NoDataError("nothing is due; run bkt learn quiz to start cards");
  return EXIT.ok;
}

export async function learnPath(b: LearnBackend, deck: PackDeck | null, atoms: Atom[], json: boolean, io: LearnIo = consoleIo): Promise<number> {
  const decks = await b.decks();
  if (!deck) {
    if (json) io.print(jsonLine("learn path", { decks }));
    else io.print(textRows(decks.map((d): [string, string] => [d.title, `${d.introduced} of ${d.atoms} topics started, ${d.due} due, ${d.xp} points`])));
    if (!decks.length) throw new NoDataError("the content pack holds no decks");
    return EXIT.ok;
  }
  const titles = new Map(atoms.map((a) => [a.id, a.title]));
  const topics = atoms.map((a) => ({ id: a.id, title: a.title, requires: (a.requires ?? []).map((r) => titles.get(r) ?? r) }));
  if (json) io.print(jsonLine("learn path", { deck: deck.id, topics }));
  else {
    const p = decks.find((d) => d.id === deck.id);
    io.print(`${deck.title}: ${p ? `${p.introduced} of ${p.atoms} topics started, ${p.due} due` : `${deck.atoms} topics`}.`);
    for (const t of topics) io.print(t.requires.length ? `  ${t.title}, after ${t.requires.join(", ")}` : `  ${t.title}`);
  }
  return EXIT.ok;
}

export async function quizJson(b: LearnBackend, size: number, spec: CommandSpec, io: LearnIo = consoleIo): Promise<number> {
  const questions = await b.quiz(size);
  io.print(jsonLine("learn quiz", { questions }));
  if (!questions.length) throw new NoDataError("no questions yet; the store holds no items");
  let at = 0;
  for await (const { n, row } of answers(io, spec)) {
    const q = questions[at++];
    if (!q) throw new UsageError(`answer line ${n} has no question left to answer`, spec);
    matchId(row, "itemId", q.itemId, n, spec);
    const choice = row.choice === null || row.choice === undefined ? null : row.choice;
    if (choice !== null && (typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice >= q.choices.length))
      throw new UsageError(`answer line ${n} needs choice, a number from 0 to ${q.choices.length - 1}, or null`, spec);
    const r = await b.answerQuiz(q.itemId, choice as number | null, row.elapsedMs as number);
    io.print(jsonLine("learn quiz answer", { itemId: q.itemId, ...r }));
  }
  return EXIT.ok;
}

export async function reviewJson(b: LearnBackend, size: number, spec: CommandSpec, io: LearnIo = consoleIo): Promise<number> {
  const cards = await b.review(size);
  io.print(jsonLine("learn review", { cards }));
  if (!cards.length) throw new NoDataError("nothing is due; run bkt learn quiz to start cards");
  let at = 0;
  for await (const { n, row } of answers(io, spec)) {
    const c = cards[at++];
    if (!c) throw new UsageError(`answer line ${n} has no card left to rate`, spec);
    matchId(row, "itemId", c.id, n, spec);
    if (row.rating !== 1 && row.rating !== 2 && row.rating !== 3 && row.rating !== 4) throw new UsageError(`answer line ${n} needs rating, a number from 1 to 4`, spec);
    const r = await b.rate(c.id, row.rating, row.elapsedMs as number);
    io.print(jsonLine("learn review answer", { itemId: c.id, ...r }));
  }
  return EXIT.ok;
}

export async function daily(b: LearnBackend, day: string, json: boolean, spec: CommandSpec, io: LearnIo = consoleIo): Promise<number> {
  const quiz = await b.daily(day);
  if (!quiz) {
    if (json) io.print(jsonLine("daily", { day, questions: [], answered: [] }));
    throw new NoDataError(`no daily quiz for ${day}`);
  }
  if (json) io.print(jsonLine("daily", { day, ...quiz }));
  else {
    io.print(`Daily quiz for ${day}: ${quiz.questions.length} questions, ${quiz.answered.length} answered.`);
    quiz.questions.forEach((q, i) => {
      io.print(`${i + 1}. ${q.prompt}${quiz.answered.includes(q.id) ? " (answered)" : ""}`);
      for (const l of q.lines) io.print(`   ${l}`);
      (q.choices ?? []).forEach((c, k) => io.print(`   ${String.fromCharCode(97 + k)}) ${c}`));
    });
    io.print("Answer in the Bucket window, or send answers with --json.");
    return EXIT.ok;
  }
  const open = quiz.questions.filter((q) => !quiz.answered.includes(q.id));
  let at = 0;
  for await (const { n, row } of answers(io, spec)) {
    const q = open[at++];
    if (!q) throw new UsageError(`answer line ${n} has no question left to answer`, spec);
    matchId(row, "id", q.id, n, spec);
    const r = await b.answerDaily(day, q.id, row.response ?? null, row.elapsedMs as number);
    io.print(jsonLine("daily answer", { id: q.id, ...r }));
  }
  return EXIT.ok;
}

function useAsync<T>(load: () => Promise<T>): { value: T | null; error: string | null } {
  const [state, set] = useState<{ value: T | null; error: string | null }>({ value: null, error: null });
  useEffect(() => {
    load().then(
      (value) => set({ value, error: null }),
      (e) => set({ value: null, error: e instanceof Error ? e.message : String(e) }),
    );
  }, []);
  return state;
}

export function QuizScreen({ backend, size, onExit }: { backend: LearnBackend; size: number; onExit: (code: number) => void }) {
  const { exit } = useApp();
  const { value: questions, error } = useAsync(() => backend.quiz(size));
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(Date.now());
  const [last, setLast] = useState<QuizOutcome | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const leave = (code: number) => {
    onExit(code);
    exit();
  };
  const q: PublicQuestion | undefined = questions?.[idx];
  useInput((input, key) => {
    if (key.ctrl && input === "c") return leave(EXIT.cancelled);
    if (!questions || !q || problem) return input === "q" || key.escape || key.return ? leave(problem ? EXIT.failure : EXIT.ok) : undefined;
    if (last) {
      if (key.return || input === " " || input === "n") {
        setLast(null);
        setIdx((i) => i + 1);
        setStarted(Date.now());
      } else if (input === "q" || key.escape) leave(EXIT.ok);
      return;
    }
    if (input === "q" || key.escape) return leave(EXIT.ok);
    if (/^[1-9]$/.test(input) && Number(input) <= q.choices.length)
      backend.answerQuiz(q.itemId, Number(input) - 1, Date.now() - started).then(
        (r) => {
          setLast(r);
          if (r.correct) setScore((s) => s + 1);
        },
        (e) => setProblem(e instanceof LearnError ? e.message : String(e)),
      );
  });
  if (error || problem) return <Text color="red">{error ?? problem}</Text>;
  if (!questions) return <Text dimColor>Loading questions.</Text>;
  if (!questions.length) return <Text>No questions yet. Press q to leave.</Text>;
  if (!q)
    return (
      <Text bold>
        Quiz done: {score} of {questions.length}. Press enter to leave.
      </Text>
    );
  return (
    <Box flexDirection="column">
      <Text dimColor>
        {idx + 1} of {questions.length}, score {score}
        {q.long ? ", long" : ""}
      </Text>
      <Box marginY={1}>
        <Text bold>{q.prompt}</Text>
      </Box>
      {q.choices.map((c, i) => (
        <Text key={i}>
          {i + 1}. {c}
        </Text>
      ))}
      {last ? <Text color={last.correct ? "green" : "red"}>{last.timedOut ? "Time ran out" : last.correct ? "Correct" : `Wrong. The answer: ${last.answer}`}. Enter for the next one.</Text> : <Text dimColor>1-{q.choices.length} to answer, q to leave</Text>}
    </Box>
  );
}

export function ReviewScreen({ backend, size, onExit }: { backend: LearnBackend; size: number; onExit: (code: number) => void }) {
  const { exit } = useApp();
  const { value: cards, error } = useAsync(() => backend.review(size));
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [started, setStarted] = useState(Date.now());
  const [problem, setProblem] = useState<string | null>(null);
  const leave = (code: number) => {
    onExit(code);
    exit();
  };
  const c: ReviewCard | undefined = cards?.[idx];
  useInput((input, key) => {
    if (key.ctrl && input === "c") return leave(EXIT.cancelled);
    if (input === "q" || key.escape || !cards || !c || problem) return input === "q" || key.escape || key.return ? leave(problem ? EXIT.failure : EXIT.ok) : undefined;
    if (!shown) {
      if (input === " " || key.return) setShown(true);
      return;
    }
    if (/^[1-4]$/.test(input))
      backend.rate(c.id, Number(input), Date.now() - started).then(
        () => {
          setShown(false);
          setIdx((i) => i + 1);
          setStarted(Date.now());
        },
        (e) => setProblem(e instanceof LearnError ? e.message : String(e)),
      );
  });
  if (error || problem) return <Text color="red">{error ?? problem}</Text>;
  if (!cards) return <Text dimColor>Loading cards.</Text>;
  if (!c) return <Text>{cards.length ? "Review done. Press enter to leave." : "Nothing is due. Press q to leave."}</Text>;
  return (
    <Box flexDirection="column">
      <Text dimColor>
        {idx + 1} of {cards.length}, {c.title}
        {c.long ? ", long" : ""}
      </Text>
      <Box marginY={1}>
        <Text bold>{c.prompt}</Text>
      </Box>
      {shown ? (
        <Box flexDirection="column">
          <Text>{c.answer}</Text>
          <Text dimColor>1 again, 2 hard, 3 good, 4 easy</Text>
        </Box>
      ) : (
        <Text dimColor>space to show the answer</Text>
      )}
    </Box>
  );
}

export async function screen(kind: "quiz" | "review", backend: LearnBackend, size: number): Promise<number> {
  let code: number = EXIT.ok;
  const Screen = kind === "quiz" ? QuizScreen : ReviewScreen;
  await render(<Screen backend={backend} size={size} onExit={(c) => (code = c)} />, { exitOnCtrlC: false }).waitUntilExit();
  if (code === EXIT.cancelled) throw new CancelledError();
  return code;
}
