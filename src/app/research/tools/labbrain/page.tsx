import Link from "next/link";
import LabBrainClient from "./LabBrainClient";

// LabBrain run page — server-component shell (matches /research styling), frames
// the interactive client island. FIRST SLICE of the research-tools surface.
// See docs/research-tools/04-implementation-architecture.md §7.
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
          / LabBrain
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          ask a lab&apos;s{" "}
          <span className="inlay-gold">corpus.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Name a research PI and ask a question. LabBrain resolves them on
          OpenAlex, ingests their open-access full text, builds a hybrid
          retrieval index, and answers with citations to the exact passages.
          First run for a new author builds the corpus (this can take a minute);
          repeat runs are instant.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <LabBrainClient />
        </div>
      </div>
    </main>
  );
}
