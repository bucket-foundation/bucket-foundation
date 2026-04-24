import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getAllEvents, getAllHandles, computeStats } from "./lib";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contributors",
  description:
    "Everyone who has landed canon, landscape, or figure contributions in the bucket-foundation repo.",
  alternates: { canonical: "/contributors" },
  openGraph: {
    type: "website",
    title: "Contributors · bucket.foundation",
    url: "https://www.bucket.foundation/contributors",
  },
};

export default function Page() {
  const events = getAllEvents();
  const handles = getAllHandles();
  const rows = handles
    .map((h) => computeStats(h, events))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => b.eventCount - a.eventCount);

  return (
    <PageShell
      eyebrow="§ contributors"
      title="Contributors"
      subtitle="Everyone who has landed a commit on the canon. Attribution is public, permanent, and on-chain where applicable."
    >
      {rows.length === 0 ? (
        <div className="py-16 text-center border hairline">
          <div className="font-mono-mark text-2xl text-[color:var(--gold-dim)] mb-4">
            ∅
          </div>
          <p className="text-[color:var(--parchment-dim)]">
            No contributors yet. Be the first:{" "}
            <a
              href="https://github.com/bucket-foundation/bucket-foundation/blob/main/CONTRIBUTING.md"
              className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]"
            >
              CONTRIBUTING.md
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--hairline)]">
          {rows.map((r) => (
            <Link
              key={r.handle}
              href={`/contributors/${r.handle}`}
              className="group bg-[color:var(--bone-2)] p-6 hover:bg-[color:var(--bone-3)] transition block"
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-serif-display text-lg text-[color:var(--parchment)] group-hover:text-[color:var(--gold)]">
                  @{r.handle}
                </div>
                <div className="small-caps text-[10px] text-[color:var(--gold-dim)]">
                  {r.eventCount} event{r.eventCount === 1 ? "" : "s"}
                </div>
              </div>
              {r.name && (
                <div className="text-sm text-[color:var(--parchment-dim)] mb-2">
                  {r.name}
                </div>
              )}
              <div className="small-caps text-[10px] text-[color:var(--parchment-dim)]">
                {r.branches.length} branch{r.branches.length === 1 ? "" : "es"}
                {" · "}
                {r.figures} figure{r.figures === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
