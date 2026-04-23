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

const CURL_RESPONSE = `HTTP/1.1 402 Payment Required
content-type: application/json
x-bucket-proxy: v1

{
  "data": null,
  "receipt": {
    "tier":      "insight",
    "status":    "payment_required",
    "price_usd": 0.005,
    "asset":     "USDC",
    "network":   "base-sepolia",
    "pay_to":    "0xa91115B1AB8412f380Fd62446F523559F668b96B",
    "challenge": "eyJ4NDAyVmVyc2lvbiI6Miwi...",
    "demo":      true
  },
  "error": {
    "code": "payment_required",
    "message": "Pay the x402 challenge from receipt.challenge to unlock."
  }
}`;

/* ────────────────────────────────────────────────────────────────── */
/* PATH II · agent in TypeScript that decodes the challenge + pays    */
/* ────────────────────────────────────────────────────────────────── */

const AGENT_TS = `// Node 20+ · npm i viem
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.WALLET_PK as \`0x\${string}\`);
const client  = createWalletClient({ account, chain: baseSepolia, transport: http() });

// 1. naive call — expect 402 back with an x402 challenge
const naive = await fetch(
  "https://www.bucket.foundation/api/research?q=" +
    encodeURIComponent("circadian disease") + "&tier=insight"
);
const env = await naive.json();

if (naive.status === 402) {
  // 2. decode challenge, sign EIP-712 payment intent, retry with X-PAYMENT header
  const challenge = JSON.parse(atob(env.receipt.challenge));
  const accepts   = challenge.accepts[0];
  const payment   = await signX402Payment(client, accepts); // see feed402 ref agent
  const paid = await fetch(naive.url, { headers: { "X-PAYMENT": payment } });
  const cited = await paid.json();

  console.log(cited.data);     // the answer
  console.log(cited.citation); // doi · canonical_url · license
  console.log(cited.receipt);  // tier · price · on-chain tx hash
}`;

const AGENT_PYTHON = `# python 3.11+ · pip install requests web3 eth-account
import base64, json, os, requests
from eth_account import Account
from eth_account.messages import encode_typed_data

acct = Account.from_key(os.environ["WALLET_PK"])

# 1. naive call — expect 402
r = requests.get(
    "https://www.bucket.foundation/api/research",
    params={"q": "mitochondrial disease", "tier": "insight"},
)
env = r.json()

if r.status_code == 402:
    # 2. decode x402 challenge, sign, retry
    challenge = json.loads(base64.b64decode(env["receipt"]["challenge"]))
    payment   = sign_x402_payment(acct, challenge["accepts"][0])  # see feed402 ref
    paid      = requests.get(r.url, headers={"X-PAYMENT": payment})
    cited     = paid.json()
    print(cited["data"])       # the answer
    print(cited["citation"])   # doi · canonical_url · license
    print(cited["receipt"])    # tier · price · tx_hash`;

/* ────────────────────────────────────────────────────────────────── */
/* PATH III · merchant manifest example                               */
/* ────────────────────────────────────────────────────────────────── */

const MANIFEST_JSON = `{
  "name":    "your-data-provider",
  "version": "1.0.0",
  "spec":    "feed402/0.2",
  "chain":   "base-sepolia",
  "wallet":  "0xYOUR_BASE_WALLET_ADDRESS",

  "tiers": {
    "raw":     { "path": "/raw",     "price_usd": 0.05,  "unit": "row"  },
    "query":   { "path": "/query",   "price_usd": 0.01,  "unit": "call" },
    "insight": { "path": "/insight", "price_usd": 0.002, "unit": "call" }
  },

  "citation_policy": "CC-BY-4.0",
  "citation_types":  ["source"],
  "contact":         "ops@your-domain.com"
}`;

const MERCHANT_STEPS = [
  "Clone feed402: git clone https://github.com/gianyrox/feed402",
  "Serve GET /.well-known/feed402.json with your tiers + Base wallet",
  "Wrap your data endpoint with x402 middleware (USDC on Base)",
  "Return the feed402 envelope { data, citation, receipt } on every paid call",
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
              One HTTP call, zero SDK. Returns either a cited envelope (200) or
              an x402 challenge your agent can pay (402).
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
                title="response (payment challenge)"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="small-caps text-[10px] text-[color:var(--basalt-3)] tracking-[0.15em]">
                $0.005 · insight · feed402/0.2
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
              Run a paying agent
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--basalt-2)] font-light">
              Decode the 402 challenge, sign the EIP-712 payment, retry with{" "}
              <span className="font-mono-mark text-[color:var(--aegean-deep)]">
                X-PAYMENT
              </span>
              . Full helper in the{" "}
              <a
                href="https://github.com/gianyrox/feed402"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--gold-deep)]"
              >
                feed402 ref agent
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
              You own a corpus. You want citation revenue. Publish a feed402
              manifest and register your wallet. No gatekeeper.
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
