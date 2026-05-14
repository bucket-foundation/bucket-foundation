"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Photon = {
  id: string; kind: string; lang: string; surface: string;
  meaning_en: string; tier: string; branch: string[];
  pos?: string | null; ipa?: string | null;
};

type SearchResp = {
  query: string; n_results: number; results: Photon[]; took_ms: number;
  stats?: { total: number; by_lang: Record<string, number> };
};

const EXAMPLE_QUERIES = [
  { q: "light",      hint: "en" },
  { q: "amor",       hint: "la" },
  { q: "重",          hint: "zh" },
  { q: "मन",         hint: "sa" },
  { q: "wisdom",     hint: "en" },
  { q: "tempus",     hint: "la" },
  { q: "Mond",       hint: "de" },
  { q: "ψυχή",       hint: "el" },
];

const LANG_LABEL: Record<string, string> = {
  en: "English",   la: "Latin",      sa: "Sanskrit",   fr: "French",
  de: "German",    es: "Spanish",    it: "Italian",    pt: "Portuguese",
  ru: "Russian",   zh: "Chinese",    ja: "Japanese",   ko: "Korean",
  ar: "Arabic",    he: "Hebrew",     hi: "Hindi",      fa: "Persian",
  el: "Greek",     tr: "Turkish",    pl: "Polish",     nl: "Dutch",
  sv: "Swedish",   fi: "Finnish",    cs: "Czech",      vi: "Vietnamese",
  th: "Thai",      id: "Indonesian", ta: "Tamil",      grc: "Ancient Greek",
};

export default function HomePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Photon[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; n_langs: number; took: number }>({
    total: 0, n_langs: 0, took: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Stats on mount (the search bar's footer line)
  useEffect(() => {
    fetch("/api/photon/search?q=___NEVER___")
      .then((r) => r.json())
      .then((j: SearchResp) => {
        if (j.stats) setStats({
          total: j.stats.total || 0,
          n_langs: Object.keys(j.stats.by_lang || {}).length,
          took: 0,
        });
      })
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/photon/search?q=${encodeURIComponent(q)}&top_k=30`, { signal: ac.signal });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const j = (await r.json()) as SearchResp;
        setResults(j.results || []);
        setStats((s) => ({ ...s, took: j.took_ms || 0 }));
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Keyboard: '/' focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Group results by lang for cleaner reading
  const grouped = (() => {
    const m = new Map<string, Photon[]>();
    for (const p of results) {
      if (!m.has(p.lang)) m.set(p.lang, []);
      m.get(p.lang)!.push(p);
    }
    return Array.from(m.entries());
  })();

  return (
    <main className="min-h-screen relative">
      {/* Hero band with subtle blue glow */}
      <section className="relative">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Po — polingual"
              width="160"
              height="64"
              className="h-14 md:h-16 w-auto"
            />
          </div>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--ink-faint)" }}
          >
            polingual · v0
          </p>
          <h1
            className="mt-5 leading-[1.04] text-[clamp(2.4rem,5.5vw,4.4rem)]"
            style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            every word in every language,
            <br />
            <em style={{ color: "var(--blue)" }}>one meaning.</em>
          </h1>
          <p
            className="mt-5 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
            style={{ color: "var(--ink-dim)" }}
          >
            Cross-lingual dictionary on the photon graph. Surface forms in any
            script · definitions in English · {stats.n_langs || 27} languages indexed.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="relative max-w-2xl mx-auto px-5 md:px-8 pb-2">
        <div
          className="rounded-full bg-white shadow-md transition-all duration-200 ring-1 focus-within:ring-2"
          style={{
            boxShadow: "0 4px 14px -2px rgba(15, 37, 64, 0.10)",
            // @ts-expect-error -- CSS custom prop in style works in modern browsers
            "--tw-ring-color": "var(--blue)",
            "--tw-ring-offset-shadow": "0 0 0 0 #fff",
            ringColor: "var(--blue-soft)",
          }}
        >
          <div className="flex items-center px-4 py-3">
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--blue)" }}
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="type a word · in any language"
              className="flex-1 bg-transparent px-3 py-1 outline-none text-lg md:text-xl"
              style={{ fontFamily: "inherit", color: "var(--ink)" }}
            />
            {q && (
              <button
                onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }}
                className="text-xl leading-none hover:scale-110 transition px-2"
                style={{ color: "var(--ink-faint)" }}
                aria-label="clear"
                title="clear"
              >
                ×
              </button>
            )}
            <kbd
              className="hidden md:inline-flex ml-2 px-2 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: "var(--sky-2)", color: "var(--ink-dim)",
                border: `1px solid ${"var(--hairline-2)"}`,
              }}
            >
              /
            </kbd>
          </div>
        </div>

        {/* Try-pills — only visible when search is empty */}
        {!q && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span
              className="text-[10px] font-mono uppercase tracking-[0.2em] mr-1"
              style={{ color: "var(--ink-faint)" }}
            >
              try
            </span>
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex.q}
                onClick={() => setQ(ex.q)}
                className="rounded-full px-3 py-1 text-sm transition hover:bg-white hover:shadow-sm"
                style={{
                  background: "var(--sky-2)",
                  border: `1px solid ${"var(--hairline)"}`,
                  color: "var(--ink-2)",
                  fontFamily: "inherit",
                }}
              >
                {ex.q}
                <span
                  className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {ex.hint}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Status strip */}
        <p
          className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "var(--ink-faint)" }}
        >
          {q
            ? loading
              ? "searching…"
              : results.length
                ? `${results.length} results · ${stats.took}ms`
                : "no matches — try a different surface or lang"
            : `${stats.total.toLocaleString() || "45,000+"} photons · ${stats.n_langs || 27} languages`}
        </p>
      </section>

      {/* Results — grouped by language */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-24 mt-6">
        {grouped.map(([lang, items]) => (
          <div key={lang} className="mb-8 fade-in">
            <div className="flex items-baseline justify-between mb-3">
              <h2
                className="font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "var(--blue)" }}
              >
                {LANG_LABEL[lang] || lang}
                <span
                  className="ml-2 font-mono text-[10px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  · {lang}
                </span>
              </h2>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: "var(--ink-faint)" }}
              >
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={`/word/${encodeURIComponent(p.id)}`}
                  className="block rounded-xl bg-white px-5 py-4 transition hover:shadow-md"
                  style={{
                    border: `1px solid ${"var(--hairline)"}`,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span
                        className="text-2xl md:text-[28px] truncate"
                        style={{ color: "var(--ink)" }}
                      >
                        {p.surface}
                      </span>
                      {p.ipa && (
                        <span
                          className="font-mono text-xs whitespace-nowrap"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {p.ipa}
                        </span>
                      )}
                    </div>
                    {p.pos && (
                      <span
                        className="font-mono text-[10px] italic whitespace-nowrap"
                        style={{ color: "var(--ink-dim)" }}
                      >
                        {p.pos}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-2 text-[15px] leading-relaxed line-clamp-2"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {p.meaning_en}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state — onboarding */}
        {!q && !results.length && (
          <div className="mt-12 max-w-xl mx-auto text-center">
            <div
              className="rounded-2xl p-6 md:p-8"
              style={{
                background: "var(--sky-2)",
                border: `1px solid ${"var(--hairline)"}`,
              }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.24em] mb-3"
                style={{ color: "var(--blue)" }}
              >
                how to use
              </p>
              <p
                className="text-[15px] leading-relaxed mb-2"
                style={{ color: "var(--ink-2)" }}
              >
                Type a word in any language — Latin, Sanskrit, Japanese, Hebrew,
                Arabic, French — and we return its English meaning plus how it
                relates to the same concept across other languages.
              </p>
              <p
                className="text-[13px]"
                style={{ color: "var(--ink-dim)" }}
              >
                Click a result for full definition · part of speech · IPA ·
                provenance · related photons.
              </p>
            </div>
          </div>
        )}
      </section>

      <footer
        className="text-center pb-10 pt-2 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "var(--ink-faint)" }}
      >
        photon substrate at{" "}
        <a
          href="https://www.bucket.foundation"
          className="underline hover:no-underline"
          style={{ color: "var(--blue)" }}
        >
          bucket.foundation
        </a>
        {" · "}every word, one meaning
      </footer>
    </main>
  );
}
