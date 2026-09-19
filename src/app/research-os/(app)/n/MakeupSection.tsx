"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Section from "./Section";
import { branchName } from "./types";
import type { Makeup } from "@/lib/research-os/makeup";

const VERDICT: Record<string, { text: string; className: string }> = {
  confirmed: { text: "second model agrees", className: "text-[color:var(--laurel-deep)]" },
  refuted: { text: "second model disagrees", className: "text-red-700" },
  unchecked: { text: "not checked yet", className: "text-[color:var(--basalt-3)]" },
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * "Made of": the node's place in the prime decomposition
 * (learning/research-os/PRIMES.md) and what the decompose-further queue
 * proposes for it, waiting on review.
 */
export default function MakeupSection({ slug, branch }: { slug: string; branch: string }) {
  const [makeup, setMakeup] = useState<Makeup | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/research-os/makeup?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (res.status === 404) return setState("missing");
      if (!res.ok) return setState("error");
      const body = (await res.json()) as { makeup: Makeup; canReview: boolean };
      setMakeup(body.makeup);
      setCanReview(body.canReview);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "missing") return null;

  const m = makeup;
  const meta =
    state !== "ready" || !m
      ? undefined
      : m.status === "prime"
        ? `prime${m.reach ? ` · in ${plural(m.reach.composites, "composite")} across ${plural(m.reach.branches, "branch", "branches")}` : ""}`
        : m.status === "composite"
          ? `tier ${m.tier} · ${plural(m.primeCount, "prime")} under it`
          : "not decomposed yet";
  const waiting = m ? m.proposals.length + m.missing.length + (m.irreducible?.status === "pending" ? 1 : 0) : 0;

  return (
    <Section id="makeup" level="understanding" title="made of" meta={meta}>
      {state === "loading" && <p className="text-[13px] text-[color:var(--basalt-3)]">Reading the decomposition…</p>}
      {state === "error" && (
        <p className="text-[13px] text-red-700">
          The makeup did not load.{" "}
          <button type="button" onClick={() => void load()} className="underline underline-offset-4">
            Try again
          </button>
        </p>
      )}
      {state === "ready" && m && (
        <div className="flex flex-col gap-5">
          <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)] max-w-[68ch]">
            {m.status === "prime" &&
              "A prime: nothing in the graph sits under it yet. Every idea that rests on it, directly or through others, carries it."}
            {m.status === "composite" && "Like a number broken into prime factors: the ideas below are what this node rests on at the bottom of the graph."}
            {m.status === "unfactored" && "No factor links this node to anything yet, so the graph cannot say what it is made of."}
            {m.inCycle && " It sits in a loop of factor links, which a reviewer should break."}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">
                {m.status === "prime" ? "primes under it" : `primes under it · ${m.primeCount}`}
              </h3>
              {m.primes.length === 0 ? (
                <p className="text-[13px] text-[color:var(--basalt-3)]">{m.status === "prime" ? "None: it is one." : "None yet."}</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {m.primes.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/research-os/n/${encodeURIComponent(p.slug)}`}
                        className="inline-flex items-baseline gap-1.5 px-2 py-1 text-[12.5px] border border-[color:var(--hairline)] bg-[color:var(--bone-2)]/60 hover:border-[color:var(--gold)]"
                        title={`${branchName(p.branch)}${p.paths > 1 ? ` · reached by ${p.paths} paths` : ""}`}
                      >
                        <span className="text-[color:var(--basalt)]">{p.title}</span>
                        {p.branch !== branch && <span className="text-[10.5px] small-caps text-[color:var(--gold-deep)]">{branchName(p.branch)}</span>}
                        {p.paths > 1 && <span className="text-[11px] text-[color:var(--basalt-3)] tabular-nums">×{p.paths}</span>}
                      </Link>
                    </li>
                  ))}
                  {m.primeCount > m.primes.length && <li className="self-center text-[12px] text-[color:var(--basalt-3)]">and {m.primeCount - m.primes.length} more</li>}
                </ul>
              )}
              {m.factors.length > 0 && !(m.factors.length === m.primes.length && m.factors.every((f) => m.primes.some((p) => p.id === f.id))) && (
                <p className="mt-3 text-[12.5px] text-[color:var(--basalt-2)]">
                  Rests on directly:{" "}
                  {m.factors.map((f, i) => (
                    <span key={f.id}>
                      {i > 0 && ", "}
                      <Link href={`/research-os/n/${encodeURIComponent(f.slug)}`} className="underline decoration-[color:var(--hairline)] underline-offset-4 hover:decoration-[color:var(--gold)]">
                        {f.title}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              )}
            </div>

            <div>
              <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">waiting on review · {waiting}</h3>
              {waiting === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">Nothing proposed for this node right now.</p>}
              {m.irreducible && (
                <p className="mb-3 text-[12.5px] text-[color:var(--basalt-2)]">
                  {m.irreducible.status === "pending" && "The proposer called this node irreducible; a reviewer has not decided. "}
                  {m.irreducible.status === "confirmed" && "Confirmed irreducible by review. "}
                  {m.irreducible.status === "rejected" && "A reviewer rejected an irreducible verdict; the next run decomposes it again. "}
                  <span className="text-[color:var(--basalt-3)]">{m.irreducible.justification}</span>
                </p>
              )}
              {m.proposals.length > 0 && (
                <ul className="flex flex-col gap-1.5 mb-3">
                  {m.proposals.map((p) => {
                    const v = VERDICT[p.verification ?? "unchecked"] ?? VERDICT.unchecked;
                    return (
                      <li key={p.id} className="text-[13px] leading-[1.45]">
                        <div>
                        <span className="text-[color:var(--basalt-3)]">rests on </span>
                        {p.factor.id ? (
                          <Link href={`/research-os/n/${encodeURIComponent(p.factor.slug)}`} className="text-[color:var(--basalt)] underline decoration-[color:var(--hairline)] underline-offset-4 hover:decoration-[color:var(--gold)]">
                            {p.factor.title}
                          </Link>
                        ) : (
                          <span className="text-[color:var(--basalt)]">{p.factor.title}</span>
                        )}
                        {p.crossBranch && p.factor.branch && <span className="ml-1.5 text-[10.5px] small-caps text-[color:var(--gold-deep)]">{branchName(p.factor.branch)}</span>}
                        </div>
                        <div className="text-[11.5px] flex flex-wrap gap-x-2">
                          <span className={v.className}>{v.text}</span>
                          {p.refd !== null && Math.abs(p.refd) > 0.02 && (
                            <span className="text-[color:var(--basalt-3)]" title="RefD over Wikipedia links">
                              · Wikipedia links {p.refd > 0 ? "support it" : "lean the other way"}
                            </span>
                          )}
                          {p.inCycle && <span className="text-red-700">· on a loop with other proposals</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {m.missing.length > 0 && (
                <div className="mb-3">
                  <p className="text-[12px] text-[color:var(--basalt-3)] mb-1">Ideas the graph lacks, named for this node:</p>
                  <ul className="flex flex-col gap-1">
                    {m.missing.map((x) => (
                      <li key={x.key} className="text-[13px] leading-[1.45]">
                        <span className="text-[color:var(--basalt)]">{x.title}</span>
                        {x.summary && <span className="text-[color:var(--basalt-3)]"> · {x.summary}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {waiting > 0 && canReview && (
                <Link
                  href={`/research-os/edges#target-${encodeURIComponent(slug)}`}
                  className="inline-block small-caps text-[10.5px] tracking-[0.16em] px-3 py-2 bg-[color:var(--gold)] text-[color:var(--basalt)] hover:bg-[color:var(--gold-bright)]"
                >
                  review these
                </Link>
              )}
              {waiting > 0 && !canReview && <p className="text-[12px] text-[color:var(--basalt-3)]">A reviewer decides each one before it joins the graph.</p>}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
