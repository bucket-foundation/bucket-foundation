import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import ResearchAgentClient from "./ResearchAgentClient";

export const metadata: Metadata = {
  title: "Research agent · cited and reproducible briefs",
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

const CITE_CALL = `curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+atp&tier=insight"`;

const CITE_RESPONSE = `{
  "data": { "...": "insight-tier synthesis" },
  "citation": {
    "type": "source",
    "source_id": "pmid:123456",
    "canonical_url": "https://pubmed.ncbi.nlm.nih.gov/123456/"
  },
  "receipt": {
    "tier": "insight",
    "price_usd": 0.002,
    "status": "paid"
  },
  "cite": {
    "price_usd": 0.002,
    "license": "bucket.foundation/cite-forever/v0.1"
  }
}`;

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
          Ask a research question. The agent plans the inquiry, retrieves
          evidence from the Bucket canon, OpenAlex, PubMed and the
          research-atlas, routes it through real instruments, and writes a
          brief where every claim cites a retrieved source or the agent
          abstains. It lists the exact calls it made, so the brief is
          reproducible.
        </p>
        <p className="mt-4 text-[13px] leading-[1.7] text-[color:var(--basalt-3)] max-w-2xl">
          Synthesis runs on the local Bucket engine and answers only while it
          is up. The reader pays nothing.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
          <h2 className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
            One cite call
          </h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
            An agent asks for an insight and gets the envelope back. Reading
            costs the reader nothing. The receipt and cite blocks state the
            price a paid work owes when it republishes the result: $0.002 at
            the insight tier, paid to the author over x402 on Base.
          </p>
          <pre className="mt-4 overflow-x-auto text-[12px] leading-[1.6] text-[color:var(--basalt)] bg-[color:var(--bone-3,var(--bone))] border border-[color:var(--hairline)] p-4">
            <code>{CITE_CALL}</code>
          </pre>
          <pre className="mt-3 overflow-x-auto text-[12px] leading-[1.6] text-[color:var(--basalt)] bg-[color:var(--bone-3,var(--bone))] border border-[color:var(--hairline)] p-4">
            <code>{CITE_RESPONSE}</code>
          </pre>
          <p className="mt-3 text-[13px] text-[color:var(--basalt-3)]">
            Full field list:{" "}
            <Link
              href="/protocol/envelope"
              className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              the envelope spec
            </Link>
            .
          </p>
        </div>

        <div className="mt-12">
          <ResearchAgentClient />
        </div>
      </div>
    </main>
  );
}
