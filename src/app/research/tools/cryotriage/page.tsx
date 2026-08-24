import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("cryotriage");
const _jsonld = toolJsonLd("cryotriage");
import CryoTriageClient from "./CryoTriageClient";

// CryoTriage run page, server-component shell (matches /research styling).
// GPU tool, runs in DEMO/synthetic mode until a GPU compute plan lands.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-cryotriage"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link href="/research/tools" className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]">
            § Research · tools
          </Link>{" "}
          / CryoTriage
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          triage a{" "}
          <span className="inlay-gold">session.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Upload a cryo-EM micrograph, or run the built-in synthetic session.
          CryoTriage estimates the CTF (defocus, astigmatism, resolution),
          measures drift / contamination / ice, and assigns PASS / FLAG / REJECT
          with documented thresholds.
        </p>
        <p className="mt-4 text-[13px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
          demo mode — synthetic micrographs until a GPU compute plan lands
        </p>
        <div className="carved-rule max-w-xs mt-10" />
        <div className="mt-12">
          <CryoTriageClient />
        </div>
      </div>
    </main>
  );
}
