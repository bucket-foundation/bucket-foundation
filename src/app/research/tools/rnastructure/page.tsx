import Link from "next/link";
import RNAStructureClient from "./RNAStructureClient";

// RNAStructure run page — RNA secondary-structure prediction via ViennaRNA.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]"
          >
            § Research · tools
          </Link>{" "}
          / RNAStructure
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          fold an RNA into{" "}
          <span className="inlay-gold">real structure.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste an RNA (or DNA — it folds as RNA) sequence. RNAStructure runs the{" "}
          <strong>ViennaRNA</strong> minimum-free-energy fold: the dot-bracket
          structure, MFE in kcal/mol, partition-function base-pair
          probabilities, per-base pairing confidence, and a readable helix/loop
          summary. Real thermodynamics, not a guess.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <RNAStructureClient />
        </div>
      </div>
    </main>
  );
}
