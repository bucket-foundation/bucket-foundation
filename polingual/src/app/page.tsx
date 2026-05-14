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

export default function HomePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Photon[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; n_langs: number }>({ total: 0, n_langs: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/photon/search?q=___NEVER___")
      .then((r) => r.json())
      .then((j: SearchResp) => {
        if (j.stats) {
          setStats({
            total: j.stats.total || 0,
            n_langs: Object.keys(j.stats.by_lang || {}).length,
          });
        }
      })
      .catch(() => {});
  }, []);

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
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 md:px-8 py-10 md:py-16">
      <header className="w-full max-w-4xl text-center">
        <p className="font-mono text-[10px] tracking-[0.28em] uppercase" style={{ color: "var(--sepia-dim)" }}>
          polingual · v0
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl leading-[1.05]" style={{ color: "var(--sepia)" }}>
          every word in every language,<br /><em style={{ color: "var(--ink)" }}>one meaning.</em>
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-base md:text-lg" style={{ color: "var(--ink-dim)" }}>
          Cross-lingual dictionary on the photon graph. Surface forms in any
          language; definitions in English. Type a word in any script.
        </p>
      </header>

      <div className="mt-10 md:mt-14 w-full max-w-2xl">
        <div className="pill flex items-center px-4 py-3 shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sepia-dim)" }}>
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="gravity · 重力 · gravitas · Schwerkraft"
            className="flex-1 bg-transparent px-3 outline-none text-lg md:text-xl"
            style={{ fontFamily: "inherit" }}
          />
          {q && (
            <button onClick={() => setQ("")} className="text-2xl leading-none" aria-label="clear"
                    style={{ color: "var(--sepia-dim)" }}>×</button>
          )}
        </div>
        {stats.total > 0 && (
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.18em]"
             style={{ color: "var(--sepia-dim)" }}>
            {stats.total.toLocaleString()} photons · {stats.n_langs} languages
          </p>
        )}
      </div>

      <section className="mt-8 w-full max-w-3xl">
        {loading && results.length === 0 && (
          <p className="text-center text-sm" style={{ color: "var(--ink-dim)" }}>searching…</p>
        )}
        {!loading && q && results.length === 0 && (
          <p className="text-center text-sm" style={{ color: "var(--ink-dim)" }}>
            no matches yet. Try a more common word, or one in another language.
          </p>
        )}
        <div className="space-y-3">
          {results.map((p) => (
            <Link key={p.id} href={`/word/${encodeURIComponent(p.id)}`}
                  className="block rounded-md border bg-white px-5 py-4 hover:border-[color:var(--ink)] transition"
                  style={{ borderColor: "var(--hairline)" }}>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-xl" style={{ color: "var(--ink)" }}>{p.surface}</div>
                  {p.ipa && (
                    <div className="font-mono text-xs mt-1" style={{ color: "var(--sepia-dim)" }}>{p.ipa}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
                        style={{ background: "var(--parchment-2)", color: "var(--sepia)" }}>{p.lang}</span>
                  {p.pos && (
                    <span className="ml-2 font-mono text-[10px] italic" style={{ color: "var(--ink-dim)" }}>{p.pos}</span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                {p.meaning_en.slice(0, 240)}{p.meaning_en.length > 240 && "…"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-auto pt-16 pb-8 text-center font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "var(--sepia-dim)" }}>
        photon substrate at{" "}
        <a href="https://www.bucket.foundation" className="underline" style={{ color: "var(--burgundy)" }}>
          bucket.foundation
        </a>{" · "}every word, one meaning
      </footer>
    </main>
  );
}
