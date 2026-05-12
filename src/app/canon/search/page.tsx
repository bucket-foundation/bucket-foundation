// /canon/search — semantic + lexical search over the 599 curated canon
// claim cards. Type a question, get ranked claims with evidence counts.
//
// This is the **human-facing search UI**. AI agents use /api/canon/search
// directly. Both consume the same underlying index.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Result = {
  claim_id: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  score: number;
  url: string;
  excerpt: string;
  evidence_count: number;
};

type SearchResp = {
  query: string;
  top_k: number;
  mode: string;
  n_results: number;
  results: Result[];
  took_ms: number;
};

const EXAMPLES = [
  "what is the second law of thermodynamics doing in biology",
  "Penrose on consciousness and mathematics",
  "the relationship between water and electricity in cells",
  "Younger Dryas impact evidence",
  "free will and determinism in the brain",
];

export default function Page() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"all" | "nucleus" | "functional" | "edge">("all");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function runSearch(query: string) {
    if (!query.trim()) {
      setResp(null);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/canon/search", window.location.origin);
      url.searchParams.set("q", query);
      url.searchParams.set("top_k", "15");
      if (tier !== "all") url.searchParams.set("tier", tier);
      if (branch) url.searchParams.set("branch", branch);
      const r = await fetch(url.toString(), { signal: ac.signal });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const j = (await r.json()) as SearchResp;
      setResp(j);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "AbortError") setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  // Debounce input
  useEffect(() => {
    const id = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tier, branch]);

  const branches = useMemo(
    () => [
      "", "01-mathematics", "02-physics", "03-chemistry", "04-information",
      "05-biophysics", "06-cosmology", "07-mind", "08-deep-history", "09-sacred-texts",
    ],
    [],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 pb-32 pt-12 md:px-8 md:pt-20">
      <header className="mb-8">
        <p
          className="mb-3 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Canon · semantic search
        </p>
        <h1
          className="text-[2.2rem] leading-[1.05] md:text-[3rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          Ask the canon
        </h1>
        <p
          className="mt-3 max-w-2xl text-base"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          599 curated claim cards across 9 canon branches. Lexical search
          today; semantic search via canon-tuned embedding model wires in
          next. Agents can hit{" "}
          <a href="/api/canon/search?q=consciousness&top_k=5"
             className="underline hover:text-[color:var(--gold)]"
             target="_blank" rel="noreferrer">
            /api/canon/search
          </a>{" "}
          directly.
        </p>
      </header>

      <section className="mb-6 space-y-3">
        <input
          type="text"
          autoFocus
          placeholder="What does the canon say about ..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-[color:var(--hairline)] bg-transparent px-4 py-3 text-lg outline-none focus:border-[color:var(--gold)]"
          style={{ fontFamily: "var(--font-fraunces)" }}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => setQ(e)}
              className="rounded-full border border-[color:var(--hairline)] px-3 py-1 text-xs hover:border-[color:var(--gold)]"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em]"
             style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          <span>filter:</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as typeof tier)}
            className="rounded-md border border-[color:var(--hairline)] bg-transparent px-2 py-1"
          >
            <option value="all">all tiers</option>
            <option value="nucleus">nucleus</option>
            <option value="functional">functional</option>
            <option value="edge">edge</option>
          </select>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded-md border border-[color:var(--hairline)] bg-transparent px-2 py-1"
          >
            {branches.map((b) => (
              <option key={b || "all"} value={b}>{b || "all branches"}</option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <p className="text-sm" style={{ color: "var(--parchment-dim)" }}>
          searching…
        </p>
      )}
      {err && (
        <p className="text-sm text-red-400">error: {err}</p>
      )}

      {resp && (
        <section className="space-y-4">
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            {resp.n_results} results · {resp.mode} · {resp.took_ms}ms
          </p>
          {resp.results.map((r, i) => (
            <Link
              key={`${r.concept}/${r.slug}`}
              href={`/canon/claims/${r.concept}/${r.slug}`}
              className="block rounded-md border border-[color:var(--hairline)] p-4 transition hover:border-[color:var(--gold)]"
            >
              <div
                className="mb-1 flex items-baseline justify-between gap-3 text-xs uppercase tracking-[0.14em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                <span>
                  {String(i + 1).padStart(2, "0")} · {r.branch} / {r.concept}
                </span>
                <span>
                  score {r.score.toFixed(2)}{r.evidence_count > 0 && ` · ${r.evidence_count} evidence`}
                </span>
              </div>
              <p className="text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
                {r.title}
              </p>
              <p
                className="mt-2 line-clamp-3 text-sm"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
              >
                {r.excerpt.slice(0, 280)}
              </p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
