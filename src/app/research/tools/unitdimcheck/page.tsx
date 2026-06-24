import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("unitdimcheck");
const _jsonld = toolJsonLd("unitdimcheck");
import UnitDimCheckClient from "./UnitDimCheckClient";

// UnitDimCheck run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("unitdimcheck");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-unitdimcheck"
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
          / {t?.name ?? "UnitDimCheck"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          check the <span className="inlay-gold">dimensions.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Convert between units, parse a unit expression into its SI base
          dimensions, or check that an equation is dimensionally homogeneous.
          UnitDimCheck reduces any unit to exact rational exponents over the
          seven SI base dimensions (mass, length, time, current, temperature,
          amount, luminous intensity) — so it catches F = m·a (consistent) versus
          a wrong F = m·v (mass·length·time⁻¹ ≠ force) before any number is
          plugged in. The cheapest correctness check in physical science.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <UnitDimCheckClient />
        </div>
      </div>
    </main>
  );
}
