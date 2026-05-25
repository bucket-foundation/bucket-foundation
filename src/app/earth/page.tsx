// /earth — the world-indicator data globe + target-ranking tool.
// Sibling to /canon. The globe paints 211 countries by any of 32 development
// indicators, or by a weighted composite "target" score; the 5 longevity
// Blue Zones overlay as biophysics ground-truth.

import Link from "next/link";
import worldData from "@/data/world-indicators.json";
import scoringData from "@/data/world-indicators-scoring.json";
import blueZonesData from "@/data/blue-zones.json";
import EarthGlobeMount from "./EarthGlobeMount";

export const metadata = {
  title: "Earth · bucket.foundation",
  description:
    "211 countries, 32 development indicators — explore one at a time or build a weighted target score. Blue Zones overlay as longevity ground-truth. build history.",
};
export const dynamic = "force-static";

export default function Page() {
  const indicatorCount = Object.keys(
    (worldData as unknown as { indicators: Record<string, string> }).indicators
  ).length;
  const countryCount = (worldData as unknown as { countries: unknown[] }).countries.length;
  const presetCount = (scoringData as unknown as { presets: unknown[] }).presets.length;
  const zoneCount = (blueZonesData as unknown as { zones: unknown[] }).zones.length;

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">§ earth</div>
          <h1 className="font-serif-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] text-[color:var(--basalt)]">
            Statistics with a target.
          </h1>
          <p className="mt-6 max-w-2xl text-[color:var(--parchment-dim)] text-pretty">
            {countryCount} countries across {indicatorCount} development
            indicators. Colour the globe by any single measure — or set a target
            (longevity, sustainability, quality of life) and let a weighted,
            direction-aware composite rank every nation 0–100. The {zoneCount}{" "}
            longevity Blue Zones overlay as ground-truth.
          </p>

          <nav className="mt-10 flex flex-wrap gap-2 small-caps text-[11px]">
            <Link
              href="/canon"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ◯  the canon globe
            </Link>
            <Link
              href="/canon/05-biophysics"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ✦  biophysics branch (longevity)
            </Link>
          </nav>

          <div className="mt-12 mb-10 w-full">
            <EarthGlobeMount />
            <div className="mt-8 text-center small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.15em]">
              hover a country · click to rank · toggle the {presetCount} presets
            </div>
          </div>

          <div className="mt-10 grid grid-cols-4 max-w-2xl gap-6">
            <Stat label="countries" value={String(countryCount)} />
            <Stat label="indicators" value={String(indicatorCount)} />
            <Stat label="presets" value={String(presetCount)} />
            <Stat label="blue zones" value={String(zoneCount)} />
          </div>

          <p className="mt-10 max-w-2xl text-[12px] text-[color:var(--parchment-dim)]">
            Outcomes — longevity, health, prosperity — are downstream
            applications, not canon. This atlas is the eyeball test:
            does the target score land where the long-lived actually live?
          </p>
        </div>
      </header>

      <footer className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="small-caps text-[11px] text-[color:var(--parchment-dim)] tracking-[0.18em]">
          build the past. build history. bucket is the new renaissance.
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif-display text-4xl text-[color:var(--gold)]">{value}</div>
      <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mt-1">{label}</div>
    </div>
  );
}
