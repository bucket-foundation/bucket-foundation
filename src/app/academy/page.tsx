import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academy · learn the nucleus",
  description:
    "Bucket Academy — learn the optimal nucleus of each field with spaced repetition over a foundations-first knowledge graph. Biophysics first; every canon branch next.",
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "Bucket Academy — learn the nucleus",
    description:
      "Spaced repetition over a foundations-first knowledge graph. Start with the biophysics nucleus.",
    url: "https://www.bucket.foundation/academy",
    type: "website",
  },
};

// The Academy is a self-contained app (source of truth: learning/app, synced into
// public/academy-app by scripts/sync-academy.mjs). We frame it so it inherits the site
// header/nav as a real tab while keeping its own local-first engine intact.
export default function AcademyPage() {
  return (
    <>
      {/* On-ramp strip: the Academy is the consume side of the depth ladder
          (L1, L2). When a learner reaches mastery, the climb continues, 
          canon (L3, L4) → research tools + agent (L4, L5). Make that visible. */}
      <div className="w-full border-b border-[color:var(--hairline)] bg-[color:var(--bone-2)]/90">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-x-5 gap-y-1 flex-wrap text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-2)]">
          <span className="text-[color:var(--gold-deep)]">§</span>
          <span>
            mastered a branch? the climb keeps going —
          </span>
          <Link
            href="/ladder"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the depth ladder →
          </Link>
          <Link
            href="/canon"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            read the canon →
          </Link>
          <Link
            href="/research/agent"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the research agent →
          </Link>
        </div>
      </div>
      <iframe
        src="/academy-app/index.html"
        title="Bucket Academy"
        loading="eager"
        style={{
          width: "100%",
          height: "calc(100dvh - 58px - 41px)",
          border: 0,
          display: "block",
        }}
      />
    </>
  );
}
