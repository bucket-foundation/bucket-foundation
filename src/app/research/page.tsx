import Link from "next/link";
import ResearchPublishClient from "./ResearchPublishClient";

// Server component shell — always renders the stone-bone "ready state" and
// lets the client island decide whether to show the interactive publish form
// (only if Web3 providers actually mounted).
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-6 py-24 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Publish · primary research
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          publish. mint. be cited{" "}
          <span className="inlay-gold">forever.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Every paper on bucket.foundation is free to read and priced-once to
          cite. You upload a PDF, we mint it as a Story Protocol IP NFT with a
          Walrus-pinned artifact, and every downstream citation pays you — the
          author — over the x402 rail on Base, forever.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Step
            n="01"
            title="upload"
            body="A PDF of primary research. Axioms, derivations, first principles. Outcomes are welcome but the canon holds only foundations."
          />
          <Step
            n="02"
            title="mint"
            body="The artifact is pinned to Walrus and minted as a Story Protocol IP NFT on Iliad testnet. The mint is your canonical record."
          />
          <Step
            n="03"
            title="be cited"
            body="Every citation over feed402/0.2 routes a USDC payment to your payout wallet. Read the cite-forever v0.1 license."
          />
        </div>

        <div className="mt-14">
          <ResearchPublishClient />
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

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[180px] shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="font-display text-[28px] text-[color:var(--basalt-3)] leading-none">
        {n}
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
        {title}
      </div>
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {body}
      </p>
    </div>
  );
}
