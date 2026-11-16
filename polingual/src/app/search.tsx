"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Button } from "@/ui";

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

function SearchBox({ q, setQ, clear, inputRef }: { q: string; setQ: (q: string) => void; clear: () => void; inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <div
      className="rounded-full bg-white shadow-[0_4px_0_var(--pl-lip-soft)] transition-all duration-200 ring-1 ring-[color:var(--pl-lapis-soft)] focus-within:ring-2 focus-within:ring-[color:var(--pl-lapis)]"
    >
      <div className="flex items-center px-4 py-3">
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--blue)]"
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
          placeholder="type a word in any language"
          className="flex-1 bg-transparent px-3 py-1 outline-none text-lg md:text-xl font-[inherit] text-[color:var(--pl-ink)]"
        />
        {q && (
          <Button
            bare
            onClick={clear}
            className="text-xl leading-none hover:scale-110 transition px-2 text-[color:var(--ink-faint)]"
            aria-label="clear"
            title="clear"
          >
            ×
          </Button>
        )}
        <kbd
          className="hidden md:inline-flex ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--pl-paper-2)] text-[color:var(--pl-ink-dim)] border border-[color:var(--pl-hairline-2)]"
        >
          /
        </kbd>
      </div>
    </div>
  );
}

function Examples({ q, setQ }: { q: string; setQ: (q: string) => void }) {
  if (q) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <span
        className="text-[10px] font-mono uppercase tracking-[0.2em] mr-1 text-[color:var(--ink-faint)]"
      >
        try
      </span>
      {EXAMPLE_QUERIES.map((ex) => (
        <Button
          bare
          key={ex.q}
          onClick={() => setQ(ex.q)}
          className="rounded-full px-3 py-1 text-sm transition hover:bg-white hover:shadow-sm bg-[var(--pl-paper-2)] border border-[color:var(--pl-hairline)] text-[color:var(--pl-ink-2)] font-[inherit]"
        >
          {ex.q}
          <span
            className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]"
          >
            {ex.hint}
          </span>
        </Button>
      ))}
    </div>
  );
}

function PhotonCard({ p }: { p: Photon }) {
  return (
    <Link
      href={`/photon/${encodeURIComponent(p.id)}`}
      className="block rounded-xl bg-white px-5 py-4 transition hover:shadow-md border border-[color:var(--pl-hairline)]"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span
            className="text-2xl md:text-[28px] truncate text-[color:var(--ink)]"
          >
            {p.surface}
          </span>
          {p.ipa && (
            <span
              className="font-mono text-xs whitespace-nowrap text-[color:var(--ink-faint)]"
            >
              {p.ipa}
            </span>
          )}
        </div>
        {p.pos && (
          <span
            className="font-mono text-[10px] italic whitespace-nowrap text-[color:var(--ink-dim)]"
          >
            {p.pos}
          </span>
        )}
      </div>
      <p
        className="mt-2 text-[15px] leading-relaxed line-clamp-2 text-[color:var(--ink-2)]"
      >
        {p.meaning_en}
      </p>
    </Link>
  );
}

function LangGroup({ lang, items }: { lang: string; items: Photon[] }) {
  return (
    <div key={lang} className="mb-8 fade-in">
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--blue)]"
        >
          {LANG_LABEL[lang] || lang}
          <span
            className="ml-2 font-mono text-[10px] text-[color:var(--ink-faint)]"
          >
            · {lang}
          </span>
        </h2>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]"
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((p) => (
          <PhotonCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function useIndexStats() {
  const [stats, setStats] = useState<{ total: number; n_langs: number }>({ total: 0, n_langs: 0 });
  useEffect(() => {
    fetch("/api/photon/search?q=___NEVER___")
      .then((r) => r.json())
      .then((j: SearchResp) => {
        if (j.stats) setStats({
          total: j.stats.total || 0,
          n_langs: Object.keys(j.stats.by_lang || {}).length,
        });
      })
      .catch(() => {});
  }, []);
  return stats;
}

function usePhotonSearch(q: string) {
  const [results, setResults] = useState<Photon[]>([]);
  const [loading, setLoading] = useState(false);
  const [took, setTook] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
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
        setTook(j.took_ms || 0);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  return { results, setResults, loading, took };
}

function useSlashFocus(inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);
}

function groupByLang(results: Photon[]): [string, Photon[]][] {
  const m = new Map<string, Photon[]>();
  for (const p of results) {
    if (!m.has(p.lang)) m.set(p.lang, []);
    m.get(p.lang)!.push(p);
  }
  return Array.from(m.entries());
}

export default function Search() {
  const [q, setQ] = useState("");
  const stats = useIndexStats();
  const { results, setResults, loading, took } = usePhotonSearch(q);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useSlashFocus(inputRef);

  const grouped = groupByLang(results);

  return (
    <div id="search" className="scroll-mt-6">
      <section className="relative max-w-2xl mx-auto px-5 md:px-8 pb-2">
        <SearchBox q={q} setQ={setQ} clear={() => { setQ(""); setResults([]); inputRef.current?.focus(); }} inputRef={inputRef} />

        <Examples q={q} setQ={setQ} />

        <p
          className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]"
        >
          {q
            ? loading
              ? "searching…"
              : results.length
                ? `${results.length} results · ${took}ms`
                : "no matches. Try another spelling or language."
            : stats.total ? `${stats.total.toLocaleString()} words · ${stats.n_langs} languages` : "209,000 words · 27 languages"}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-5 md:px-8 mt-6">
        {grouped.map(([lang, items]) => <LangGroup key={lang} lang={lang} items={items} />)}

      </section>

    </div>
  );
}
