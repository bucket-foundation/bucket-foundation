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

export const metadata = {
  title: "Support · host Research OS",
  description:
    "Donations pay to host Research OS, the research tools and the canon for free. Citation fees go to authors. A nonprofit ask with no checkout.",
  alternates: { canonical: "/support" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/support",
    title: "Support · host Research OS — bucket.foundation",
    description:
      "Donations host Research OS and the free research tools. Citation fees go to authors. A nonprofit with no equity, no investors, no exit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Support · host Research OS — bucket.foundation",
    description:
      "Donations host Research OS. Citation fees go to authors.",
  },
};

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Support · host Research OS
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          host Research OS{" "}
          <span className="inlay-gold">for everyone.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          Bucket Foundation is a nonprofit with no equity, no investors and no exit. Research OS,
          the canon and the research tools are free to use. Two kinds of money move through the
          foundation: citation fees, which go to the author of the cited work, and donations,
          which pay for hosting.
        </p>
        <p className="mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          <strong className="text-[color:var(--basalt)]">
            The ask is hosting for Research OS.
          </strong>{" "}
          That covers the web app, the desktop app releases, the database, and always-on GPUs for
          the heaviest tools, which run on a founder laptop today and go dark when it closes.
        </p>

        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <FundLine
            n="01"
            title="Research OS hosting"
            body="The web app, sign-in, sync and the signed desktop releases stay online for every learner, student and teacher."
          />
          <FundLine
            n="02"
            title="always-on GPUs"
            body="LabBrain, TrajMine and CryoTriage move from a personal machine to hosting the foundation controls, so they answer around the clock."
          />
          <FundLine
            n="03"
            title="open forever"
            body="Every tool, dataset and paper stays free to read and priced once to cite, with the fee paid to the author. Funding buys uptime and leaves the paywall out."
          />
        </div>

        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          ways to fund
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
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
            href="/research-os"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            Research OS
          </Link>
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
