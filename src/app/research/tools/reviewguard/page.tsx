import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("reviewguard");
const _jsonld = toolJsonLd("reviewguard");
import ReviewGuardClient from "./ReviewGuardClient";

// ReviewGuard run page — cross-paper supporting vs contradicting evidence.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-reviewguard"
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
          / ReviewGuard
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          what does the literature{" "}
          <span className="inlay-gold">actually say?</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          State a claim. ReviewGuard pulls the relevant OpenAlex literature and
          sorts each paper into supporting, contradicting, or neutral — quoting
          the exact sentence that drove the call — so you see the consensus, the
          dissent, and where to read next. Triage, then verify.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <ReviewGuardClient />
        </div>
      </div>
    </main>
  );
}
