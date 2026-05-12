// /canon/timeline — the globe through time. Scrub a year slider; the
// globe shows canon events (births, foundational works, discoveries)
// that have happened by that year. Evolution of knowledge, made visible.

import Link from "next/link";
import CanonTimelineMount from "./CanonTimelineMount";

export const metadata = { title: "Canon timeline · bucket.foundation" };
export const dynamic = "force-static";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-6">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-4">
            <Link href="/canon" className="hover:text-[color:var(--basalt)]">
              ← canon
            </Link>
            <span className="mx-2 text-[color:var(--parchment-dim)]">·</span>
            timeline
          </div>
          <h1 className="font-serif-display text-[clamp(2rem,4.5vw,3.8rem)] leading-[1.05] text-[color:var(--basalt)]">
            The globe through time.
          </h1>
          <p className="mt-4 max-w-2xl text-[color:var(--parchment-dim)] text-pretty">
            50 foundational moments in the history of knowledge,
            geolocated. Pull the time bar; watch the canon emerge from
            Pythagoras to Pollack. Each marker is a real event with a
            year, place, branch, and canon link.
          </p>
        </div>
      </header>

      <CanonTimelineMount />

      <section className="max-w-4xl mx-auto px-4 md:px-6 py-12 border-t hairline">
        <h2 className="small-caps text-[11px] text-[color:var(--gold)] tracking-[0.2em] mb-4">
          How this works
        </h2>
        <div className="text-sm text-[color:var(--basalt-2)] space-y-3 max-w-2xl">
          <p>
            The seed dataset is 50 hand-curated canon events spanning
            ~570 BCE → 2020 CE. Each event has a lat/long, branch
            assignment, and rough year. The slider filters which events
            the globe shows.
          </p>
          <p>
            Future work: auto-populate timeline events from OpenAlex
            author profiles + claim-card cross-references, so every new
            claim added to canon automatically appears on the globe at
            its source year. Trajectory: 50 events → 5,000.
          </p>
          <p>
            Bridges-through-time view (planned): when a multi-branch
            primitive is first detected in the corpus, place its
            cluster centroid on the globe at the year of its earliest
            constituent claim. Cross-branch isomorphisms emerge
            visually as the timeline advances.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 small-caps text-[11px]">
          <Link
            href="/canon"
            className="border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2"
          >
            ⌐ back to canon
          </Link>
          <Link
            href="/canon/graph"
            className="border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2"
          >
            ⌬ knowledge graph
          </Link>
          <Link
            href="/canon/bridges"
            className="border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2"
          >
            ⤺⤻ bridges
          </Link>
        </div>
      </section>
    </main>
  );
}
