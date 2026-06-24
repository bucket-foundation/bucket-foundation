import Link from "next/link";
import Script from "next/script";
import { getManifest } from "@/lib/research-atlas";
import AtlasExplorer from "./AtlasExplorer";

// /research/atlas — describes the research-atlas graph: the reconciled, normalized
// graph of the global research economy. Headline scale, the DOI, the GitHub link,
// links to the open-datasets catalog, and a clearly-marked PLACEHOLDER "query the
// atlas" panel for the future live API. Stone-bone styling.

export const metadata = {
  title: "research-atlas · the research-economy graph",
  description:
    "research-atlas reconciles the world's public research funding into one normalized graph: 73 funders, ~958k grants, ~$658B, ~8.1M rows. Open, citeable, reproducible.",
  alternates: { canonical: "/research/atlas" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/atlas",
    title: "research-atlas · the open research-economy graph",
    description:
      "One reconciled graph of the world's public research funding: 73 funders, ~958k grants, ~$658B, ~8.1M rows. Open, citeable, reproducible.",
  },
  twitter: {
    card: "summary_large_image",
    title: "research-atlas · the open research-economy graph",
    description:
      "73 funders · ~958k grants · ~$658B · ~8.1M rows. The open, citeable research-economy graph.",
  },
};

// The full published graph (see github.com/bucket-foundation/research-atlas
// README). The datasets catalog ships a sampled manifest; these are the
// full-corpus headline figures.
const ATLAS = {
  funders: "73",
  grants: "~958k",
  organizations: "~140.6k",
  people: "~1.22M",
  funded: "~$658B",
  rows: "~8.1M",
  doi: "10.5281/zenodo.20774322",
  doiUrl: "https://doi.org/10.5281/zenodo.20774322",
  github: "https://github.com/bucket-foundation/research-atlas",
};

const ENTITIES = [
  { name: "Funder", body: "NIH (+ awarding IC), NSF, EC/ERC, UKRI, Gates, Wellcome, Sloan, DFG — 73 in all." },
  { name: "Grant", body: "Every award record, USD-normalized with a stamped FX date and full provenance." },
  { name: "Organization", body: "Recipient institutions, merged to one canonical node per ROR id." },
  { name: "Person", body: "Investigators, keyed on ORCID where available (61% coverage)." },
  { name: "Work", body: "Research outputs that acknowledge a funder, linked via OpenAlex." },
  { name: "Field", body: "The OpenAlex topic taxonomy, joined to works by work_field edges." },
];

// schema.org Dataset JSON-LD for the research-atlas graph.
const ATLAS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  "@id": "https://www.bucket.foundation/research/atlas#dataset",
  name: "research-atlas — the global research-economy graph",
  url: "https://www.bucket.foundation/research/atlas",
  description:
    "A reconciled, normalized graph of the world's public research funding: 73 funders, ~958k grants, ~$658B awarded, ~8.1M rows across funders, grants, organizations, people, works, and fields. Entities merged on ROR/ORCID/DOI; outputs linked via OpenAlex acknowledgements.",
  creator: {
    "@type": ["NGO", "Organization"],
    name: "Bucket Foundation",
    url: "https://www.bucket.foundation",
  },
  license: "https://creativecommons.org/licenses/by/4.0/",
  isAccessibleForFree: true,
  keywords: [
    "research funding",
    "grants",
    "NIH",
    "NSF",
    "European Commission",
    "UKRI",
    "OpenAlex",
    "ROR",
    "ORCID",
    "open science",
  ],
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: ATLAS.doi,
  },
  sameAs: [ATLAS.doiUrl, ATLAS.github],
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/vnd.apache.parquet",
      contentUrl: ATLAS.github,
    },
  ],
};

export default function Page() {
  const m = getManifest();
  const sampleRows = m.totals?.rows ?? 0;
  const sampleTables = m.totals?.tables ?? 0;

  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-atlas"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ATLAS_JSON_LD) }}
      />
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · the atlas
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          map the research{" "}
          <span className="inlay-gold">economy.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          research-atlas reconciles the world&rsquo;s public research funding into
          one normalized graph — funders, grants, organizations, people, works and
          fields — keyed on global identifiers (ROR for orgs, ORCID for people,
          OpenAlex/DOI for works), with full provenance on every row. It is the
          graph the funding-landscape paper is built on, and the source of every
          open dataset on Bucket.
        </p>

        {/* Headline scale */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Stat label="funders" value={ATLAS.funders} />
          <Stat label="grants" value={ATLAS.grants} />
          <Stat label="funded (USD)" value={ATLAS.funded} />
          <Stat label="organizations" value={ATLAS.organizations} />
          <Stat label="people" value={ATLAS.people} />
          <Stat label="graph rows" value={ATLAS.rows} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href={ATLAS.doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            DOI ↗
          </a>
          <a
            href={ATLAS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
          >
            code + data on github ↗
          </a>
          <Link
            href="/research/datasets"
            className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            browse the {sampleTables} open datasets
          </Link>
        </div>

        <div className="carved-rule max-w-xs mt-12" />

        {/* The six entities */}
        <h2 className="mt-12 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          six entities, one graph
        </h2>
        <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Funder → Grant → Organization → Person → Work → Field, joined by
          directed edges (grant_work, person_org, work_field, …). The graph passes
          36/36 referential-integrity checks with zero orphan edges.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          {ENTITIES.map((e) => (
            <div
              key={e.name}
              className="bg-[color:var(--bone)] p-6 md:p-7 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
            >
              <div className="font-display uppercase text-[16px] tracking-[0.05em] text-[color:var(--basalt)]">
                {e.name}
              </div>
              <div className="w-7 h-0.5 bg-[color:var(--gold)] mt-2.5" />
              <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
                {e.body}
              </p>
            </div>
          ))}
        </div>

        {/* Query panel — LIVE interactive explorer */}
        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">
          query the atlas
        </h2>
        <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Explore the live graph — search a funder, field, or organization and
          read its portfolio straight from the read-only query API. Ask &ldquo;who
          funds CRISPR?&rdquo; (search <em>crispr</em>, pick the field) and get the
          top funders + most-cited works, cited to DOI. Funder / org / field /
          aggregate level only — no personal data.
        </p>

        <AtlasExplorer />

        <p className="mt-5 text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">
          The full graph is also available as open datasets (a{" "}
          {sampleRows.toLocaleString()}-row sample manifest is published now) and
          as the reproducible pipeline on GitHub.
        </p>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/papers/funding-landscape"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the funding-landscape paper
          </Link>
          <Link
            href="/research/datasets"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            open datasets
          </Link>
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            research tools
          </Link>
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            research hub
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--bone)] p-6 md:p-7 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="font-display text-[clamp(1.5rem,3.5vw,2.4rem)] leading-none text-[color:var(--basalt)]">
        {value}
      </div>
      <div className="mt-2 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
        {label}
      </div>
    </div>
  );
}
