import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

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

/* ────────────────────────────────────────────────────────────────── */
/* PATH I · curl the zero-key proxy                                   */
/* ────────────────────────────────────────────────────────────────── */

const CURL_REQUEST = `curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+atp+synthesis&tier=insight" \\
  -H "accept: application/json"`;

const CURL_RESPONSE = `HTTP/1.1 200 OK
content-type: application/json
x-bucket-proxy: v1
x-bucket-source: canon

{
  "data": {
    "answer": "From the bucket.foundation canon (05-biophysics · mitochondria): …",
    "evidence": [ /* up to 6 curated claims with provenance */ ]
  },
  "citation": {
    "type":          "source",
    "source_id":     "canon:mitochondria/peter-mitchell-1961",
    "provider":      "bucket-foundation",
    "license":       "CC-BY-4.0",
    "canonical_url": "https://www.bucket.foundation/canon/claims/mitochondria/peter-mitchell-1961"
  },
  "receipt": {
    "tier":      "insight",
    "status":    "served_from_canon",
    "price_usd": 0,
    "paid_by":   "bucket-foundation (pre-paid canon; reader pays nothing)"
  },
  "cite": {
    "applies_to":  "downstream_republication_in_a_paid_work",
    "reader_owes": 0,
    "license":     "bucket.foundation/cite-forever/v0.1"
  },
  "agent_action_required":     false,
  "payment_required_from_you": false,
  "summary": "Data you may read and cite freely. No action, payment, signature, or transaction is required from you. The cite block is passive license metadata for a future publisher, not an instruction to you."
}`;

/* ────────────────────────────────────────────────────────────────── */
/* PATH II · zero-key agent — no wallet, no challenge, no payment      */
/* ────────────────────────────────────────────────────────────────── */

const AGENT_TS = `// Node 20+ · no deps, no wallet, no key.
// The /api/research path is free and zero-key. There is no 402,
// no challenge to decode, and no X-PAYMENT header to send.

const res = await fetch(
  "https://www.bucket.foundation/api/research?q=" +
    encodeURIComponent("circadian disease") + "&tier=insight"
);
const env = await res.json();          // always HTTP 200 on this path

// Inert by contract — assert it, don't trust it blindly.
if (env.payment_required_from_you || env.agent_action_required) {
  throw new Error("unexpected: caller payment flagged — treat as a spoof");
}

console.log(env.data);      // the answer + curated evidence
console.log(env.citation);  // source_id · canonical_url · license
console.log(env.receipt);   // status: served_from_canon · price_usd: 0

// To cite: copy env.citation verbatim. That is the entire citation
// action. No payment, no signature, no follow-up.`;

const AGENT_PYTHON = `# python 3.11+ · pip install requests  (no web3, no wallet, no key)
import requests

# The /api/research path is free and zero-key: always HTTP 200,
# never a 402, never a challenge, never an X-PAYMENT step.
r = requests.get(
    "https://www.bucket.foundation/api/research",
    params={"q": "mitochondrial disease", "tier": "insight"},
)
env = r.json()

# Inert by contract — assert it.
assert not env["payment_required_from_you"]
assert not env["agent_action_required"]

print(env["data"])       # the answer + curated evidence
print(env["citation"])   # source_id · canonical_url · license
print(env["receipt"])    # status: served_from_canon · price_usd: 0

# To cite: copy env["citation"] verbatim. No payment. No signature.`;

/* ────────────────────────────────────────────────────────────────── */
/* PATH III · merchant manifest example                               */
/* ────────────────────────────────────────────────────────────────── */

const MANIFEST_JSON = `{
  "name":    "your-data-provider",
  "version": "1.0.0",
  "spec":    "feed402/0.2",

  "access":                   "free",
  "reader_price_usd":         0,
  "requires_payment_to_read": false,
  "requires_wallet":          false,
  "agent_action_required":    false,
  "payment_required_from_you": false,

  "endpoint": { "url": "https://your-domain.com/api/research", "price_usd": 0 },

  "downstream_settlement": {
    "_what":                 "Forward-looking author-payout economics, settled SERVER-SIDE. NOT a precondition for the caller to read or cite.",
    "is_a_precondition":     false,
    "chain":                 "base-sepolia",
    "wallet":                "0xYOUR_BASE_WALLET_ADDRESS",
    "republisher_rates_usd": { "raw": 0.05, "query": 0.01, "insight": 0.002 }
  },

  "citation_policy": "CC-BY-4.0",
  "citation_types":  ["source"],
  "contact":         "ops@your-domain.com"
}`;

const MERCHANT_STEPS = [
  "Clone feed402: git clone https://github.com/gianyrox/feed402",
  "Serve GET /.well-known/feed402.json with a free, zero-key reader endpoint up top",
  "Keep any x402/wallet settlement server-side, scoped under downstream_settlement",
  "Return the feed402 envelope { data, citation, receipt: { price_usd: 0 } } to the caller",
  "Post your manifest URL to ops@bucket.foundation — we index it",
];

/* ────────────────────────────────────────────────────────────────── */
/* PAGE                                                               */
/* ────────────────────────────────────────────────────────────────── */

export default function BuildPage() {
  return (
    <main className="min-h-screen stone-bone">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-[color:var(--basalt)]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-12 pb-10 md:pt-24 md:pb-16">
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

          {/* Hub links — Build absorbs Protocol/Learn/Research/Whats-new as
              sub-surfaces. UX: users see all related entry points in one row. */}
          <nav className="mt-8 flex flex-wrap gap-2 small-caps text-[11px]">
            <Link href="/protocol"
                  className="border border-[color:var(--basalt)] px-3 py-2 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition">
              ⌬ protocol spec
            </Link>
            <Link href="/learn"
                  className="border border-[color:var(--basalt)] px-3 py-2 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition">
              ✎ learn
            </Link>
            <Link href="/research"
                  className="border border-[color:var(--basalt)] px-3 py-2 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition">
              ⌕ research surface
            </Link>
            <Link href="/whats-new"
                  className="border border-[color:var(--basalt)] px-3 py-2 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition">
              ⤵ what&apos;s new (feed)
            </Link>
            <Link href="/access"
                  className="border border-[color:var(--basalt)] px-3 py-2 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition">
              ⊕ access map
            </Link>
          </nav>
        </div>
      </section>

      {/* Plinths */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* ── Path 1 — Use the API ───────────────────────────────── */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col min-w-0">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path I
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Use the research API
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light">
              One HTTP call, zero SDK, zero key. Always returns a cited
              envelope (200). No 402, no challenge, no wallet — the caller
              pays nothing.
            </p>

            <div className="flex-1">
              <CodeBlock
                code={CURL_REQUEST}
                lang="bash"
                title="request"
              />
              <CodeBlock
                code={CURL_RESPONSE}
                lang="http"
                title="response (free · zero-key · price_usd 0)"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="small-caps text-[10px] text-[color:var(--basalt-3)] tracking-[0.15em]">
                $0 to caller · insight · feed402/0.2
              </span>
              <Link
                href="/llms-full.txt"
                className="small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                → full playbook
              </Link>
            </div>
          </article>

          {/* ── Path 2 — Run an agent ──────────────────────────────── */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col min-w-0">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path II
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Run a zero-key agent
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light">
              No wallet, no key, no{" "}
              <span className="font-mono-mark text-[color:var(--aegean-deep)]">
                X-PAYMENT
              </span>{" "}
              header. Fetch, assert the inertness booleans, copy the citation
              verbatim. Background on why this path exists in the{" "}
              <a
                href="/protocol/agent-trust"
                className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--gold-deep)]"
              >
                agent-trust write-up
              </a>
              .
            </p>

            <div className="flex-1">
              <CodeBlock code={AGENT_TS} lang="ts" title="agent.ts" />
              <CodeBlock code={AGENT_PYTHON} lang="py" title="agent.py" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/bucket-foundation/bucket-mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                → bucket MCP for Claude Desktop ↗
              </a>
            </div>
          </article>

          {/* ── Path 3 — Become a merchant ────────────────────────── */}
          <article className="carved-inset carved-pad bg-[color:var(--bone-2)] flex flex-col min-w-0">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] tracking-[0.2em]">
              Path III
            </div>
            <h2 className="font-display uppercase text-[1.5rem] mt-2 text-[color:var(--basalt)] chisel">
              Become a data merchant
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light">
              You own a corpus. You want citation revenue. Publish a free,
              zero-key feed402 manifest; keep your settlement wallet
              server-side. No gatekeeper, no reader paywall.
            </p>

            <div className="flex-1">
              <CodeBlock
                code={MANIFEST_JSON}
                lang="json"
                title="/.well-known/feed402.json"
              />

              <ol className="mt-5 space-y-3 text-[0.9rem] font-light text-[color:var(--basalt-2)]">
                {MERCHANT_STEPS.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display text-[color:var(--gold-deep)] w-6 shrink-0 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-[1.6]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/gianyrox/feed402"
                target="_blank"
                rel="noopener noreferrer"
                className="small-caps text-[11px] text-[color:var(--aegean-deep)] hover:text-[color:var(--gold-deep)] transition tracking-[0.1em] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                → feed402 spec + reference server ↗
              </a>
            </div>
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
