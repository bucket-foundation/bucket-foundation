import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build",
  description:
    "Three paths to build on bucket.foundation: query the research API, run an agent against the x402 rail, or become a data merchant.",
  other: {
    "ai:protocol": "feed402/0.2",
    "ai:api": "/api/research",
    "ai:discovery": "/.well-known/feed402.json",
  },
};

const CURL = `curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+function&tier=insight"`;

const AGENT_SNIPPET = `// Node 20+, zero deps
const r = await fetch(
  "https://www.bucket.foundation/api/research?q=" +
    encodeURIComponent("circadian metabolic disease") +
    "&tier=insight",
  { headers: { accept: "application/json" } }
);
const env = await r.json();
console.log(env.data);        // the answer
console.log(env.citation);    // source_id + canonical_url + license
console.log(env.receipt);     // tier + price + tx hash
`;

const MERCHANT_STEPS = [
  "Clone feed402: git clone https://github.com/gianyrox/feed402",
  "Implement GET /.well-known/feed402.json advertising your tiers + wallet",
  "Wrap your data endpoint with x402 middleware on Base (USDC)",
  "Return the feed402 envelope: { data, citation, receipt } on every paid call",
  "Post your manifest URL to ops@bucket.foundation — we’ll index it",
];

export default function BuildPage() {
  return (
    <main className="min-h-screen stone-bone">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-[color:var(--basalt)]">
        <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-4 tracking-[0.2em]">
            § Build
          </div>
          <h1 className="font-display uppercase text-[clamp(2rem,5vw,4rem)] leading-[1.05] tracking-[0.04em] text-[color:var(--basalt)] chisel max-w-4xl">
            build on the bucket rail.
          </h1>
          <p className="mt-6 max-w-2xl font-light text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed text-[color:var(--basalt-2)]">
            Three paths. Pick one. Every path ships today on mainnet-adjacent
            infrastructure; every path terminates in a citeable envelope.
          </p>
        </div>
      </section>

      {/* Plinths */}
      <section className="max-w-[1400px] mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Path 1 — Use the API */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path I
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Use the research API
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light flex-1">
              Zero-key. We hold the wallet. You send a query, you get back a
              cited envelope. Budget-capped at $1/day shared.
            </p>
            <pre className="mt-5 text-[11px] md:text-[12px] leading-relaxed bg-[color:var(--basalt)] text-[color:var(--bone)] p-4 rounded-sm overflow-x-auto font-mono-mark">
              <code>{CURL}</code>
            </pre>
            <div className="mt-4 small-caps text-[10px] text-[color:var(--basalt-3)] tracking-[0.15em]">
              $0.002/call · insight tier · feed402/0.2
            </div>
            <Link
              href="/llms-full.txt"
              className="mt-3 small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em]"
            >
              → full playbook (/llms-full.txt)
            </Link>
          </article>

          {/* Path 2 — Run an agent */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path II
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Run an agent
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light flex-1">
              Point any LLM agent at the proxy. The feed402 reference agent is
              ~100 LOC; your MCP client can also auto-discover us via{" "}
              <Link
                href="/.well-known/mcp.json"
                className="underline decoration-[color:var(--gold)]"
              >
                /.well-known/mcp.json
              </Link>
              .
            </p>
            <pre className="mt-5 text-[11px] md:text-[12px] leading-relaxed bg-[color:var(--basalt)] text-[color:var(--bone)] p-4 rounded-sm overflow-x-auto font-mono-mark">
              <code>{AGENT_SNIPPET}</code>
            </pre>
            <a
              href="https://github.com/gianyrox/feed402"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em]"
            >
              → feed402 reference agent ↗
            </a>
          </article>

          {/* Path 3 — Become a merchant */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path III
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Become a data merchant
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light flex-1">
              You have a corpus. You want citation revenue. feed402 is the
              shape. Five steps, no gatekeeper.
            </p>
            <ol className="mt-5 space-y-3 text-[0.9rem] font-light text-[color:var(--basalt-2)]">
              {MERCHANT_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display text-[color:var(--gold-deep)] w-6 shrink-0">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://github.com/gianyrox/feed402"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em]"
            >
              → feed402 spec + reference server ↗
            </a>
          </article>
        </div>

        {/* Footer inscription */}
        <div className="mt-16 md:mt-24 text-center">
          <div className="small-caps text-[10px] text-[color:var(--basalt-3)] tracking-[0.2em]">
            build the past · build history · bucket is the new renaissance
          </div>
        </div>
      </section>
    </main>
  );
}
