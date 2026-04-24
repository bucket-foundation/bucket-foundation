import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import CodeBlock from "@/components/CodeBlock";

const URL = "https://www.bucket.foundation/cite-forever/v0.1";

export const metadata: Metadata = {
  title: "cite-forever · v0.1",
  description:
    "Free to read. Paid to cite. The bucket.foundation license that routes citation fees to authors, over x402 on Base, forever.",
  alternates: { canonical: "/cite-forever/v0.1" },
  openGraph: {
    type: "article",
    url: URL,
    title: "cite-forever · v0.1 — bucket.foundation",
    description:
      "Free to read. Paid to cite. Citation fees route to authors, not publishers, over the x402 rail on Base, forever.",
  },
  twitter: {
    card: "summary_large_image",
    title: "cite-forever · v0.1",
    description: "Free to read. Paid to cite.",
  },
  other: {
    "license:name": "bucket.foundation cite-forever v0.1",
    "license:canonical": URL,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "@id": URL,
  name: "bucket.foundation cite-forever v0.1",
  url: URL,
  license: URL,
  isAccessibleForFree: true,
  description:
    "Free to read. Paid to cite. Every citation routes fees to the author, over x402 on Base, forever.",
  publisher: {
    "@type": "NGO",
    name: "bucket.foundation",
    url: "https://www.bucket.foundation",
  },
};

const ENVELOPE_CITE = `{
  "cite": {
    "price_usd":     0.002,
    "payout_wallet": "0x...author...",
    "license":       "bucket.foundation/cite-forever/v0.1"
  }
}`;

export default function Page() {
  return (
    <PageShell
      eyebrow="§ license · cite-forever · v0.1"
      title="Free to read. Paid to cite."
      subtitle="The canonical URL that every feed402 envelope's cite.license field points to."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <div className="space-y-8 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
        <p>
          <strong className="text-[color:var(--parchment)]">Reading is free.</strong> Every
          page, every paper, every envelope, every byte — freely accessible, freely
          indexable, freely ingestible by humans, search engines, and AI agents.
        </p>
        <p>
          <strong className="text-[color:var(--parchment)]">Citing costs.</strong> If your
          work cites a bucket canon artifact, the citation fee (typically $0.002–$0.050
          USDC, per feed402 tier) routes to the <em>author&apos;s payout wallet</em> on
          Base, not to a publisher, not to bucket. Forever.
        </p>

        <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-4">
          The envelope
        </h2>
        <p>
          Every response from a feed402/0.2 endpoint carries a{" "}
          <code className="font-mono-mark text-[color:var(--gold)]">cite</code> block.
          That block binds three things — the price, the payout wallet, and this
          license — into a machine-enforceable contract.
        </p>
        <CodeBlock code={ENVELOPE_CITE} lang="json" title="cite block" lines={false} />

        <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-4">
          Terms
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong className="text-[color:var(--parchment)]">Read freely.</strong> You
            may read, cache, index, quote, summarise, and train on any bucket artifact,
            without payment, without attribution obligation beyond what CC-BY-4.0
            (upstream) requires.
          </li>
          <li>
            <strong className="text-[color:var(--parchment)]">Cite with payment.</strong>{" "}
            If you cite a canon artifact as a primary source in a published work
            (paper, book, blog post, LLM output surfaced to users, product feature),
            pay the <code className="font-mono-mark text-[color:var(--gold)]">cite.price_usd</code>{" "}
            to <code className="font-mono-mark text-[color:var(--gold)]">cite.payout_wallet</code>{" "}
            over the x402 rail on Base. Once paid, the citation is valid forever; no
            renewal, no subscription.
          </li>
          <li>
            <strong className="text-[color:var(--parchment)]">Provenance is public.</strong>{" "}
            Every citation transaction is on-chain. The{" "}
            <code className="font-mono-mark text-[color:var(--gold)]">provenance</code>{" "}
            array on each envelope records the retrieval and citation chain.
          </li>
          <li>
            <strong className="text-[color:var(--parchment)]">Authors are paid, not
            publishers.</strong> 100% of cite fees route to the author-specified payout
            wallet. bucket.foundation takes 0% of cite fees. Operational costs are
            covered by query-tier proxy margin and donations.
          </li>
          <li>
            <strong className="text-[color:var(--parchment)]">Forever means forever.</strong>{" "}
            This license is version-pinned. <code className="font-mono-mark text-[color:var(--gold)]">v0.1</code>{" "}
            means v0.1; future versions live at their own canonical URLs and never
            retroactively apply.
          </li>
        </ol>

        <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-4">
          Why this works
        </h2>
        <p>
          Publishers charge for reading. We charge for citing. Reading is where
          discovery happens — it must be free. Citing is where value is asserted — the
          cite is the proof that your work depends on theirs, and that dependency is
          exactly what deserves a royalty. We flip the direction, micro-price it, and
          route it on a rail that actually settles (x402 on Base, USDC, sub-cent
          atomic).
        </p>

        <div className="mt-12 p-6 border hairline bg-[color:var(--ink-2)] text-sm">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-3">
            canonical
          </div>
          <div className="font-mono-mark text-[color:var(--parchment)]">
            https://www.bucket.foundation/cite-forever/v0.1
          </div>
          <div className="mt-4 small-caps text-[11px] text-[color:var(--gold)] mb-3">
            see also
          </div>
          <ul className="space-y-1">
            <li>
              <Link href="/protocol" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                /protocol
              </Link>{" "}
              — feed402/0.2 spec
            </li>
            <li>
              <Link href="/protocol/envelope" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                /protocol/envelope
              </Link>{" "}
              — the full envelope shape
            </li>
            <li>
              <Link href="/governance" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                /governance
              </Link>{" "}
              — nonprofit structure
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
