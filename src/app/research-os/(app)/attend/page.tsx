import type { Metadata } from "next";
import Link from "next/link";
import { answerAttend, parseAttendParams, RANK_MODES, type AttendResponse, type RankMode } from "@/lib/research-os/attention";
import { loadNodeVectors } from "@/lib/research-os/attention-db";
import { configured, graphService } from "@/lib/research-os/db";
import { makeupSnapshot } from "@/lib/research-os/makeup";
import ConceptPicker from "./ConceptPicker";

export const metadata: Metadata = { title: "Attention", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const H1 = "font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]";

type Search = { ids?: string; q?: string; cone?: string; k?: string; rank?: string };

const RANK_TEXT: Record<RankMode, string> = {
  fused: "Text neighbours and shared primes, fused by rank.",
  attention: "Shared primes alone.",
  vector: "Text neighbours alone.",
};

function href(ids: string[], q: string, cone: string, rank: RankMode | null = null): string {
  const sp = new URLSearchParams();
  if (ids.length) sp.set("ids", ids.join(","));
  if (q) sp.set("q", q);
  if (cone === "show") sp.set("cone", "show");
  if (rank) sp.set("rank", rank);
  const s = sp.toString();
  return `/research-os/attend${s ? `?${s}` : ""}`;
}

function Results({ r, cone, ids, q }: { r: AttendResponse; cone: string; ids: string[]; q: string }) {
  return (
    <section className="mt-8">
      <h2 className={LABEL}>ranked</h2>
      <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">
        {RANK_TEXT[r.rank]}{" "}
        {RANK_MODES.filter((m) => m !== r.rank).map((m) => (
          <span key={m}>
            <Link href={href(ids, q, cone, m)} className="underline underline-offset-4">
              {m === "attention" ? "Primes only" : m === "vector" ? "Text only" : "Fused"}
            </Link>{" "}
          </span>
        ))}
        · Each idea shows its prime cosine, from 0 to 1, split into the primes it shares with the query; the parts add up to the cosine. Text is the bge-small cosine to the query&apos;s nodes.
        {r.vectorsUnavailable && " Text neighbours were unavailable this minute."}
        {r.staleVectors > 0 && ` ${r.staleVectors} ideas changed since their text vectors were computed and rank by primes alone until they are refreshed.`}{" "}
        {cone === "show" ? (
          <>
            The query&apos;s own factors and dependents are included.{" "}
            <Link href={href(ids, q, "hide", r.rank)} className="underline underline-offset-4">
              Hide them
            </Link>
            .
          </>
        ) : (
          <>
            {r.masked} ideas in the query&apos;s own factors and dependents are hidden.{" "}
            <Link href={href(ids, q, "show", r.rank)} className="underline underline-offset-4">
              Show them
            </Link>
            .
          </>
        )}
      </p>
      {r.hits.length === 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">Nothing ranked for this query.</p>
      ) : (
        <ol className="mt-2 border-t border-[color:var(--hairline)]">
          {r.hits.map((h) => (
            <li key={h.id} className="border-b border-[color:var(--hairline)] py-2 text-[13px] text-[color:var(--basalt)]">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={`/research-os/n/${encodeURIComponent(h.slug)}`} className="hover:underline underline-offset-4">
                  {h.title}
                </Link>
                <span className="text-[11px] text-[color:var(--basalt-3)]">{h.branch}</span>
                <span className="text-[11px] tabular-nums text-[color:var(--basalt-3)]">
                  primes {h.attention === null ? "none shared" : h.attention.toFixed(2)} · text {h.embedding === null ? "n/a" : h.embedding.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {h.terms.map((t) => (
                  <span key={t.id} className="border border-[color:var(--hairline)] px-1.5 py-0.5 text-[11.5px] text-[color:var(--basalt-2)]" title={`${t.term.toFixed(3)} of ${(h.attention ?? 0).toFixed(3)}`}>
                    {t.title} <span className="tabular-nums text-[color:var(--basalt-3)]">{t.term.toFixed(2)}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function AttendPage({ searchParams }: { searchParams: Search }) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string") sp.set(k, v);
  const asked = Boolean(searchParams.ids || searchParams.q);
  const parsed = asked ? parseAttendParams(sp) : null;
  const ids = parsed && !("error" in parsed) ? parsed.ids : [];
  const q = parsed && !("error" in parsed) ? parsed.q : (searchParams.q ?? "");
  const cone = parsed && !("error" in parsed) ? parsed.cone : "hide";
  const rank = parsed && !("error" in parsed) ? parsed.rank : null;
  let out: Awaited<ReturnType<typeof answerAttend>> | null = null;
  if (configured() && parsed && !("error" in parsed)) {
    const svc = graphService();
    out = await answerAttend(parsed, null, {
      snapshot: () => makeupSnapshot(svc),
      vectors: (snap) => loadNodeVectors(svc, snap),
      privateFactors: async (slugs) => ({ factors: [], denied: slugs.length, missing: 0 }),
    });
  }
  const known = new Map((out && !("error" in out) ? out.query : []).map((n) => [n.slug, n.title]));
  const titleOf = (slug: string) => known.get(slug) ?? slug;

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[900px]">
      <h1 className={H1}>Attention</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        Pick concepts or type a phrase, and the graph is ranked by the primes it shares with them. Rare primes count for more. A phrase enters through the ideas whose words it shares.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ConceptPicker ids={ids} q={q} cone={cone} />
        <form action="/research-os/attend" method="get">
          {ids.length > 0 && <input type="hidden" name="ids" value={ids.join(",")} />}
          {cone === "show" && <input type="hidden" name="cone" value="show" />}
          {rank && <input type="hidden" name="rank" value={rank} />}
          <label className="block text-[12px] text-[color:var(--basalt-3)]">
            Or a phrase
            <input
              name="q"
              defaultValue={q}
              maxLength={200}
              className="mt-1 block w-full border border-[color:var(--hairline)] bg-transparent px-2 py-1.5 text-[14px] text-[color:var(--basalt)]"
            />
          </label>
        </form>
      </div>
      {ids.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {ids.map((s) => (
            <li key={s} className="border border-[color:var(--hairline)] px-2 py-0.5 text-[12px]">
              {titleOf(s)}{" "}
              <Link href={href(ids.filter((x) => x !== s), q, cone, rank)} aria-label={`Remove ${titleOf(s)}`} className="text-[color:var(--basalt-3)]">
                ×
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!configured() ? (
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">This deployment has no graph connected.</p>
      ) : parsed && "error" in parsed ? (
        <p role="alert" className="mt-6 text-[13px] text-[color:var(--gold-deep)]">{parsed.error}.</p>
      ) : out && "error" in out ? (
        <p role="alert" className="mt-6 text-[13px] text-[color:var(--gold-deep)]">
          {out.status === 404 ? "Nothing in the graph matched this query." : "The graph did not answer this minute."}
        </p>
      ) : out ? (
        <>
          {out.entries.length > 0 && (
            <p className="mt-4 text-[12px] text-[color:var(--basalt-3)]">
              The phrase entered through {out.entries.map((e) => `${e.title} (${e.score.toFixed(2)})`).join(", ")}.
            </p>
          )}
          <Results r={out} cone={cone} ids={ids} q={q} />
        </>
      ) : null}
    </div>
  );
}
