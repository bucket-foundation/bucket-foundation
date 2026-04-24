"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ResearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest to the browser console for easy Vercel log correlation.
    // eslint-disable-next-line no-console
    console.error("/research error:", error);
  }, [error]);

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Publish · temporary error
        </div>
        <h1 className="font-display uppercase text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1] text-[color:var(--basalt)]">
          the publish flow hit a snag.
        </h1>
        <p className="mt-5 text-[15px] leading-[1.75] text-[color:var(--basalt-2)]">
          The canon is fine. The publish form is not. This usually means a
          web3 provider failed to load in your browser. Try reloading, or
          reach out to the founder.
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
        {error.digest && (
          <p className="mt-8 font-mono-mark text-[11px] text-[color:var(--basalt-3)]">
            digest: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
