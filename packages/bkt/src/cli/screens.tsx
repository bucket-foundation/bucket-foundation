import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useStdout } from "ink";
import { branchLabel, searchCanon, searchParams, showExcerpt, type CanonSource, type Excerpt, type SearchHit } from "../core/search";
import type { Note } from "../notes";
import { atlasFrontier, fitWidth, frontierLines, NO_ATLAS } from "./atlas";
import { stamp } from "./out";

export const TABS = [
  { key: "1", screen: "search", label: "Search", route: "/canon" },
  { key: "2", screen: "graph", label: "Graph", route: "/atlases" },
  { key: "3", screen: "home", label: "Learn", route: "/learn" },
  { key: "4", screen: "research", label: "Research", route: "/notes" },
  { key: "5", screen: "jobs", label: "Jobs", route: "/jobs" },
] as const;

export type TabScreen = (typeof TABS)[number]["screen"];

export const SEARCH_DEBOUNCE_MS = 150;
export const NARROW_COLUMNS = 80;

export type Key = { return?: boolean; escape?: boolean; upArrow?: boolean; downArrow?: boolean; backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean; tab?: boolean };
export type KeyHandler = (input: string, key: Key) => boolean;

export function nextTab(screen: string, step: number): TabScreen {
  const at = TABS.findIndex((t) => t.screen === screen);
  return TABS[(Math.max(0, at) + step + TABS.length) % TABS.length].screen;
}

export function TabBar({ screen }: { screen: string }) {
  return (
    <Box>
      {TABS.map((t) => (
        <Text key={t.key} color={t.screen === screen ? "cyan" : undefined} bold={t.screen === screen} dimColor={t.screen !== screen}>
          {t.key} {t.label}
          {"  "}
        </Text>
      ))}
    </Box>
  );
}

function useColumns(): number {
  const { stdout } = useStdout();
  return stdout?.columns ?? NARROW_COLUMNS;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(0, n - 1))}…` : s);

function Detail({ e, width, scroll }: { e: Excerpt; width: number; scroll: number }) {
  const shown = e.evidence.slice(scroll, scroll + 3);
  return (
    <Box flexDirection="column" width={width}>
      <Text bold>{e.title}</Text>
      <Text dimColor>{branchLabel(e.branch)}</Text>
      <Box marginY={1}>
        <Text>{clip(e.text, 600)}</Text>
      </Box>
      <Text bold>{e.evidence.length ? `Evidence, ${e.evidence.length} ${e.evidence.length === 1 ? "passage" : "passages"}` : "No evidence passages."}</Text>
      {shown.map((p, n) => (
        <Box key={scroll + n} flexDirection="column" marginTop={1}>
          <Text color="cyan">
            {scroll + n + 1}. {p.title}
            {p.author ? `, ${p.author}` : ""}
          </Text>
          <Text>{clip(p.text.replace(/\s+/g, " "), 320)}</Text>
        </Box>
      ))}
      <Text dimColor>j/k passages, y copy number, o open in the window, esc back</Text>
    </Box>
  );
}

export interface SearchProps {
  canon: CanonSource;
  keys: { current: KeyHandler | null };
  onOpen: (route: string) => void;
  onCopy: (text: string) => void;
}

export function SearchScreen({ canon, keys, onOpen, onCopy }: SearchProps) {
  const columns = useColumns();
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(true);
  const [settled, setSettled] = useState("");
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState<Excerpt | null>(null);
  const [scroll, setScroll] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSettled(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const hits = useMemo<SearchHit[]>(() => {
    if (!settled.trim()) return [];
    const r = searchCanon(canon, searchParams(settled, { limit: 20 }), { matchedOnly: true });
    return r.ok ? r.results : [];
  }, [canon, settled]);
  const empty = canon.index().length === 0;

  keys.current = (input, key) => {
    if (open) {
      if (key.escape || input === "q" || input === "h") setOpen(null);
      else if (input === "j" || key.downArrow) setScroll((s) => Math.min(Math.max(0, open.evidence.length - 1), s + 1));
      else if (input === "k" || key.upArrow) setScroll((s) => Math.max(0, s - 1));
      else if (input === "y") {
        onCopy(String(open.id));
        setNote(`Copied excerpt number ${open.id}.`);
      } else if (input === "o") onOpen("/canon");
      return true;
    }
    if (typing) {
      if (key.escape) setTyping(false);
      else if (key.return) {
        setTyping(false);
        setSettled(query);
      } else if (key.downArrow) setTyping(false);
      else if (key.backspace || key.delete) setQuery((q) => q.slice(0, -1));
      else if (input && !key.ctrl && !key.meta && !key.tab) {
        setQuery((q) => q + input);
        setCursor(0);
      } else return false;
      return true;
    }
    if (input === "/") {
      setTyping(true);
      return true;
    }
    if (input === "j" || key.downArrow) setCursor((c) => Math.min(Math.max(0, hits.length - 1), c + 1));
    else if (input === "k" || key.upArrow) setCursor((c) => Math.max(0, c - 1));
    else if (input === "g") setCursor(0);
    else if (input === "G") setCursor(Math.max(0, hits.length - 1));
    else if ((key.return || input === "l") && hits[cursor]) {
      setOpen(showExcerpt(canon, hits[cursor].id));
      setScroll(0);
      setNote("");
    } else if (input === "y" && hits[cursor]) {
      onCopy(String(hits[cursor].id));
      setNote(`Copied excerpt number ${hits[cursor].id}.`);
    } else return false;
    return true;
  };

  const wide = columns >= NARROW_COLUMNS;
  const listWidth = wide && open ? Math.floor(columns * 0.4) : columns - 2;
  const list = (
    <Box flexDirection="column" width={listWidth}>
      <Text>
        <Text color={typing ? "cyan" : undefined}>/ </Text>
        {query}
        {typing ? <Text color="cyan">_</Text> : null}
      </Text>
      {empty ? (
        <Text>This copy of bkt holds no canon. Run bkt update.</Text>
      ) : !settled.trim() ? (
        <Text dimColor>Type to search the canon.</Text>
      ) : hits.length === 0 ? (
        <Text>Nothing in the canon matches that.</Text>
      ) : (
        hits.slice(0, 12).map((h, i) => (
          <Text key={h.id} color={i === cursor && !typing ? "cyan" : undefined} wrap="truncate">
            {i === cursor && !typing ? "> " : "  "}
            {h.title} <Text dimColor>{branchLabel(h.branch)}</Text>
          </Text>
        ))
      )}
      <Text dimColor>{typing ? "enter or esc to pick a result" : "/ search, j/k move, enter details, y copy number, o open in the window"}</Text>
    </Box>
  );
  return (
    <Box flexDirection="column">
      {open && !wide ? (
        <Detail e={open} width={columns - 2} scroll={scroll} />
      ) : (
        <Box>
          {list}
          {open ? (
            <Box marginLeft={2}>
              <Detail e={open} width={columns - listWidth - 4} scroll={scroll} />
            </Box>
          ) : null}
        </Box>
      )}
      {note ? <Text color="green">{note}</Text> : null}
    </Box>
  );
}

export interface GraphView {
  nodes: number;
  edges: number;
}

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

export function graphView(raw: unknown): GraphView | null {
  if (!raw || typeof raw !== "object") return null;
  const outer = raw as { graph?: unknown; nodes?: unknown; edges?: unknown; links?: unknown };
  const g = (outer.graph && typeof outer.graph === "object" ? outer.graph : outer) as { nodes?: unknown; edges?: unknown; links?: unknown };
  const nodes = count(g.nodes);
  return nodes ? { nodes, edges: count(g.edges ?? g.links) } : null;
}

export function FrontierScreen() {
  const { stdout } = useStdout();
  const lines = useMemo(() => {
    const f = atlasFrontier();
    return f ? frontierLines(f, fitWidth(stdout?.columns), false) : [NO_ATLAS];
  }, [stdout?.columns]);
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} bold={i === 0}>
          {line || " "}
        </Text>
      ))}
      <Text dimColor>q goes back; bkt atlas frontier --svg FILE writes the drawing</Text>
    </Box>
  );
}

export function GraphScreen({ graph }: { graph: GraphView | null }) {
  return (
    <Box flexDirection="column">
      <Text bold>Graph</Text>
      {graph ? (
        <Text>
          {graph.nodes} ideas joined by {graph.edges} links.
        </Text>
      ) : (
        <Text>No graph in this pack yet.</Text>
      )}
      <Text dimColor>o opens the atlases in the window</Text>
    </Box>
  );
}

export interface ResearchView {
  notes: Pick<Note, "title" | "pinned" | "updatedAt">[];
  saved: { results: number; importedAt: number } | null;
}

export function ResearchScreen({ view }: { view: ResearchView }) {
  return (
    <Box flexDirection="column">
      <Text bold>Research</Text>
      <Text>Recent notes</Text>
      {view.notes.length ? (
        view.notes.slice(0, 8).map((n, i) => (
          <Text key={i} wrap="truncate">
            {"  "}
            {n.pinned ? "* " : ""}
            {n.title || "Untitled"} <Text dimColor>{stamp(n.updatedAt)}</Text>
          </Text>
        ))
      ) : (
        <Text dimColor>  No notes yet. Write one in the Bucket window.</Text>
      )}
      <Box marginTop={1}>
        {view.saved ? (
          <Text>
            Saved results: {view.saved.results}, brought in {stamp(view.saved.importedAt)}
          </Text>
        ) : (
          <Text dimColor>No saved results yet. Bring them in from the history view of the Bucket window.</Text>
        )}
      </Box>
      <Text dimColor>o opens notes in the window</Text>
    </Box>
  );
}

export interface JobView {
  name: string;
  mtime: number;
}

export function JobsScreen({ jobs }: { jobs: JobView[] }) {
  const width = Math.max(0, ...jobs.map((j) => j.name.length));
  return (
    <Box flexDirection="column">
      <Text bold>Jobs</Text>
      {jobs.length ? (
        jobs.slice(0, 15).map((j, i) => (
          <Text key={i} wrap="truncate">
            {"  "}
            {j.name.padEnd(width)} <Text dimColor>{stamp(j.mtime)}</Text>
          </Text>
        ))
      ) : (
        <Text dimColor>No saved analyses yet. Run bkt analyze with a data file.</Text>
      )}
      <Text dimColor>o opens jobs in the window</Text>
    </Box>
  );
}
