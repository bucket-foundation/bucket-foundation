import Link from "next/link";
import ProtocolGPTClient from "./ProtocolGPTClient";

// ProtocolGPT run page — freeform methods/SOP → structured, runnable protocol.
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
          / ProtocolGPT
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          methods prose into a{" "}
          <span className="inlay-gold">runnable protocol.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a methods paragraph or an SOP. ProtocolGPT parses it into ordered
          steps with timings, temperatures, volumes, and concentrations; builds a
          reagent table; and flags safety hazards — by deterministic rule
          extraction over a built-in methods knowledge base. Review before bench
          use.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <ProtocolGPTClient />
        </div>
      </div>
    </main>
  );
}
