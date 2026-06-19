import Link from "next/link";
import RNAFMEmbedsClient from "./RNAFMEmbedsClient";

// RNA-FM-Embeds run page — hosted RNA embedding service.
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
          / RNA-FM-Embeds
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          RNA into{" "}
          <span className="inlay-gold">ML features.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste an RNA sequence; get a numeric embedding for your downstream
          model. When the RNA-FM language-model weights are installed the service
          returns the real 640-d RNA-FM representation; otherwise it returns a
          REAL, reproducible k-mer + structural-feature embedding (the mode is
          reported honestly — never a placeholder vector).
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <RNAFMEmbedsClient />
        </div>
      </div>
    </main>
  );
}
