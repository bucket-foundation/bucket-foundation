import Link from "next/link";
import {
  REPOS,
  CANON_BRANCHES,
  CONTACT_EMAIL,
  CONTRIBUTE_MAILTO,
  GITHUB_ORG_URL,
  ZENODO_DOI,
  ZENODO_DOI_URL,
  DATA_LICENSE,
  DATA_LICENSE_URL,
  ATLAS_CITATION,
} from "@/lib/contribute";

// /contribute — the open-research counterpart to /support.
//
// /support asks for MONEY (fund always-on hosting). /contribute asks for WORK:
// add primary research to the canon, send a PR to the open-source repos, build
// or improve a research tool, sharpen a canon branch, or just cite and use the
// open datasets. Same stone-bone visual structure as /support so the two read
// as one pair. All links + the contact CTA live in src/lib/contribute.ts (one
// knob), which reuses the single contact email from src/lib/support.ts.

export const metadata = {
  title: "Contribute · build the canon with us",
  description:
    "Five ways to help build bucket.foundation, a nonprofit open-research foundation: add primary research to the canon, send a PR to the open-source repos, build or improve a research tool, sharpen a canon branch, or cite and use the open datasets. No equity, no investors, no exit.",
  alternates: { canonical: "/contribute" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/contribute",
    title: "Contribute · build the canon with us — bucket.foundation",
    description:
      "Add primary research, send a PR, build a research tool, improve a canon branch, or cite the open datasets. A nonprofit open-research foundation — no equity, no investors, no exit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contribute · build the canon with us — bucket.foundation",
    description:
      "Five concrete ways to help build a nonprofit open-research foundation. Research, code, tools, canon, citation.",
  },
};

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Contribute · build it with us
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          help carve the{" "}
          <span className="inlay-gold">canon.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          Bucket Foundation is a nonprofit, open-research project — no equity, no
          investors, no exit. Everything is{" "}
          <strong className="text-[color:var(--basalt)]">
            free to read and priced-once to cite
          </strong>
          , the code is MIT, the datasets are {DATA_LICENSE}, and the protocol
          spec is CC0 in intent. That only works if people build it. There are
          five concrete ways to help, below.
        </p>
        <p className="mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          If you only do one thing:{" "}
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            publish a piece of primary research to the canon
          </Link>
          . If you write code, the{" "}
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            open-source repos
          </a>{" "}
          are wide open to PRs.
        </p>

        <div className="carved-rule max-w-xs mt-10" />

        {/* The five ways, as numbered carved lines (mirrors /support's FundLine grid). */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Way
            n="01"
            title="primary research"
            body="Add an axiom, derivation, law, or first principle to the canon. Upload a PDF, it's pinned + minted, and every downstream citation pays you forever."
          />
          <Way
            n="02"
            title="open-source code"
            body="The site, the atlas, the gateway, feed402, and the MCP server are all MIT-licensed on GitHub. Good-first-issues and PRs are welcome."
          />
          <Way
            n="03"
            title="research tools"
            body="Add or improve one of the 20 free research instruments, or propose a new one through the tool framework. Real logic, real input, citeable output."
          />
          <Way
            n="04"
            title="sharpen the canon"
            body="Pick the branch you know cold — math, physics, chemistry, information, biophysics, cosmology, mind — and tighten what's there."
          />
          <Way
            n="05"
            title="cite & use"
            body="Use the open datasets in your own work and cite them. Real DOI, CC-BY-4.0 — the simplest contribution is to make the canon load-bearing."
          />
          <Way
            n="06"
            title="get in touch"
            body="Grants, partnerships, a research lead, or just questions — email us. We answer."
          />
        </div>

        {/* (1) Contribute primary research / claims to the canon */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          01 · contribute primary research
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              The canon holds only foundations — axioms, real math, laws,
              principles, primary derivations. Upload a PDF; it&rsquo;s pinned to
              Walrus and minted as a Story Protocol IP NFT, and every downstream
              citation routes a payment to <em>you</em>, the author, over the x402
              rail — forever. Reading is always free; only paid re-publication
              pays.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/research"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
              >
                publish to canon →
              </Link>
              <Link
                href="/canon"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                see the canon →
              </Link>
              <Link
                href="/cite-forever/v0.1"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                cite-forever license →
              </Link>
            </div>
          </div>
        </div>

        {/* (2) Contribute code — the open-source repos */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          02 · contribute code
        </h2>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          Everything Bucket runs on is open source under{" "}
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            github.com/bucket-foundation
          </a>
          . MIT-licensed. Good-first-issues are labelled; PRs welcome.
        </p>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {REPOS.map((r) => (
            <div key={r.name} className="bg-[color:var(--bone)] p-7 md:p-8">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
                  {r.name}
                </div>
                <span className="text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)] border border-[color:var(--hairline)] px-2 py-0.5">
                  MIT
                </span>
              </div>
              <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-3" />
              <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
                {r.blurb}
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
                >
                  repo ↗
                </a>
                <a
                  href={r.firstIssues}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
                >
                  good first issues ↗
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* (3) Add or improve a research tool */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          03 · add or improve a research tool
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              Twenty free instruments already run on bucket.foundation — protein
              stability, ADMET, RNA folding, ephys, cryo-EM triage, and
              literature/agent tools over live OpenAlex. Each is a small,
              self-contained module behind a common tool framework. Improve an
              existing one, or propose a new tool: a server runner, a typed I/O
              contract, and a stone-bone UI shell is all it takes.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/research/tools"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
              >
                see the 20 tools →
              </Link>
              <a
                href={REPOS[0].firstIssues}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                tool issues ↗
              </a>
            </div>
          </div>
        </div>

        {/* (4) Improve the canon — the 7 branches */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          04 · improve the canon
        </h2>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          The canon is organized into seven branches. Pick the one you know cold
          and tighten what&rsquo;s there — a missing derivation, a clearer
          statement of a law, a better primary source.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {CANON_BRANCHES.map((b) => (
            <Link
              key={b.slug}
              href={`/canon/${b.slug}`}
              className="inline-flex items-center gap-2 font-display uppercase text-[13px] tracking-[0.05em] px-4 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
            >
              <span className="text-[color:var(--gold-deep,var(--aegean-deep))]">
                {b.roman}
              </span>
              {b.name}
            </Link>
          ))}
        </div>

        {/* (5) Cite & use */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          05 · cite &amp; use
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              The single simplest contribution is to use the open datasets in
              your own work and cite them — that is what makes the canon
              load-bearing. The research-atlas corpus is {DATA_LICENSE} and born
              with a real DOI:{" "}
              <a
                href={ZENODO_DOI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                {ZENODO_DOI}
              </a>
              .
            </p>
            <code className="mt-4 block break-words text-[13px] bg-[color:var(--bone-2,var(--bone))] border border-[color:var(--hairline)] px-4 py-3 text-[color:var(--basalt)] select-all">
              {ATLAS_CITATION}
            </code>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/research/datasets"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                open datasets →
              </Link>
              <Link
                href="/research/atlas"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                the atlas →
              </Link>
              <a
                href={DATA_LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                {DATA_LICENSE} ↗
              </a>
            </div>
          </div>
        </div>

        {/* (6) Get in touch */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          06 · get in touch
        </h2>
        <div className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          <div className="bg-[color:var(--bone)] p-7 md:p-8">
            <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              Grants, partnerships, a research lead, or just questions — email{" "}
              {CONTACT_EMAIL}. If you&rsquo;d rather fund always-on hosting than
              write code, that&rsquo;s its own kind of contribution — see{" "}
              <Link
                href="/support"
                className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                support
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href={CONTRIBUTE_MAILTO}
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
              >
                email to contribute →
              </a>
              <Link
                href="/support"
                className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
              >
                fund instead →
              </Link>
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
          ). Contributions of code and research are CC-BY / MIT; nothing here
          gives anyone equity, because there is no equity.
        </p>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            research hub
          </Link>
          <Link
            href="/support"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            fund the instruments
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

function Way({ n, title, body }: { n: string; title: string; body: string }) {
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
