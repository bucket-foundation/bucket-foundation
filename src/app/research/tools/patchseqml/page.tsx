import Link from "next/link";
import PatchSeqMLClient from "./PatchSeqMLClient";

// PatchSeqML run page — server-component shell (matches /research styling).
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link href="/research/tools" className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]">
            § Research · tools
          </Link>{" "}
          / PatchSeqML
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          read a{" "}
          <span className="inlay-gold">recording.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Upload a current-clamp recording (Axon .abf or NWB), or run the built-in
          Hodgkin-Huxley simulation. PatchSeqML detects spikes, extracts the full
          eFEL / Allen intrinsic-feature set, builds the F-I curve, runs QC, and
          classifies the firing type — every feature cross-validated against eFEL.
        </p>
        <div className="carved-rule max-w-xs mt-10" />
        <div className="mt-12">
          <PatchSeqMLClient />
        </div>
      </div>
    </main>
  );
}
