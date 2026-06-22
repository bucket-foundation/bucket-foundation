import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("geosummary");
const _jsonld = toolJsonLd("geosummary");
import GeoSummaryClient from "./GeoSummaryClient";

// GeoSummary run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("geosummary");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-geosummary"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]"
          >
            § Research · tools
          </Link>{" "}
          / {t?.name ?? "GeoSummary"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          summarize a{" "}
          <span className="inlay-gold">series.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a time series (and optionally timestamps, a seasonal period, and lat/lon). GeoSummary returns descriptives + missing-data accounting, a trend via both OLS and the distribution-free Mann-Kendall test + Theil-Sen slope (the standard climatological trend test), a per-phase seasonal climatology with the variance it explains, the lag-1 autocorrelation, and the spatial extent (bounding box, centroid, great-circle span). Real numpy/scipy — a quick, reproducible, defensible summary for non-specialists.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <GeoSummaryClient />
        </div>
      </div>
    </main>
  );
}
