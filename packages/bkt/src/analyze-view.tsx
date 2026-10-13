import { basename } from "node:path";
import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { formHeadline, listAnalyses, loadSections, type AnalysisResult, type RunningAnalysis, type SavedAnalysis, type Section } from "./analyze";

export interface BrowserState {
  mode: "list" | "sections" | "read";
  pick: number;
  section: number;
  scroll: number;
}

export type Key = { return?: boolean; escape?: boolean; upArrow?: boolean; downArrow?: boolean; ctrl?: boolean };

export function step(s: BrowserState, input: string, key: Key, counts: { items: number; sections: number; lines: number; page: number }): BrowserState | "quit" {
  const clamp = (v: number, n: number) => Math.max(0, Math.min(Math.max(0, n - 1), v));
  const back = input === "q" || input === "h" || key.escape;
  if (s.mode === "list") {
    if (back) return "quit";
    if (input === "j" || key.downArrow) return { ...s, pick: clamp(s.pick + 1, counts.items) };
    if (input === "k" || key.upArrow) return { ...s, pick: clamp(s.pick - 1, counts.items) };
    if (input === "g") return { ...s, pick: 0 };
    if (input === "G") return { ...s, pick: clamp(counts.items - 1, counts.items) };
    if ((input === "l" || key.return) && counts.items > 0) return { ...s, mode: "sections", section: 0, scroll: 0 };
    return s;
  }
  if (s.mode === "sections") {
    if (back) return counts.items > 0 ? { ...s, mode: "list" } : "quit";
    if (input === "j" || key.downArrow) return { ...s, section: clamp(s.section + 1, counts.sections) };
    if (input === "k" || key.upArrow) return { ...s, section: clamp(s.section - 1, counts.sections) };
    if (input === "g") return { ...s, section: 0 };
    if (input === "G") return { ...s, section: clamp(counts.sections - 1, counts.sections) };
    if (input === "l" || key.return) return { ...s, mode: "read", scroll: 0 };
    return s;
  }
  const maxScroll = Math.max(0, counts.lines - counts.page);
  if (back) return { ...s, mode: "sections" };
  if (input === "j" || key.downArrow) return { ...s, scroll: Math.min(maxScroll, s.scroll + 1) };
  if (input === "k" || key.upArrow) return { ...s, scroll: Math.max(0, s.scroll - 1) };
  if ((input === "d" && key.ctrl) || input === " ") return { ...s, scroll: Math.min(maxScroll, s.scroll + counts.page) };
  if (input === "u" && key.ctrl) return { ...s, scroll: Math.max(0, s.scroll - counts.page) };
  if (input === "g") return { ...s, scroll: 0 };
  if (input === "G") return { ...s, scroll: maxScroll };
  if (input === "n") return { ...s, section: clamp(s.section + 1, counts.sections), scroll: 0 };
  if (input === "p") return { ...s, section: clamp(s.section - 1, counts.sections), scroll: 0 };
  return s;
}

export function AnalysisBrowser({ root, openDir }: { root?: string; openDir?: string }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const page = Math.max(5, (stdout?.rows ?? 30) - 6);
  const [items] = useState<SavedAnalysis[]>(() => (openDir ? [] : listAnalyses(root)));
  const [state, setState] = useState<BrowserState>({ mode: openDir ? "sections" : "list", pick: 0, section: 0, scroll: 0 });
  const dir = openDir ?? items[state.pick]?.dir;
  const [cache] = useState(() => new Map<string, Section[]>());
  const secs = dir ? (cache.get(dir) ?? cache.set(dir, loadSections(dir)).get(dir)!) : [];
  const sec = secs[state.section];

  useInput((input, key) => {
    const next = step(state, input, key, { items: items.length, sections: secs.length, lines: sec?.body.length ?? 0, page });
    if (next === "quit") exit();
    else setState(next);
  });

  if (state.mode === "list") {
    return (
      <Box flexDirection="column">
        <Text bold>analyses</Text>
        {items.length === 0 ? <Text dimColor>none yet; run bkt analyze &lt;file&gt;</Text> : null}
        {items.map((a, i) => (
          <Text key={a.dir} color={i === state.pick ? "cyan" : undefined}>
            {i === state.pick ? "> " : "  "}
            {a.name}
          </Text>
        ))}
        <Text dimColor>j/k move, l open, q quit</Text>
      </Box>
    );
  }
  if (state.mode === "sections") {
    return (
      <Box flexDirection="column">
        <Text bold>{dir ? basename(dir) : ""}</Text>
        {secs.map((s, i) => (
          <Text key={s.title} color={i === state.section ? "cyan" : undefined}>
            {i === state.section ? "> " : "  "}
            {s.title}
          </Text>
        ))}
        <Text dimColor>j/k move, l read, h back</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Text bold>
        {sec?.title} ({state.section + 1}/{secs.length})
      </Text>
      {(sec?.body ?? []).slice(state.scroll, state.scroll + page).map((l, i) => (
        <Text key={i} color={l.includes("FAIL") ? "red" : l.includes("PASS") ? "green" : undefined}>
          {l || " "}
        </Text>
      ))}
      <Text dimColor>j/k scroll, space page, n/p section, h back</Text>
    </Box>
  );
}

const FRAMES = ["|", "/", "-", "\\"];

export function AnalyzeRun({ run, file, onResult }: { run: RunningAnalysis; file: string; onResult: (r: AnalysisResult) => void }) {
  const { exit } = useApp();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tick, setTick] = useState(0);
  const [started] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 120);
    run.done.then((r) => {
      clearInterval(t);
      onResult(r);
      setResult(r);
      if (r.cancelled) exit();
    });
    return () => clearInterval(t);
  }, [run]);
  useInput((input, key) => {
    if (!result) {
      if (input === "q" || key.escape || (key.ctrl && input === "c")) run.cancel();
      return;
    }
    if (!result.report && (input === "q" || key.escape || key.return)) exit();
  });
  if (!result) {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="cyan">{FRAMES[tick % FRAMES.length]}</Text> analyzing {file}, {Math.floor((Date.now() - started) / 1000)}s
        </Text>
        <Text dimColor>q or esc cancels</Text>
      </Box>
    );
  }
  if (result.report) {
    return (
      <Box flexDirection="column">
        <Text color={result.report.form.ok ? "green" : "red"}>{formHeadline(result.report)}</Text>
        <AnalysisBrowser openDir={result.report.dir} />
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Text color="red">{result.stderr.trim() || "analyzer produced no report"}</Text>
      <Text dimColor>q to quit</Text>
    </Box>
  );
}
