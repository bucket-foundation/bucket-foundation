"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function KruseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("/kruse error:", error);
  }, [error]);

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-2xl mx-auto px-6 py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Kruse Index · temporary error
        </div>
        <h1 className="font-display uppercase text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1] text-[color:var(--basalt)]">
          the index is temporarily unreachable.
        </h1>
        <p className="mt-5 text-[15px] leading-[1.75] text-[color:var(--basalt-2)]">
          The upstream corpus server didn&rsquo;t answer. The preview is
          private and served from a single-origin backend; if this persists,
          ping the founder.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] px-5 py-3 rounded-sm hover:border-[color:var(--gold)] transition"
          >
            try again
          </button>
          <Link
            href="/"
            className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--basalt)] px-5 py-3 rounded-sm hover:bg-[color:var(--aegean-deep)] transition"
          >
            back to canon
          </Link>
        </div>
      </div>
    </main>
  );
}
