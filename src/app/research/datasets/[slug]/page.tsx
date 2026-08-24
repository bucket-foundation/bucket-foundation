import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import {
  listDatasets,
  getDatasetBySlug,
  datasetSlug,
  datasetTitle,
  datasetDescription,
  datasetEntityTypes,
  datasetDownload,
  datasetCitation,
  datasetCiteBlock,
  datasetProvenance,
  DATA_LICENSE,
  ATLAS_REPO,
  type AtlasDataset,
} from "@/lib/research-atlas";

const SITE = "https://www.bucket.foundation";

// Dataset detail page. Reads the vendored research-atlas manifest at build time
// and renders: description, schema (columns), provenance, row counts, a DOWNLOAD
// link (parquet, CSV is a TODO seam), and a CITE block reusing the existing
// feed402/cite-forever envelope shape (so each dataset is born citeable). The
// model: free-to-read, paid-to-cite over feed402/x402, with a real DOI (via
// Zenodo) for permanence, NO blockchain, NO Story Protocol, NO IP-NFT.
// Stone-bone styling matches /research. See docs/research-tools/05-open-datasets.md.

// Statically pre-render one page per published dataset.
export function generateStaticParams() {
  return listDatasets().map((d) => ({ slug: datasetSlug(d) }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const d = getDatasetBySlug(params.slug);
  if (!d) return { title: "Dataset not found" };
  const description = datasetDescription(d);
  return {
    title: `${datasetTitle(d)} · research-atlas dataset`,
    description,
    alternates: { canonical: `/research/datasets/${datasetSlug(d)}` },
    openGraph: {
      type: "website" as const,
      url: `${SITE}/research/datasets/${datasetSlug(d)}`,
      title: `${datasetTitle(d)} · research-atlas dataset`,
      description,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${datasetTitle(d)} · research-atlas dataset`,
      description,
    },
  };
}

// Per-dataset schema.org Dataset JSON-LD.
function datasetJsonLd(d: AtlasDataset) {
  const dl = datasetDownload(d);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${SITE}/research/datasets/${datasetSlug(d)}#dataset`,
    name: datasetTitle(d),
    url: `${SITE}/research/datasets/${datasetSlug(d)}`,
    description: datasetDescription(d),
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    creator: {
      "@type": ["NGO", "Organization"],
      name: "Bucket Foundation",
      url: SITE,
    },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "DOI",
      value: "10.5281/zenodo.20774322",
    },
    sameAs: [ATLAS_REPO, "https://doi.org/10.5281/zenodo.20774322"],
    variableMeasured: d.columns,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/vnd.apache.parquet",
        contentUrl: dl.parquet_url,
      },
    ],
  };
}

// Per-column documentation pulled from research-atlas/docs/SCHEMA.md. Provenance
// columns are shared by every table; entity/edge specifics are layered on top.
const COMMON_COLS: Record<string, string> = {
  atlas_id: "Stable surrogate key, derived deterministically from the most-stable identifier (ROR/ORCID/DOI/OpenAlex/Crossref Funder id, else source+source_id).",
  source: "Short source key (nsf, openalex, nih, cordis, …).",
  source_id: "The record's id in that source's own namespace.",
  source_url: "Canonical, citeable URL to the record at the source — the per-fact attribution chain.",
  as_of: "ISO-8601 UTC timestamp the row was fetched / normalized.",
  src_id: "Edge tail — the atlas_id of the source entity.",
  dst_id: "Edge head — the atlas_id of the destination entity.",
  role: "Canonical relationship role (awarder, recipient, host, pi, co-pi, program-officer, acknowledges, affiliation, …).",
  score: "Edge weight (e.g. work→field topic score).",
};

const COL_DOCS: Record<string, string> = {
  name: "Display name.",
  short_name: "Abbreviated name.",
  country_code: "ISO country code.",
  funder_type: "government / private / nonprofit / corporate / supranational.",
  ror_id: "Research Organization Registry id where resolvable.",
  crossref_funder_id: "Crossref Funder Registry id.",
  homepage: "Canonical homepage URL.",
  title: "Title of the grant / work.",
  abstract: "Free-text abstract.",
  amount_original: "Award amount in the original currency.",
  currency: "ISO-4217 currency of amount_original.",
  amount_usd: "Normalized USD amount (null when unknown — never a silent 0).",
  fx_rate_to_usd: "FX rate used for the USD conversion (1.0 for USD-native sources).",
  fx_as_of: "Date of the FX rate used.",
  start_date: "Grant start date.",
  end_date: "Grant end date.",
  status: "active / completed / terminated / unknown.",
  program: "Funding program the grant belongs to.",
  city: "Organization city.",
  region: "Organization region/state.",
  org_type: "education / government / company / nonprofit / facility / other.",
  lat: "Latitude.",
  lon: "Longitude.",
  full_name: "Person's full name.",
  first_name: "Given name.",
  last_name: "Family name.",
  orcid: "ORCID iD where resolvable.",
  openalex_author_id: "OpenAlex author id.",
  openalex_id: "OpenAlex topic/work id.",
  level: "topic / subfield / field / domain.",
  parent_atlas_id: "Parent field's atlas_id in the topic hierarchy.",
};

function colDoc(col: string): string {
  return COMMON_COLS[col] ?? COL_DOCS[col] ?? "—";
}

export default function Page({ params }: { params: { slug: string } }) {
  const d = getDatasetBySlug(params.slug);
  if (!d) notFound();

  const download = datasetDownload(d);
  const citation = datasetCitation(d);
  const cite = datasetCiteBlock();
  const provenance = datasetProvenance(d);

  // The feed402/0.2 envelope shape this dataset is born with, shown verbatim so
  // a publisher can copy it. Identical structure to /api/research's envelope.
  const envelope = {
    data: {
      dataset: d.table,
      kind: d.kind,
      title: datasetTitle(d),
      row_count: d.row_count,
      columns: d.columns,
    },
    citation,
    receipt: {
      tier: "raw",
      status: "open_dataset",
      price_usd: 0,
      paid_by: "bucket-foundation (open data, CC-BY-4.0; reader pays nothing)",
    },
    cite,
    provenance,
    canon_tier: "candidate",
  };

  return (
    <main className="stone-bone relative grain">
      <Script
        id={`ld-dataset-${datasetSlug(d)}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd(d)) }}
      />
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/datasets"
            className="hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            § Research · open datasets
          </Link>{" "}
          / {d.table}
        </div>

        <h1 className="font-display uppercase text-[clamp(1.8rem,4.5vw,3.25rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          {datasetTitle(d)}{" "}
          <span className="inlay-gold">dataset.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          {datasetDescription(d)}
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <span>{d.kind}</span>
          <span>{d.row_count.toLocaleString()} rows</span>
          <span>schema v{d.schema_version}</span>
          <span>license {DATA_LICENSE}</span>
          <span>as of {d.as_of.slice(0, 10)}</span>
          <span>sources: {d.sources.join(", ")}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {datasetEntityTypes(d).map((e) => (
            <span
              key={e}
              className="text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-2)] border border-[color:var(--hairline)] px-2 py-0.5"
            >
              {e}
            </span>
          ))}
        </div>

        <div className="carved-rule max-w-xs mt-10" />

        {/* DOWNLOAD */}
        <Section n="01" title="download">
          <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)] mb-4">
            The canonical artifact is a content-addressable parquet committed in
            the research-atlas repo. Free to read; priced-once to cite (below).
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <a
              href={download.parquet_url}
              className="inline-block bg-[color:var(--basalt)] text-[color:var(--bone)] px-5 py-2.5 text-[12px] small-caps tracking-[0.14em] hover:bg-[color:var(--basalt-2)]"
            >
              download parquet ↓
            </a>
            {/* TODO(publish): generate + host a CSV mirror alongside the parquet. */}
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              csv mirror — coming soon
            </span>
            <a
              href={ATLAS_REPO}
              className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              source repo →
            </a>
          </div>
          <p className="mt-4 text-[12px] leading-[1.6] text-[color:var(--basalt-3)] font-mono break-all">
            {d.path}
          </p>
          {/* TODO(publish): replace the GitHub-raw parquet with a hosted,
 content-addressed release that gets a real DOI via Zenodo once the
 dataset hosting layer is built. No blockchain involved. */}
        </Section>

        {/* SCHEMA */}
        <Section n="02" title="schema">
          <div className="border border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
            {d.columns.map((c) => (
              <div
                key={c}
                className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-x-6 gap-y-1 px-4 py-3"
              >
                <code className="text-[13px] text-[color:var(--basalt)] font-mono">
                  {c}
                </code>
                <span className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
                  {colDoc(c)}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* PROVENANCE */}
        <Section n="03" title="provenance">
          <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)] mb-4">
            Every row carries its own <code className="font-mono">source</code>,{" "}
            <code className="font-mono">source_id</code>,{" "}
            <code className="font-mono">source_url</code>, and{" "}
            <code className="font-mono">as_of</code> — a per-fact attribution
            chain back to the original record. The dataset itself was produced by
            this pipeline:
          </p>
          <ol className="border border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
            {provenance.map((p, i) => (
              <li
                key={i}
                className="px-4 py-3 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-x-6"
              >
                <span className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--basalt)]">
                  {p.action}
                </span>
                <span className="text-[12px] leading-[1.6] text-[color:var(--basalt-2)] font-mono break-all">
                  {p.by} · {p.via} · {p.at}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* CITE */}
        <Section n="04" title="cite — born citeable">
          <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)] mb-4">
            This dataset ships the same feed402/0.2 envelope the rest of
            bucket.foundation speaks. Reading and citing it costs nothing; the{" "}
            <code className="font-mono">cite</code> block is passive,
            forward-looking license metadata describing what a downstream{" "}
            <em>publisher</em> would owe to re-publish it in a paid work.
          </p>
          <pre className="text-[12px] leading-[1.55] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] p-5 overflow-x-auto font-mono shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
{JSON.stringify(envelope, null, 2)}
          </pre>
          <p className="mt-4 text-[12px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            queryable at{" "}
            <a
              href={`/api/research/datasets?dataset=${d.table}`}
              className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              /api/research/datasets?dataset={d.table}
            </a>
          </p>
        </Section>

        {/* DOI, permanence seam (Zenodo; no blockchain) */}
        <Section n="05" title="doi — be cited forever (seam)">
          <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            For permanent, scholarly-citeable identity, a published dataset gets a
            real <strong>DOI via Zenodo</strong> — the content-addressed parquet is
            deposited and the DOI is recorded alongside its feed402/0.2
            cite-forever block. Reading and citing stay free; citation fees flow to
            the dataset&rsquo;s authors over feed402/x402. There is{" "}
            <strong>no blockchain, no Story Protocol, no IP-NFT</strong> — just a
            DOI and the open cite-forever envelope. No wallet is ever required to
            read, download, or cite.
          </p>
          {/* TODO(publish): deposit the content-addressed parquet to Zenodo, mint
 a real DOI, and record it in gdrive bucket-canon CANON_INDEX.md
 alongside the feed402/0.2 cite block. Citation fees route to the
 dataset's authors over feed402/x402. No wallet, no chain, a DOI +
 the open cite-forever envelope is the whole permanence story.
 See research-atlas/docs/ARCHITECTURE.md §"Publish-to-Bucket seam" (2). */}
          <div className="mt-4 inline-block border border-dashed border-[color:var(--hairline)] px-5 py-2.5 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            register doi — seam (zenodo + feed402 cite-forever; no wallet, no chain)
          </div>
        </Section>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/datasets"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            ← all datasets
          </Link>
          <Link
            href="/cite-forever/v0.1"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            cite-forever v0.1 license
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="font-display text-[22px] text-[color:var(--basalt-3)] leading-none">
          {n}
        </span>
        <div className="w-6 h-0.5 bg-[color:var(--gold)] self-center" />
        <h2 className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
