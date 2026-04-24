import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { readDoc } from "@/lib/docs";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Protocol",
  description:
    "feed402/0.2 — an open standard for paid research endpoints over x402 on Base. Discover, pay, query — three tiers, one envelope.",
  alternates: { canonical: "/protocol" },
  openGraph: { type: "article", title: "Protocol · bucket.foundation", url: "https://www.bucket.foundation/protocol" },
};

export default function Page() {
  const md = readDoc("PROTOCOL.md");
  return (
    <PageShell
      eyebrow="§ protocol"
      title="feed402 · paid-once, cite-forever"
      subtitle="An open standard for paid research endpoints over x402 on Base. Discover, pay, query — three tiers, one envelope."
    >
      <div className="mb-10 p-5 border hairline bg-[color:var(--ink-2)] text-sm text-[color:var(--parchment-dim)]">
        <div className="small-caps text-[11px] text-[color:var(--gold)] mb-2">open source</div>
        <ul className="space-y-1">
          <li>Spec: <a href="https://github.com/gianyrox/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">gianyrox/feed402</a> — MIT code, CC0 intent</li>
          <li>Reference gateway: <a href="https://github.com/gianyrox/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">gianyrox/x402-research-gateway</a> — 7+ live upstreams on Base</li>
          <li>AGFarms org forks: <a href="https://github.com/AGFarms/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">AGFarms/feed402</a>, <a href="https://github.com/AGFarms/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">AGFarms/x402-research-gateway</a></li>
        </ul>
      </div>
      <Markdown source={md} />
    </PageShell>
  );
}
