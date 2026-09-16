import type { Metadata } from "next";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import { getBranches } from "@/lib/canon-fs";
import type { GlobeBranch } from "@/components/CanonGlobe";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Map", robots: { index: false, follow: false } };

// The Awareness level as a surface: the canon on the globe, inside the
// application frame. Same component as the public /canon/search; here a
// result also opens in the workspace, so the map is where a person picks
// what to work on next. Deep links: ?q=<query>, ?marker=<id>.
const CONTAINER =
  "relative h-[calc(100vh-11rem)] min-h-[560px] md:pr-[400px] overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]";

export default function MapPage() {
  const globeBranches: GlobeBranch[] = getBranches().map((b) => ({
    slug: b.slug,
    numeral: b.numeral,
    name: b.name,
    status: b.status,
    entryCount: b.entryCount,
  }));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Research OS · map"
        title="the canon on the globe"
        lede="Search the claims, filter by branch, scrub the years. Open a claim to read it, or send it to the workspace to work on it."
      />
      <CanonGlobeMount branches={globeBranches} containerClassName={CONTAINER} workspaceLinks />
    </div>
  );
}
