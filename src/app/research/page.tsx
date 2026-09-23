import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research · tools, datasets, atlas, papers",
  description:
    "The bucket.foundation research hub: twenty free research instruments, the open research-economy datasets, the research-atlas graph, and primary papers born with a real DOI. Free to read, paid to cite — the reader pays nothing.",
  alternates: { canonical: "/research" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research",
    title: "Research · bucket.foundation",
    description:
      "Twenty free research tools, open research-economy datasets, the research-atlas graph, and primary papers with real DOIs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research · bucket.foundation",
    description:
      "Twenty free research tools, open datasets, the research-atlas graph, and primary papers with real DOIs.",
  },
};

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · primary research
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          free to read. paid to{" "}
          <span className="inlay-gold">cite.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Every paper on bucket.foundation is free to read and priced once to
          cite. Each downstream citation pays the author over the x402 rail on
          Base.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <HubCard
            href="/research/agent"
            title="Agent"
            body="Ask a research question; the agent plans, retrieves from the canon + live OpenAlex/PubMed + the atlas, routes it through real instruments, and writes a brief where every claim cites a source — or abstains. Reproducible."
          />
          <HubCard
            href="/research/tools"
            title="Tools"
            body="Forty research instruments — protein stability, ADMET, ephys, RNA folding, literature/agent tools over live OpenAlex — run on your input and publish to canon."
          />
          <HubCard
            href="/research/datasets"
            title="Datasets"
            body="The research-atlas tables as open datasets: funders, grants, organizations, people, fields. Free to read, born with a real DOI."
          />
          <HubCard
            href="/research/atlas"
            title="Atlas"
            body="The reconciled research-economy graph — 73 funders, ~958k grants, ~$658B, ~8.1M rows. The source behind every dataset and paper."
          />
          <HubCard
            href="/research/papers"
            title="Papers"
            body="Four metascience papers on the research-atlas graph — funding structure, paper-ranking, funder specialization, funding & careers. Free to read, each born with a real DOI."
          />
          <HubCard
            href="/research/education"
            title="Education"
            body="The education-atlas corpus — Bucket's founding education-reform research, led by The Knowledge-Access Gradient. Three crises, a 270× access cliff, the consume-vs-produce gap. Free to read."
          />
          <HubCard
            href="/research-os"
            title="Research OS"
            body="A K-12 research workspace over the same graph. The AI finds, quotes, checks, and organizes; the learner writes. Five states per concept, a teacher view, and student productions that enter the graph as citable nodes."
          />
        </div>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/cite-forever/v0.1"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            cite-forever v0.1 license
          </Link>
          <Link
            href="/protocol/envelope"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            envelope spec
          </Link>
          <Link
            href="/build"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            build on the protocol
          </Link>
        </div>
      </div>
    </main>
  );
}

function HubCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[170px] h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
        <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
          {title}
        </div>
        <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
        <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          {body}
        </p>
        <div className="mt-auto pt-3 text-[11px] small-caps tracking-[0.14em]">
          <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            open {title.toLowerCase()} →
          </span>
        </div>
      </div>
    </Link>
  );
}
