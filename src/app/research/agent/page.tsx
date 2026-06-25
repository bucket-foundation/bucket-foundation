import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import ResearchAgentClient from "./ResearchAgentClient";

// /research/agent — the Bucket research agent (produce-side wedge). Given a
// research question it runs a grounded PLAN → RETRIEVE → SYNTHESIZE → OUTPUT
// loop over public assets (the Bucket canon, OpenAlex, PubMed, research-atlas,
// and the live MethodsMatcher tool) and returns a CITED, REPRODUCIBLE brief.
// Synthesis runs on the local GPU LLM (founder-GPU) — graceful offline notice.

export const metadata: Metadata = {
  title: "Research agent · plan, retrieve, synthesize — cited & reproducible",
  description:
    "Ask a research question; the Bucket research agent decomposes it, retrieves grounding from the canon, OpenAlex, PubMed, and the research-atlas, routes it through real instruments, and writes a brief where every claim cites a retrieved source — or abstains. Reproducible: it shows the exact calls it made.",
  alternates: { canonical: "/research/agent" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/agent",
    title: "Research agent · cited, reproducible briefs · bucket.foundation",
    description:
      "Plan → retrieve → synthesize → cite. Grounded strictly over retrieved evidence (canon, OpenAlex, PubMed, research-atlas, live tools); abstains when grounding is thin; shows every call it made.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research agent · bucket.foundation",
    description:
      "A grounded research agent: cited findings or an honest abstention, plus the exact API/tool calls so it's reproducible.",
  },
};

const AGENT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://www.bucket.foundation/research/agent#app",
  name: "Bucket research agent",
  applicationCategory: "Research",
  operatingSystem: "Web",
  url: "https://www.bucket.foundation/research/agent",
  description:
    "A grounded research agent that plans, retrieves from public sources (Bucket canon, OpenAlex, PubMed, research-atlas, live research tools), and synthesizes a cited, reproducible brief — or abstains when grounding is insufficient.",
  isAccessibleForFree: true,
};

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-research-agent"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(AGENT_JSON_LD) }}
      />
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link href="/research" className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]">
            § Research
          </Link>{" "}
          / agent
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          do research{" "}
          <span className="inlay-gold">at the frontier.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Not a chatbot. Ask a real research question and the agent runs a
          grounded loop — it plans the inquiry, retrieves evidence from the
          Bucket canon, the live OpenAlex and PubMed literature, the
          research-atlas, and routes it through real instruments — then writes a
          brief where <span className="text-[color:var(--basalt)]">every claim cites a
          retrieved source, or it abstains</span>. No fabricated findings, no
          invented citations. It shows you the exact calls it made, so the brief
          is reproducible.
        </p>
        <p className="mt-4 text-[13px] leading-[1.7] text-[color:var(--basalt-3)] max-w-2xl">
          Synthesis runs on the founder&rsquo;s GPU — when that machine is
          closed the agent is offline (the always-on tools keep working). The
          reader pays nothing.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <ResearchAgentClient />
        </div>
      </div>
    </main>
  );
}
