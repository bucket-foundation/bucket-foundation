import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("hhfit");
const _jsonld = toolJsonLd("hhfit");
import HHFitClient from "./HHFitClient";

// HH-FitML run page — fit passive-membrane / HH parameters to a current-clamp trace.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-hhfit"
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
          / HH-FitML
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          fit membrane params{" "}
          <span className="inlay-gold">to your trace.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a current-clamp voltage trace (mV samples). HH-FitML runs a real{" "}
          <strong>scipy least-squares</strong> fit of the single-compartment
          passive-membrane (RC) model and reports input resistance R,
          capacitance C, time constant τ, resting V<sub>0</sub>, and fit quality
          (R², RMSE). Try the <strong>demo</strong> trace — it has known
          ground-truth params so you can see the fit recover them.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <HHFitClient />
        </div>
      </div>
    </main>
  );
}
