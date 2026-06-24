import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("stoichbalance");
const _jsonld = toolJsonLd("stoichbalance");
import StoichBalanceClient from "./StoichBalanceClient";

// StoichBalance run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("stoichbalance");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-stoichbalance"
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
          / {t?.name ?? "StoichBalance"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          balance an <span className="inlay-gold">equation.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Type a chemical equation. StoichBalance solves the balance as a
          null-space problem on the element matrix — exact rational Gaussian
          elimination, scaled to the smallest whole-number coefficients, then
          re-verified element by element (H2 + O2 → H2O comes back as 2, 1, 2).
          Supply reactant amounts (moles or grams) and it computes the limiting
          reagent, the extent of reaction, and theoretical product yields. Real
          linear algebra, no lookup tables, no GPU.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <StoichBalanceClient />
        </div>
      </div>
    </main>
  );
}
