import Link from "next/link";
import GRNAOptimizerClient from "./GRNAOptimizerClient";

// gRNA-Optimizer run page — CRISPR SpCas9 guide design over a target.
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
          / gRNA-Optimizer
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          design CRISPR guides{" "}
          <span className="inlay-gold">that work.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a target DNA region. gRNA-Optimizer scans both strands for SpCas9
          PAMs, scores each candidate guide for on-target efficiency (GC
          sweet-spot, homopolymer / Pol-III penalties, position preferences) and
          flags local off-target risk via the PAM-proximal seed. Returns a
          ranked, defensible guide table — transparent rules, not a black box.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <GRNAOptimizerClient />
        </div>
      </div>
    </main>
  );
}
