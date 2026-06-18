import Link from "next/link";
import ScreenServerClient from "./ScreenServerClient";

// ScreenServer run page — server-component shell (matches /research styling).
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link href="/research/tools" className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]">
            § Research · tools
          </Link>{" "}
          / ScreenServer
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          screen a{" "}
          <span className="inlay-gold">library.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a SMILES library (one per line, up to 200). ScreenServer runs 13
          ADMET models and writes a ranked drug-likeness report — solubility,
          permeability, hERG, CYP, and more.
        </p>
        <div className="carved-rule max-w-xs mt-10" />
        <div className="mt-12">
          <ScreenServerClient />
        </div>
      </div>
    </main>
  );
}
