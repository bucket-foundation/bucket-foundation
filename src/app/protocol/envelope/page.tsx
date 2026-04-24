import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import CodeBlock from "@/components/CodeBlock";

const URL = "https://www.bucket.foundation/protocol/envelope";

export const metadata: Metadata = {
  title: "Envelope · feed402/0.2",
  description:
    "The exact JSON shape every feed402/0.2 endpoint returns — data, citation, receipt, cite, tags, canon_tier, foundation_branches, provenance.",
  alternates: { canonical: "/protocol/envelope" },
  openGraph: {
    type: "article",
    url: URL,
    title: "feed402 envelope · bucket.foundation",
    description:
      "The canonical feed402/0.2 response shape. One envelope, paid once, cited forever.",
  },
  twitter: {
    card: "summary_large_image",
    title: "feed402 envelope",
    description:
      "The canonical feed402/0.2 response shape. Paid once, cited forever.",
  },
};

const ENVELOPE = `{
  "data": {
    "_note": "tier-specific payload — list of papers, synthesis, or raw rows"
  },
  "citation": {
    "type":          "source",
    "source_id":     "pmid:123456",
    "provider":      "pubmed",
    "retrieved_at":  "2026-04-23T00:00:00Z",
    "license":       "CC-BY-4.0",
    "canonical_url": "https://pubmed.ncbi.nlm.nih.gov/123456/"
  },
  "receipt": {
    "tier":         "insight",
    "price_usd":    0.002,
    "tx":           "0xabc...",
    "paid_at":      "2026-04-23T00:00:01Z",
    "buyer_wallet": "0xdef...",
    "status":       "paid"
  },
  "cite": {
    "price_usd":     0.002,
    "payout_wallet": "0xa91115B1AB8412f380Fd62446F523559F668b96B",
    "license":       "bucket.foundation/cite-forever/v0.1"
  },
  "tags": ["biophysics", "mitochondria", "atp"],
  "canon_tier": "candidate",
  "foundation_branches": ["05-biophysics"],
  "provenance": [
    { "action": "retrieved", "at": "2026-04-23T00:00:00Z", "by": "bucket-proxy/v1", "via": "x402-research.agfarms.dev" },
    { "action": "cited",     "at": "2026-04-23T00:00:01Z", "by": "agent:claude",    "via": "feed402/0.2" }
  ]
}`;

const CURL = `curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+atp&tier=insight"`;

export default function Page() {
  return (
    <PageShell
      eyebrow="§ protocol · envelope"
      title="One envelope. Eight fields."
      subtitle="Every feed402/0.2 response returns the same shape. Data on top, citation + receipt + cite in the middle, tags + canon_tier + foundation_branches + provenance at the bottom."
    >
      <div className="space-y-8 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
        <p>
          The envelope is the single atomic unit of the protocol. It&apos;s what you
          pay for, what you cite, and what you trust.
        </p>

        <CodeBlock code={ENVELOPE} lang="json" title="feed402/0.2 envelope" />

        <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-4">
          Fields
        </h2>
        <dl className="space-y-5">
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">data</dt>
            <dd className="pl-4 mt-1">
              Tier-specific payload. <em>raw</em> → full records, <em>query</em> → ranked
              citations, <em>insight</em> → synthesis.
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">citation</dt>
            <dd className="pl-4 mt-1">
              Who said it, when, where, under what upstream license. Always includes a{" "}
              <code>canonical_url</code>.
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">receipt</dt>
            <dd className="pl-4 mt-1">
              Proof of payment. <code>tx</code>, <code>paid_at</code>,{" "}
              <code>buyer_wallet</code>, <code>status</code>. This is what auditors
              check.
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">cite</dt>
            <dd className="pl-4 mt-1">
              The forward-looking commitment. <code>price_usd</code>,{" "}
              <code>payout_wallet</code>, <code>license</code> — bound together, this is
              the contract you accept if you re-cite this artifact. License URL always
              resolves to{" "}
              <Link href="/cite-forever/v0.1" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                /cite-forever/v0.1
              </Link>
              .
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">tags</dt>
            <dd className="pl-4 mt-1">Free-form topic tags. Useful for filtering.</dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">canon_tier</dt>
            <dd className="pl-4 mt-1">
              One of <code>candidate</code>, <code>cited</code>, <code>canon</code>.
              Canon = axiom, real math, law, principle, primary derivation.
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">foundation_branches</dt>
            <dd className="pl-4 mt-1">
              One or more of the eight branches:{" "}
              <code>01-mathematics</code>, <code>02-physics</code>,{" "}
              <code>03-chemistry</code>, <code>04-information</code>,{" "}
              <code>05-biophysics</code>, <code>06-cosmology</code>,{" "}
              <code>07-mind</code>, <code>08-earth</code>.
            </dd>
          </div>
          <div>
            <dt className="font-mono-mark text-[color:var(--gold)]">provenance</dt>
            <dd className="pl-4 mt-1">
              Append-only log of actions on this envelope —{" "}
              <code>{"{ action, at, by, via }"}</code>. The chain of custody.
            </dd>
          </div>
        </dl>

        <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-4">
          Try it
        </h2>
        <CodeBlock code={CURL} lang="bash" title="zero-key proxy" />
      </div>
    </PageShell>
  );
}
