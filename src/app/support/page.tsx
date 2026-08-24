import Link from "next/link";
import {
  CONTACT_EMAIL,
  DONATE_USDC_BASE_ADDRESS,
  DONATE_USDC_NETWORK,
  GITHUB_SPONSORS_URL,
  GITHUB_SPONSORS_ACTIVE,
  FUND_MAILTO,
  mailto,
} from "@/lib/support";

// /support, the real fundable thing.
//
// Bucket's research tools + local-LLM features run partly on the founder's
// personal laptop GPU; when that machine is closed, those features go dark.
// This page makes the ask: fund always-on cloud-GPU hosting so the tools
// (and the local-LLM features behind them) are available to everyone, 24/7.
// Donation options are real where possible and-labelled-TODO where they
// need the founder to activate them (GitHub Sponsors). All config, the contact
// email + the donation links, lives in src/lib/support.ts (one knob).

export const metadata = {
  title: "Support · fund always-on research",
  description:
    "Fund always-on cloud-GPU hosting so bucket.foundation's research tools and local-LLM features are available to everyone, 24/7. A real, honest ask — not a checkout.",
  alternates: { canonical: "/support" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/support",
    title: "Support · fund always-on research — bucket.foundation",
    description:
      "Fund always-on cloud-GPU hosting so bucket.foundation's free research tools stay available to everyone, 24/7. A nonprofit — no equity, no investors, no exit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Support · fund always-on research — bucket.foundation",
    description:
      "Help keep the free research instruments always on. A nonprofit ask, not a checkout.",
  },
};

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Support · the fundable thing
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          keep the instruments{" "}
          <span className="inlay-gold">always on.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          Bucket Foundation is a nonprofit — no equity, no investors, no exit.
          Most of the research tools run on an always-on server. But the heaviest
          ones — the GPU jobs and the grounded local-LLM features — run on the
          founder&rsquo;s personal laptop GPU, reached over a tunnel. When that
          laptop is closed, those features go dark.
        </p>
        <p className="mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          <strong className="text-[color:var(--basalt)]">
            The ask is simple: fund cloud-GPU hosting.
          </strong>{" "}
          With it, every research tool and every local-LLM feature is available
          to everyone, 24/7 — not just while one machine happens to be open.
          That is the single thing standing between &ldquo;a demo on a
          laptop&rdquo; and &ldquo;a public research instrument.&rdquo;
        </p>

        <div className="carved-rule max-w-xs mt-10" />

        {/* What it pays for */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <FundLine
            n="01"
            title="cloud GPU"
            body="A persistent GPU host for the local-LLM + GPU tools (LabBrain, TrajMine, CryoTriage) so they answer 24/7, not just when a laptop is open."
          />
          <FundLine
            n="02"
            title="always-on"
            body="Move the founder-GPU tools off a personal machine onto hosting the foundation controls — uptime, not goodwill."
          />
          <FundLine
            n="03"
            title="open forever"
            body="Every tool, dataset and paper stays free to read and priced-once to cite. Funding buys uptime, never a paywall."
          />
        </div>

        {/* Donation options */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          ways to fund
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {/* (a) Crypto, real, public address */}
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
                crypto · {DONATE_USDC_NETWORK}
              </div>
              <span className="text-[10px] small-caps tracking-[0.14em] text-[color:var(--laurel-deep,var(--aegean-deep))] border border-[color:var(--hairline)] px-2 py-0.5">
                live
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-3" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              Send USDC on Base to the foundation&rsquo;s public payout address —
              the same address research-atlas citations pay to. Public by design.
            </p>
            <code className="mt-4 block break-all text-[13px] bg-[color:var(--bone-2,var(--bone))] border border-[color:var(--hairline)] px-4 py-3 text-[color:var(--basalt)] select-all">
              {DONATE_USDC_BASE_ADDRESS}
            </code>
          </div>

          {/* (b) GitHub Sponsors, link correct, activation TODO */}
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
                github sponsors
              </div>
              <span className="text-[10px] small-caps tracking-[0.14em] text-[color:var(--gold-deep,var(--basalt-3))] border border-[color:var(--gold-deep,var(--basalt-3))] px-2 py-0.5">
                {GITHUB_SPONSORS_ACTIVE ? "live" : "TODO · activate in GitHub"}
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-3" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              Recurring monthly support via GitHub Sponsors.{" "}
              {GITHUB_SPONSORS_ACTIVE
                ? "Choose a tier and you're set."
                : "The profile must be enabled in the GitHub dashboard before this link resolves."}
            </p>
            <a
              href={GITHUB_SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
            >
              sponsor on github ↗
            </a>
          </div>

          {/* (c) Email to fund */}
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
              fund directly · talk to us
            </div>
            <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-3" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              Grants, larger gifts, in-kind cloud-GPU credits, or just questions —
              email {CONTACT_EMAIL}. We&rsquo;ll send what the money buys, line by
              line.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href={FUND_MAILTO}
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
              >
                email to fund →
              </a>
              <a
                href={mailto("bucket.foundation — question")}
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                contact →
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">
          Bucket Foundation is held in the founder&rsquo;s personal capacity
          pending formal 501(c)(3) reinstatement (see{" "}
          <Link
            href="/governance"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            governance
          </Link>
          ). Contributions are not yet tax-deductible. We&rsquo;ll say so plainly
          the moment that changes.
        </p>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the research tools
          </Link>
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            research hub
          </Link>
          <Link
            href="/manifesto"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            why bucket exists
          </Link>
        </div>
      </div>
    </main>
  );
}

function FundLine({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[180px] shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="font-display text-[28px] text-[color:var(--basalt-3)] leading-none">
        {n}
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
        {title}
      </div>
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{body}</p>
    </div>
  );
}
