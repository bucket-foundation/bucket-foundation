import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("cellsegtrack");
const _jsonld = toolJsonLd("cellsegtrack");
import CellSegClient from "./CellSegClient";

// CellSegTrack run page.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-cellsegtrack"
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
          / CellSegTrack
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          segment{" "}
          <span className="inlay-gold">cells.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a 2-D image (grayscale rows). CellSegTrack uses Cellpose on CPU when installed, otherwise a real classical Otsu + distance-transform seeded watershed, returning per-object area, centroid, and bounding box. The demo image has a known cell count.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <CellSegClient />
        </div>
      </div>
    </main>
  );
}
