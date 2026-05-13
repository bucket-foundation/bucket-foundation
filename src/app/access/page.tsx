// /access — single source of truth for "how do I use bucket.foundation?"
// Maps every surface: website routes, GitHub repos, MCP server, API,
// research drive. No confusion.

import Link from "next/link";

export const metadata = {
  title: "Access · bucket.foundation",
  description: "Where everything lives — website routes, GitHub repos, MCP server, API. One map for end users, researchers, and AI agents.",
};
export const dynamic = "force-static";

const WEB_ROUTES = [
  { path: "/canon",                 what: "7-branch grid + interactive globe — entry point" },
  { path: "/canon/search",          what: "Type a question, get ranked claim cards" },
  { path: "/canon/claims",          what: "All 599 curated claim cards" },
  { path: "/canon/bridges",         what: "17 multi-branch primitives (cross-domain isomorphisms)" },
  { path: "/canon/graph",           what: "Knowledge graph: 1,133 nodes, PageRank rankings" },
  { path: "/canon/timeline",        what: "Globe through time: 50 events 570 BCE → 2020 CE" },
  { path: "/canon/[branch]",        what: "Per-branch page (e.g. /canon/physics)" },
  { path: "/protocol",              what: "x402 paid-once-cite-forever spec" },
  { path: "/cite-forever/v0.1",     what: "Citation license" },
  { path: "/manifesto",             what: "Why bucket exists" },
  { path: "/governance",            what: "Nonprofit governance + COI disclosure" },
];

const API_ROUTES = [
  {
    path: "/api/canon/search",
    what: "Search canon claims by query",
    example: "/api/canon/search?q=consciousness&top_k=5",
  },
  {
    path: "/api/research",
    what: "Paid x402 research over feed402 (PubMed/Semantic Scholar)",
    example: "/api/research?q=mitochondrial+function&tier=insight",
  },
  {
    path: "/llms.txt",
    what: "Playbook for AI agents (the LLM-readable spec)",
    example: "/llms.txt",
  },
  {
    path: "/.well-known/feed402.json",
    what: "feed402 discovery manifest",
    example: "/.well-known/feed402.json",
  },
  {
    path: "/.well-known/mcp.json",
    what: "MCP server manifest",
    example: "/.well-known/mcp.json",
  },
];

const REPOS = [
  {
    name: "bucket-foundation/bucket-foundation",
    url: "https://github.com/bucket-foundation/bucket-foundation",
    role: "Main site + canon data + tools",
    contents: "The Next.js app you're using. Canon claim cards (bucket-canon/), detected bridges (bucket-canon/_bridges/), embeddings + trained ML artifacts (_intake/), MCP server (mcp-server/), pipeline tools.",
  },
  {
    name: "AGFarms/x402-research-gateway",
    url: "https://github.com/AGFarms/x402-research-gateway",
    role: "Upstream feed402 gateway (the rail)",
    contents: "The x402-protected research API behind /api/research. PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, Kruse corpus. feed402/0.2 compliant.",
  },
];

const AGENT_INTEGRATIONS = [
  {
    title: "Claude Code · Claude Desktop · any MCP client",
    desc: "One MCP server, seven tools. Connects local canon files AND the bucket.foundation research API in one server. (Previously split across two repos — consolidated.)",
    options: [
      {
        name: "bucket-mcp",
        what: "Tools: canon_search · canon_get_claim · canon_list_branches · canon_list_bridges · canon_get_bridge · bucket_research · bucket_cite",
        install: "# 1. clone the repo (one time)\ngit clone https://github.com/bucket-foundation/bucket-foundation\n\n# 2. register the MCP server\nclaude mcp add --scope user --transport stdio bucket \\\n  -- python3 $(pwd)/bucket-foundation/mcp-server/bucket-mcp.py",
      },
    ],
  },
];

export default function AccessPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p className="mb-4 text-xs uppercase tracking-[0.22em]"
           style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          Access · how to use bucket.foundation
        </p>
        <h1 className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
          One canon. Many surfaces.
        </h1>
        <p className="mt-4 max-w-2xl text-lg"
           style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
          Bucket exists in three layers — a website (this page), an open
          protocol (the x402 rail), and four GitHub repos (the source).
          End users read the canon. Researchers cite it. AI agents query
          it. Everyone accesses the same data.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          1 · Website (humans)
        </h2>
        <div className="space-y-2">
          {WEB_ROUTES.map((r) => (
            <Link key={r.path} href={r.path}
                  className="flex items-baseline gap-4 rounded-md border border-[color:var(--hairline)] p-4 transition hover:border-[color:var(--gold)]">
              <code className="text-sm flex-shrink-0 w-44 truncate"
                    style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
                {r.path}
              </code>
              <span className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
                {r.what}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          2 · API (AI agents · scripts · downstream tools)
        </h2>
        <div className="space-y-2">
          {API_ROUTES.map((r) => (
            <div key={r.path}
                 className="rounded-md border border-[color:var(--hairline)] p-4">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <code className="text-sm" style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
                  {r.path}
                </code>
                <a href={r.example} target="_blank" rel="noreferrer"
                   className="text-xs uppercase tracking-[0.16em] hover:text-[color:var(--gold)]"
                   style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                  try ↗
                </a>
              </div>
              <p className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
                {r.what}
              </p>
              <code className="block mt-2 text-xs truncate"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                {r.example}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          3 · MCP servers (Claude Desktop · Claude Code · any MCP client)
        </h2>
        {AGENT_INTEGRATIONS.map((g) => (
          <div key={g.title} className="mb-6">
            <p className="mb-3 text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              {g.desc}
            </p>
            <div className="space-y-3">
              {g.options.map((o) => (
                <div key={o.name}
                     className="rounded-md border border-[color:var(--hairline)] p-4">
                  <div className="text-sm mb-1" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
                    {o.name}
                  </div>
                  <p className="text-xs mb-2"
                     style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
                    {o.what}
                  </p>
                  <pre className="text-xs overflow-x-auto rounded bg-black/5 p-3"
                       style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {o.install}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          4 · GitHub (source · contribute · fork)
        </h2>
        <p className="mb-6 text-sm"
           style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
          The GitHub org is <a href="https://github.com/bucket-foundation"
          className="underline hover:text-[color:var(--gold)]"
          target="_blank" rel="noreferrer">github.com/bucket-foundation</a>.
          Three repos in that org, plus one upstream gateway in the AGFarms org.
        </p>
        <div className="space-y-3">
          {REPOS.map((r) => (
            <a key={r.name} href={r.url}
               target="_blank" rel="noreferrer"
               className="block rounded-md border border-[color:var(--hairline)] p-4 transition hover:border-[color:var(--gold)]">
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <code className="text-sm" style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
                  {r.name}
                </code>
                <span className="text-xs"
                      style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                  github ↗
                </span>
              </div>
              <p className="text-sm mb-1" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
                {r.role}
              </p>
              <p className="text-sm"
                 style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
                {r.contents}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          5 · Research drive (PDFs · raw data · mirror)
        </h2>
        <a href="https://drive.google.com/open?id=12QjkHYFqzVNm30kvkW-upi0kqa_Kri2B"
           target="_blank" rel="noreferrer"
           className="block rounded-md border border-[color:var(--hairline)] p-4 transition hover:border-[color:var(--gold)]">
          <div className="text-sm mb-1" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
            BucketDrive
          </div>
          <p className="text-sm"
             style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
            Public Google Drive folder mirroring <code>bucket-research</code> repo.
            PDFs (which don&apos;t belong in git), large datasets, Figma exports,
            scanned manuscripts. Same canon-branch tree as the repo.
          </p>
        </a>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
          Quickstart by role
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[color:var(--hairline)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] mb-2"
               style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
              Reader
            </p>
            <p className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              Start at <Link href="/canon" className="underline">/canon</Link>.
              The 7-branch globe is the map. Click any branch, browse claims.
              Try <Link href="/canon/search" className="underline">search</Link>{" "}
              for a specific question.
            </p>
          </div>
          <div className="rounded-md border border-[color:var(--hairline)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] mb-2"
               style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
              Researcher
            </p>
            <p className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              Clone <code>bucket-foundation/bucket-foundation</code>. The
              canon claims live in <code>bucket-canon/</code>. The data
              pipeline is in <code>_intake/</code>. See{" "}
              <a href="https://github.com/bucket-foundation/bucket-foundation/blob/main/REPRODUCE.md"
                 className="underline" target="_blank" rel="noreferrer">
                REPRODUCE.md
              </a>.
            </p>
          </div>
          <div className="rounded-md border border-[color:var(--hairline)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] mb-2"
               style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
              AI agent
            </p>
            <p className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              Read <a href="/llms.txt" target="_blank" rel="noreferrer" className="underline">/llms.txt</a>.
              Hit <code>/api/canon/search</code> or{" "}
              <code>/api/research</code>. Or install the MCP server.
              No wallet, no key, no auth — anonymous rate-limit only.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
