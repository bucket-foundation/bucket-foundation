import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { Bank, Review } from "./bank";
import type { AiScores } from "./probe";
import { malformedCount, THINK_MS } from "./probe";
import { ProbeRun, report } from "./session";
import type { Estimate } from "./stats";
import type { HaiStore } from "./store";

export interface HaiData {
  bank: Bank | null;
  review: Review | null;
  scores: AiScores | null;
}

const LETTERS = ["1", "2", "3", "4"];

export function fmt(e: Estimate): string {
  if (e.value === null) return "n/a";
  const ci = e.lo === null || e.hi === null ? "CI n/a" : `95% CI ${e.lo.toFixed(2)} to ${e.hi.toFixed(2)}`;
  return `${e.value.toFixed(2)} (${ci})`;
}

export function readiness(d: HaiData): string | null {
  if (!d.bank) return "No frozen bank. Run bkt hai freeze.";
  if (!d.review || d.review.bankVersion !== d.bank.version) return "No review for this bank. Run bkt hai review.";
  if (!d.scores || d.scores.bankVersion !== d.bank.version) return "No AI scores for this bank. Run bkt hai score, then --collect.";
  return null;
}

function Consent({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  useInput((input, key) => (input === "y" ? onYes() : input === "n" || input === "q" || key.escape ? onNo() : undefined));
  return (
    <Box flexDirection="column">
      <Text bold>Human and AI probe</Text>
      <Text>Each probe asks 40 questions. You answer half alone. On the other half you think for 20 seconds, then see an AI answer you may accept or override.</Text>
      <Text>Seven days later you answer all 40 again without help. Scores appear after that retest.</Text>
      <Text>Recorded on this device only: your choices, correctness, timing, and whether you took the AI answer. Nothing is sent anywhere.</Text>
      <Text>Delete everything with bkt hai wipe. Export with bkt hai export.</Text>
      <Text color="cyan">y to agree, n to leave</Text>
    </Box>
  );
}

function Runner({ run, onDone }: { run: ProbeRun; onDone: () => void }) {
  const [started, setStarted] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const shown = run.current();
  const elapsed = now - started;
  const aiOn = run.aiShown(elapsed);
  const pick = (choice: number | null) => {
    const t = Date.now();
    run.answer(choice, t - started, t);
    setStarted(t);
    force((x) => x + 1);
    if (run.done) onDone();
  };
  useInput((input, key) => {
    if (!shown) return;
    const n = LETTERS.indexOf(input);
    if (n >= 0 && n < shown.order.length) pick(shown.order[n]);
    else if (input === "a" && aiOn && shown.ai?.choice != null) pick(shown.ai.choice);
    else if (input === "s") pick(null);
    else if (input === "q" || key.escape) onDone();
  });
  if (!shown) return <Text>Done.</Text>;
  const aiPos = shown.ai?.choice != null ? shown.order.indexOf(shown.ai.choice) : -1;
  const pair = run.phase === "t0" && shown.slot.condition === "pair";
  return (
    <Box flexDirection="column">
      <Text dimColor>
        {run.phase === "retest" ? "Retest, unaided" : pair ? "With AI" : "Alone"} · {run.position + 1} of {run.total}
      </Text>
      <Text bold>{shown.item.prompt}</Text>
      {shown.order.map((c, i) => (
        <Text key={i}>
          {i + 1}. {shown.item.choices[c]}
        </Text>
      ))}
      {pair && !aiOn && <Text dimColor>AI answer in {Math.max(0, Math.ceil((THINK_MS - elapsed) / 1000))} s</Text>}
      {pair && aiOn && aiPos >= 0 && (
        <Text color="yellow">
          AI picks {aiPos + 1}: {shown.ai!.rationale} (a to accept)
        </Text>
      )}
      <Text dimColor>1-4 answer, s skip, q stop</Text>
    </Box>
  );
}

function ReportView({ hai, scores }: { hai: HaiStore; scores: AiScores | null }) {
  const r = report(hai, scores);
  const next = r.nextRetest ? new Date(r.nextRetest).toLocaleString() : "none";
  if (!r.summary) return <Text>No retested probes yet. Next retest: {next}</Text>;
  const s = r.summary;
  return (
    <Box flexDirection="column">
      <Text bold>
        {s.pairs} pairs over {r.retestedProbes} retested probes
      </Text>
      <Text>
        H {s.H.toFixed(2)} J {s.J.toFixed(2)} A {s.A.toFixed(2)} (guess-corrected)
      </Text>
      <Text>D = J - max(H, A): {fmt(s.D)}</Text>
      {scores && malformedCount(scores) > 0 && <Text dimColor>{malformedCount(scores)} malformed AI replies left out of A and of probes</Text>}
      <Text>m = J / max(H, A): {fmt(s.m)}</Text>
      <Text>Retention R: {fmt(s.R)}</Text>
      <Text>Learning L = J(t+7) - H(t+7): {fmt(s.L)}</Text>
      <Text>Dependence: {s.dependence === null ? "not enough data" : s.dependence ? "yes" : "no"}</Text>
      {!r.trend && <Text dimColor>Trend opens at 5 retested probes; n={r.retestedProbes} of 5.</Text>}
      <Text dimColor>Next retest: {next}</Text>
    </Box>
  );
}

type Screen = { kind: "home" } | { kind: "run"; run: ProbeRun } | { kind: "report" } | { kind: "message"; text: string };

export function HaiApp({ hai, data }: { hai: HaiStore; data: HaiData }) {
  const { exit } = useApp();
  const [consented, setConsented] = useState(hai.consented());
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const home = () => setScreen({ kind: "home" });
  const due = consented ? hai.dueRetests(Date.now()) : [];
  const blocked = readiness(data);
  useInput(
    (input, key) => {
      if (screen.kind !== "home") {
        if (input === "q" || key.escape || key.return) home();
        return;
      }
      if (input === "q" || key.escape) exit();
      else if (input === "r") setScreen({ kind: "report" });
      else if (input === "p" || key.return) {
        if (blocked) return setScreen({ kind: "message", text: blocked });
        try {
          const run = due.length
            ? ProbeRun.retest(hai, data.bank!, data.scores!, due[0].id, due[0].seed)
            : ProbeRun.start(hai, data.bank!, data.review!, data.scores!, Date.now());
          setScreen({ kind: "run", run });
        } catch (e) {
          setScreen({ kind: "message", text: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    { isActive: consented && screen.kind !== "run" },
  );
  if (!consented)
    return (
      <Consent
        onYes={() => {
          hai.consent(Date.now());
          setConsented(true);
        }}
        onNo={exit}
      />
    );
  if (screen.kind === "run")
    return (
      <Runner
        run={screen.run}
        onDone={() =>
          setScreen({
            kind: "message",
            text: screen.run.done
              ? screen.run.phase === "t0"
                ? "Probe recorded. The retest opens in 7 days; scores appear after it."
                : "Retest recorded. Press r on the home screen for scores."
              : "Stopped. Unfinished probes stay out of the scores.",
          })
        }
      />
    );
  if (screen.kind === "report") return <ReportView hai={hai} scores={data.scores} />;
  if (screen.kind === "message") return <Text>{screen.text}</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>bkt hai</Text>
      <Text>{due.length ? `${due.length} retest due. p to start it.` : "p to start a 40-question probe."}</Text>
      <Text dimColor>r scores, q quit</Text>
    </Box>
  );
}
