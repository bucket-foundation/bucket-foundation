"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExcerptItem } from "./qualify-v2";

type Tier = "foundation" | "all";

const dim = { color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" } as const;
const serif = { fontFamily: "var(--font-fraunces)" } as const;

export function ExcerptListV2({
  items,
  showConcept,
  clip,
  foundationCount,
  allCount,
}: {
  items: ExcerptItem[];
  showConcept: boolean;
  clip?: number;
  foundationCount: number;
  allCount: number;
}) {
  const [tier, setTier] = useState<Tier>("foundation");
  const foundation = items.filter((i) => i.qualified);
  const shown = tier === "foundation" ? foundation : items;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div role="radiogroup" aria-label="Excerpt tier" className="inline-flex overflow-hidden rounded-md border border-[color:var(--hairline)]">
          {(
            [
              ["foundation", `Foundation tier ${foundationCount}`],
              ["all", `All excerpts ${allCount}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tier === value}
              onClick={() => setTier(value)}
              className="px-4 py-2 text-xs uppercase tracking-[0.16em] transition"
              style={{
                ...dim,
                color: tier === value ? "var(--gold)" : "var(--parchment-dim)",
                background: tier === value ? "var(--hairline)" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm" style={{ ...dim, fontFamily: "var(--font-fraunces)" }}>
          {tier === "foundation"
            ? "Score 8 or higher with three assertion signals."
            : "Includes unqualified fragments, marked outside the canon."}
        </p>
      </div>

      {shown.length === 0 ? (
        <p style={{ ...dim, fontFamily: "var(--font-fraunces)" }}>
          No foundation-tier excerpts here yet. Switch to all excerpts to read the raw fragments.
        </p>
      ) : (
        <ul className="space-y-6">
          {shown.map((c) => {
            const text = clip && c.excerpt.length > clip ? `${c.excerpt.slice(0, clip)}…` : c.excerpt;
            return (
              <li
                key={`${c.concept}/${c.slug}`}
                className="border-l-2 border-[color:var(--hairline)] pl-4 transition hover:border-[color:var(--gold)]"
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-3 text-xs uppercase tracking-[0.18em]" style={dim}>
                  {showConcept && <span>{c.concept.replace(/-/g, " ")}</span>}
                  {showConcept && <span>·</span>}
                  <span>score {c.score}</span>
                  <span>·</span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:text-[color:var(--gold)] hover:underline"
                  >
                    {c.timestamp} ↗
                  </a>
                  {!c.qualified && (
                    <>
                      <span>·</span>
                      <span style={{ color: "var(--ochre)" }}>outside the canon</span>
                    </>
                  )}
                </div>
                <Link href={`/excerpts/${c.concept}/${c.slug}`} className="block text-base md:text-lg" style={serif}>
                  {text}
                </Link>
                <div className="mt-1 text-sm" style={{ ...dim, fontFamily: "var(--font-fraunces)" }}>
                  From {c.videoTitle}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
