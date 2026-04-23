"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AboutDrawer from "./AboutDrawer";

type Mode = "keyword" | "semantic" | "hybrid";

type Result = {
  slug: string;
  title: string;
  url: string;
  score: number;
  snippet: string;
};

const MODES: { id: Mode; label: string; tint: string }[] = [
  { id: "keyword", label: "Keyword", tint: "#d9c48c" },
  { id: "semantic", label: "Semantic", tint: "#b7c9d9" },
  { id: "hybrid", label: "Hybrid", tint: "#cdb8d9" },
];

const EXAMPLES = [
  "leptin resistance",
  "why do I wake up at 3am",
  "cold thermogenesis",
  "deuterium depletion",
  "magnetism and mitochondria",
  "blue light and dopamine",
];

function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function highlight(snippet: string, query: string, tint: string): React.ReactNode {
  const cleaned = stripMarkdown(snippet);
  if (!query.trim()) return cleaned;
  const terms = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((t) => t.length > 2),
    ),
  );
  if (terms.length === 0) return cleaned;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = cleaned.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        style={{ backgroundColor: "transparent", color: tint, fontWeight: 500 }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function KruseSearch() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("hybrid");
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const modeTint = MODES.find((m) => m.id === mode)?.tint ?? "#cdb8d9";

  const runSearch = useCallback(
    async (q: string, m: Mode, lim: number) => {
      if (!q.trim()) {
        setResults(null);
        setError(null);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const url = `/api/kruse/search?q=${encodeURIComponent(q)}&mode=${m}&limit=${lim}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) {
          setResults([]);
          setError("Search unavailable.");
          return;
        }
        const data = (await res.json()) as Result[];
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Search failed.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search on input/mode/limit change.
  useEffect(() => {
    const h = setTimeout(() => runSearch(query, mode, limit), 220);
    return () => clearTimeout(h);
  }, [query, mode, limit, runSearch]);

  return (
    <section>
      <div className="mb-6">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 460 articles..."
          aria-label="Search the Kruse Index"
          className="w-full rounded-md border px-5 py-4 text-lg outline-none transition focus:border-[#6e6a5f]"
          style={{
            backgroundColor: "#121518",
            borderColor: "#22262a",
            color: "#ece7dd",
            fontFamily: "var(--font-fraunces)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-5 md:gap-6">
        <div className="flex items-center gap-1 rounded-md border p-1" style={{ borderColor: "#22262a" }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="rounded px-3 py-1.5 text-xs uppercase tracking-wider transition"
              style={{
                fontFamily: "var(--font-jetbrains)",
                backgroundColor: mode === m.id ? "#1d2125" : "transparent",
                color: mode === m.id ? m.tint : "#8a867c",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 text-xs" style={{ color: "#8a867c", fontFamily: "var(--font-jetbrains)" }}>
          <span className="uppercase tracking-wider">Limit</span>
          <input
            type="range"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="w-32 accent-[#cdb8d9]"
            aria-label="Result limit"
          />
          <span className="w-6 text-right" style={{ color: "#bdb7ac" }}>
            {limit}
          </span>
        </label>

        <div className="ml-auto">
          <AboutDrawer />
        </div>
      </div>

      {!query.trim() && !loading && (
        <div>
          <p
            className="mb-3 text-xs uppercase tracking-[0.22em]"
            style={{ color: "#7a7669", fontFamily: "var(--font-jetbrains)" }}
          >
            Try
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuery(ex)}
                className="rounded-full border px-4 py-1.5 text-sm transition hover:border-[#6e6a5f]"
                style={{
                  borderColor: "#22262a",
                  color: "#bdb7ac",
                  fontFamily: "var(--font-fraunces)",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: "#7a7669", fontFamily: "var(--font-jetbrains)" }}
        >
          Searching...
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: "#c79a8c" }}>
          {error}
        </p>
      )}

      {results && results.length === 0 && !loading && !error && query.trim() && (
        <p
          className="text-sm italic"
          style={{ color: "#7a7669", fontFamily: "var(--font-fraunces)" }}
        >
          No matches.
        </p>
      )}

      {results && results.length > 0 && (
        <ol className="space-y-7">
          {results.map((r, i) => (
            <li key={`${r.slug}-${i}`} className="group">
              <div className="mb-1 flex items-baseline gap-3">
                <span
                  className="text-xs tabular-nums"
                  style={{
                    color: modeTint,
                    fontFamily: "var(--font-jetbrains)",
                  }}
                  title="retrieval score"
                >
                  {r.score.toFixed(4)}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lg underline-offset-4 transition hover:underline md:text-xl"
                  style={{ color: "#ece7dd", fontFamily: "var(--font-fraunces)" }}
                >
                  {r.title}
                </a>
              </div>
              <p
                className="text-sm leading-relaxed md:text-base"
                style={{ color: "#bdb7ac", fontFamily: "var(--font-fraunces)" }}
              >
                {highlight(r.snippet, query, modeTint)}
              </p>
              <p
                className="mt-1 truncate text-[11px]"
                style={{ color: "#5c594f", fontFamily: "var(--font-jetbrains)" }}
                title={r.slug}
              >
                {r.slug}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
