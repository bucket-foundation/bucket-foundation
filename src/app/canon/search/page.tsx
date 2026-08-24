// /canon/search, uses the same integrated canon-tool component as the
// main /canon page. One tool, both surfaces share it. Search box + globe
// + sidebar + time scrubber + filter chips, all wired.

import CanonGlobeMount from "../CanonGlobeMount";
import { getBranches } from "@/lib/canon-fs";
import type { GlobeBranch } from "@/components/CanonGlobe";

export const metadata = {
  title: "Search canon · bucket.foundation",
  description: "Search 599 curated canon claim cards across 9 branches. Filter by branch. Click a marker or result to inspect.",
};
export const dynamic = "force-static";

export default function Page() {
  const branches = getBranches();
  const globeBranches: GlobeBranch[] = branches.map((b) => ({
    slug: b.slug,
    numeral: b.numeral,
    name: b.name,
    status: b.status,
    entryCount: b.entryCount,
  }));

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-14 pb-4">
          <p
            className="mb-3 text-xs uppercase tracking-[0.22em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Canon · search
          </p>
          <h1
            className="font-serif-display text-[clamp(1.7rem,3.6vw,2.8rem)] leading-[1.05] text-[color:var(--basalt)]"
          >
            Search the canon.
          </h1>
          <p
            className="mt-2 max-w-2xl text-sm md:text-base"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
          >
            Type a question, filter by branch, click a marker or result.
            The sidebar shows the full claim card with branch · year ·
            excerpt · link to the full record.
          </p>
        </div>
      </header>

      <CanonGlobeMount branches={globeBranches} />
    </main>
  );
}
