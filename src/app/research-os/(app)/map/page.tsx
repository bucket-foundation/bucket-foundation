import type { Metadata } from "next";
import Link from "next/link";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import { getBranches } from "@/lib/canon-fs";
import type { GlobeBranch } from "@/components/CanonGlobe";
import { PageHeader } from "@/components/ui";
import GraphMap from "./GraphMap";

export const metadata: Metadata = { title: "Map", robots: { index: false, follow: false } };

const CONTAINER =
  "relative h-[calc(100vh-11rem)] min-h-[560px] md:pr-[400px] overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]";
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function MapPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const pick = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const view = pick("view") === "globe" ? "globe" : "graph";
  const branch = SLUG.test(pick("branch") ?? "") ? (pick("branch") as string) : "02-physics";
  const q = (pick("q") ?? "").slice(0, 80);

  if (view === "globe") {
    const globeBranches: GlobeBranch[] = getBranches().map((b) => ({ slug: b.slug, numeral: b.numeral, name: b.name, status: b.status, entryCount: b.entryCount }));
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow="Research OS · map"
          title="the canon on the globe"
          lede="Figures, sites, and years. Open a claim to read it, or send it to the workspace to work on it."
          actions={
            <Link href="/research-os/map" className="inline-flex items-center px-4 py-2 text-[12px] small-caps tracking-[0.14em] border border-[color:var(--hairline)] rounded-sm min-h-[44px]">
              the graph
            </Link>
          }
        />
        <CanonGlobeMount branches={globeBranches} containerClassName={CONTAINER} workspaceLinks />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Research OS · map" title="the graph" lede="Every node of a branch, laid out by tier and colored by where you stand. Ringed gold: the frontier. Boxed red: assigned to your class." />
      <GraphMap initialBranch={branch} initialQuery={q} />
    </div>
  );
}
