import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "./deck";
import { selfRating, type GradeResult, type Item, type Question } from "./grade";
import type { Session } from "./setup";

type Screen = "home" | "quiz" | "review" | "stats";

export const COMMANDS: { name: string; run: Screen | "quit" | "help"; hint: string }[] = [
  { name: "quiz", run: "quiz", hint: "timed multiple choice" },
  { name: "review", run: "review", hint: "due cards, self rated" },
  { name: "stats", run: "stats", hint: "counts and device" },
  { name: "home", run: "home", hint: "main menu" },
  { name: "help", run: "help", hint: "key bindings" },
  { name: "quit", run: "quit", hint: "exit bkt" },
];

export function isSubsequence(needle: string, hay: string): boolean {
  let at = 0;
  for (const ch of needle) {
    at = hay.indexOf(ch, at);
    if (at < 0) return false;
    at++;
  }
  return true;
}

export function matchCommands(input: string) {
  const q = input.trim().toLowerCase();
  return COMMANDS.filter((c) => isSubsequence(q, c.name));
}

const HELP = [
  ["j / k", "move down / up"],
  ["g / G", "first / last"],
  ["enter / l", "select"],
  ["1-4", "pick a choice or rate a card"],
  ["space", "reveal the answer in review"],
  ["q / esc / h", "back"],
  [":", "command palette"],
  ["?", "toggle help"],
];

const MENU: Screen[] = ["quiz", "review", "stats"];

function useNow(ms: number, active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, active]);
  return now;
}

function Home({ cursor, session }: { cursor: number; session: Session }) {
  const s = session.store.stats(Date.now());
  return (
    <Box flexDirection="column">
      <Text bold>bkt</Text>
      <Text dimColor>
        {s.items} items, {s.due} due, {s.attempts} attempts
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {MENU.map((m, i) => (
          <Text key={m} color={i === cursor ? "cyan" : undefined}>
            {i === cursor ? "> " : "  "}
            {m}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

function Quiz({ session, onDone, keys }: { session: Session; onDone: () => void; keys: KeyBus }) {
  const seed = useMemo(() => String(Date.now()), []);
  const questions = useMemo<Question[]>(() => quizQuestions(session.store, pickSession(session.store, Date.now(), 10, seed), seed), [session, seed]);
  const [idx, setIdx] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [started, setStarted] = useState(Date.now());
  const [last, setLast] = useState<GradeResult | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[idx];
  const now = useNow(250, !!q && !last);

  const submit = (choice: number | null) => {
    if (!q || last) return;
    const t = Date.now();
    const r = answerQuiz(session.store, q, choice, t - started, t);
    setLast(r);
    if (r.correct) setScore((s) => s + 1);
  };
  const advance = () => {
    setLast(null);
    setCursor(0);
    setIdx((i) => i + 1);
    setStarted(Date.now());
  };

  const remaining = q ? Math.max(0, q.limitSec - Math.floor((now - started) / 1000)) : 0;
  useEffect(() => {
    if (q && !last && remaining === 0) submit(null);
  });

  keys.current = (input, key) => {
    if (!q) return input === "q" || key.escape || key.return ? onDone() : undefined;
    if (last) {
      if (key.return || input === "l" || input === " " || input === "n") advance();
      else if (input === "q" || key.escape) onDone();
      return;
    }
    if (input === "j" || key.downArrow) setCursor((c) => Math.min(q.choices.length - 1, c + 1));
    else if (input === "k" || key.upArrow) setCursor((c) => Math.max(0, c - 1));
    else if (input === "g") setCursor(0);
    else if (input === "G") setCursor(q.choices.length - 1);
    else if (/^[1-9]$/.test(input) && Number(input) <= q.choices.length) submit(Number(input) - 1);
    else if (key.return || input === "l") submit(cursor);
    else if (input === "q" || key.escape) onDone();
  };

  if (!questions.length) return <Text>No items in the content pack.</Text>;
  if (!q)
    return (
      <Box flexDirection="column">
        <Text bold>
          Quiz done: {score}/{questions.length}
        </Text>
        <Text dimColor>enter to go back</Text>
      </Box>
    );
  return (
    <Box flexDirection="column">
      <Text dimColor>
        {idx + 1}/{questions.length} score {score} {last ? "" : `${remaining}s`}
      </Text>
      <Box marginY={1}>
        <Text bold>{q.prompt}</Text>
      </Box>
      {q.choices.map((c, i) => {
        const mark = last ? (i === q.answerIndex ? "green" : undefined) : i === cursor ? "cyan" : undefined;
        return (
          <Text key={i} color={mark}>
            {i === cursor && !last ? "> " : "  "}
            {i + 1}. {c}
          </Text>
        );
      })}
      {last && (
        <Text color={last.correct ? "green" : "red"}>
          {last.timedOut ? "time up" : last.correct ? "correct" : "wrong"}, enter for next
        </Text>
      )}
    </Box>
  );
}

function Review({ session, onDone, keys }: { session: Session; onDone: () => void; keys: KeyBus }) {
  const items = useMemo<Item[]>(() => {
    const now = Date.now();
    const byId = new Map(session.store.items().map((i) => [i.id, i]));
    return session.store.dueItemIds(now, 50).map((id) => byId.get(id)).filter((i): i is Item => !!i);
  }, [session]);
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [started, setStarted] = useState(Date.now());
  const item = items[idx];

  keys.current = (input, key) => {
    if (input === "q" || key.escape) return onDone();
    if (!item) return key.return ? onDone() : undefined;
    if (!shown) {
      if (input === " " || key.return || input === "l") setShown(true);
      return;
    }
    const rating = selfRating(input);
    if (rating) {
      const t = Date.now();
      answerReview(session.store, item.id, rating, t - started, t);
      setShown(false);
      setIdx((i) => i + 1);
      setStarted(Date.now());
    }
  };

  if (!item) return <Text>{items.length ? "Review done." : "Nothing due. Run a quiz to seed cards."}</Text>;
  return (
    <Box flexDirection="column">
      <Text dimColor>
        {idx + 1}/{items.length} {item.title}
      </Text>
      <Box marginY={1}>
        <Text bold>{item.prompt}</Text>
      </Box>
      {shown ? (
        <Box flexDirection="column">
          <Text>{item.answer}</Text>
          <Text dimColor>1 again 2 hard 3 good 4 easy</Text>
        </Box>
      ) : (
        <Text dimColor>space to reveal</Text>
      )}
    </Box>
  );
}

function Stats({ session }: { session: Session }) {
  const s = session.store.stats(Date.now());
  return (
    <Box flexDirection="column">
      <Text bold>stats</Text>
      <Text>items {s.items}</Text>
      <Text>cards seen {s.seen}</Text>
      <Text>due now {s.due}</Text>
      <Text>attempts {s.attempts}</Text>
      <Text>outbox {session.store.outboxCount()}</Text>
      <Text>device {session.device.id}</Text>
      <Text>keyring {session.keyring.kind}</Text>
    </Box>
  );
}

type KeyHandler = (input: string, key: Parameters<Parameters<typeof useInput>[0]>[1]) => void;
type KeyBus = { current: KeyHandler | null };

export function App({ session }: { session: Session }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [cursor, setCursor] = useState(0);
  const [help, setHelp] = useState(false);
  const [palette, setPalette] = useState<string | null>(null);
  const [paletteCursor, setPaletteCursor] = useState(0);
  const keys = useMemo<KeyBus>(() => ({ current: null }), []);

  const run = (target: Screen | "quit" | "help") => {
    if (target === "quit") return exit();
    if (target === "help") return setHelp(true);
    setScreen(target);
  };

  useInput((input, key) => {
    if (palette !== null) {
      const matches = matchCommands(palette);
      if (key.escape) setPalette(null);
      else if (key.return) {
        const pick = matches[paletteCursor];
        setPalette(null);
        if (pick) run(pick.run);
      } else if (key.downArrow || (key.ctrl && input === "n")) setPaletteCursor((c) => Math.min(matches.length - 1, c + 1));
      else if (key.upArrow || (key.ctrl && input === "p")) setPaletteCursor((c) => Math.max(0, c - 1));
      else if (key.backspace || key.delete) setPalette((p) => (p ? p.slice(0, -1) : null));
      else if (input && !key.ctrl && !key.meta) {
        setPalette((p) => (p ?? "") + input);
        setPaletteCursor(0);
      }
      return;
    }
    if (input === "?") return setHelp((h) => !h);
    if (help) {
      if (input === "q" || key.escape) setHelp(false);
      return;
    }
    if (input === ":") {
      setPalette("");
      setPaletteCursor(0);
      return;
    }
    if (screen === "home") {
      if (input === "j" || key.downArrow) setCursor((c) => Math.min(MENU.length - 1, c + 1));
      else if (input === "k" || key.upArrow) setCursor((c) => Math.max(0, c - 1));
      else if (input === "g") setCursor(0);
      else if (input === "G") setCursor(MENU.length - 1);
      else if (key.return || input === "l") setScreen(MENU[cursor]);
      else if (input === "q") exit();
      return;
    }
    if (screen === "stats") {
      if (input === "q" || input === "h" || key.escape) setScreen("home");
      return;
    }
    keys.current?.(input, key);
  });

  const back = () => setScreen("home");
  return (
    <Box flexDirection="column" paddingX={1}>
      {help ? (
        <Box flexDirection="column">
          <Text bold>keys</Text>
          {HELP.map(([k, v]) => (
            <Text key={k}>
              <Text color="cyan">{k.padEnd(12)}</Text>
              {v}
            </Text>
          ))}
          <Text dimColor>? or esc to close</Text>
        </Box>
      ) : screen === "home" ? (
        <Home cursor={cursor} session={session} />
      ) : screen === "quiz" ? (
        <Quiz session={session} onDone={back} keys={keys} />
      ) : screen === "review" ? (
        <Review session={session} onDone={back} keys={keys} />
      ) : (
        <Stats session={session} />
      )}
      {palette !== null && (
        <Box flexDirection="column" borderStyle="round" marginTop={1}>
          <Text>:{palette}</Text>
          {matchCommands(palette).map((c, i) => (
            <Text key={c.name} color={i === paletteCursor ? "cyan" : undefined}>
              {c.name.padEnd(8)}
              <Text dimColor>{c.hint}</Text>
            </Text>
          ))}
        </Box>
      )}
      <Text dimColor>? help : commands q back</Text>
    </Box>
  );
}
