import Link from "next/link";
import type { Metadata } from "next";
import { getImpactItems, IMPACT_LINES } from "@/lib/research/impact-registry";
import ImpactBrowser from "./ImpactBrowser";

export const metadata: Metadata = {
  title: "Research · impact",
  description:
    "The Bucket research hub: free research tools, open research-economy datasets, the research-atlas graph, and primary papers with real DOIs. Free to read, paid to cite. The reader pays nothing.",
  alternates: { canonical: "/research" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research",
    title: "Research · bucket.foundation",
    description:
      "Free research tools, open research-economy datasets, the research-atlas graph, and primary papers with real DOIs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research · bucket.foundation",
    description:
      "Free research tools, open datasets, the research-atlas graph, and primary papers with real DOIs.",
  },
};

export default function Page() {
  const items = getImpactItems();
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-24">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · impact
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          free to read. paid to <span className="inlay-gold">cite.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Bucket turns primary research into three kinds of impact. Every paper, report, figure, dataset, tool and doc below belongs to one of them.
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] small-caps tracking-[0.14em]" aria-label="Impact lines">
          {IMPACT_LINES.map((l) => (
            <a key={l.id} href={`#${l.id}`} className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
              {l.title}
            </a>
          ))}
          <Link href="/research-os" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            open Research OS
          </Link>
        </nav>
        <div className="carved-rule max-w-xs mt-10" />
        <ImpactBrowser items={items} />
        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link href="/research/papers" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">all papers</Link>
          <Link href="/research/datasets" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">all datasets</Link>
          <Link href="/research/tools" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">all tools</Link>
          <Link href="/cite-forever/v0.1" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">cite-forever v0.1 license</Link>
          <Link href="/build" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">build on the protocol</Link>
        </div>
      </div>
    </main>
  );
}
