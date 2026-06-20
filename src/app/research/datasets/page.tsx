import Link from "next/link";
import Script from "next/script";
import {
  getManifest,
  listDatasets,
  datasetSlug,
  datasetTitle,
  datasetDescription,
  datasetEntityTypes,
  DATA_LICENSE,
  ATLAS_REPO,
  type AtlasDataset,
} from "@/lib/research-atlas";

// Open-data catalog. Reads the VENDORED research-atlas manifest
// (src/data/research-atlas-manifest.json, synced from the research-atlas repo by
// scripts/sync-research-atlas-manifest.mjs) at build time and lists every
// published dataset. research-atlas is the canonical research-economy graph
// (Funder→Grant→Organization→Person→Work→Field); each row carries provenance and
// an as_of timestamp, and each dataset is born citeable here. Stone-bone styling
// matches /research and /research/tools. See docs/research-tools/05-open-datasets.md.

export const metadata = {
  title: "Open datasets · research-atlas",
  description:
    "Every research-atlas dataset, free to read and priced-once to cite. The open research-economy graph: funders, grants, organizations, people, and fields.",
  alternates: { canonical: "/research/datasets" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/datasets",
    title: "Open datasets · research-atlas — bucket.foundation",
    description:
      "The open research-economy graph as datasets: funders, grants, organizations, people, and fields. Free to read, CC-BY-4.0, born with a real DOI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open datasets · research-atlas — bucket.foundation",
    description:
      "Funders, grants, organizations, people, fields — the open research-economy graph as CC-BY-4.0 datasets.",
  },
};

export default function Page() {
  const m = getManifest();
  const datasets = listDatasets();
  const totalRows = m.totals?.rows ?? datasets.reduce((s, d) => s + d.row_count, 0);

  // DataCatalog JSON-LD: the catalog + one Dataset node per published table.
  const catalogJsonLd = {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    "@id": "https://www.bucket.foundation/research/datasets#catalog",
    name: "research-atlas open datasets",
    url: "https://www.bucket.foundation/research/datasets",
    description:
      "The research-atlas research-economy graph published as open datasets — funders, grants, organizations, people, works, and fields.",
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: {
      "@type": ["NGO", "Organization"],
      name: "Bucket Foundation",
      url: "https://www.bucket.foundation",
    },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "DOI",
      value: "10.5281/zenodo.20774322",
    },
    dataset: datasets.map((d) => ({
      "@type": "Dataset",
      "@id": `https://www.bucket.foundation/research/datasets/${datasetSlug(d)}#dataset`,
      name: datasetTitle(d),
      url: `https://www.bucket.foundation/research/datasets/${datasetSlug(d)}`,
      description: datasetDescription(d),
      license: "https://creativecommons.org/licenses/by/4.0/",
      isAccessibleForFree: true,
      creator: {
        "@type": ["NGO", "Organization"],
        name: "Bucket Foundation",
        url: "https://www.bucket.foundation",
      },
      sameAs: ATLAS_REPO,
    })),
  };
  void DATA_LICENSE;

  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-datasets"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogJsonLd) }}
      />
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · open datasets
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          publish everything we{" "}
          <span className="inlay-gold">research.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          research-atlas is the canonical, normalized graph of the global
          research economy — funders, grants, organizations, people, and fields,
          every row carrying provenance and a fetch timestamp. Each table is
          published here as an open dataset: free to read, priced-once to cite
          over feed402/x402, and born with a real DOI (via Zenodo) so it is
          citeable forever.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <span>
            {datasets.length} datasets · {totalRows.toLocaleString()} rows
          </span>
          <span>schema v{m.schema_version}</span>
          <span>license {m.license}</span>
          <span>generated {m.generated_at.slice(0, 10)}</span>
        </div>

        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          {datasets.map((d) => (
            <DatasetCard key={d.table} d={d} />
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <a
            href="/api/research/datasets"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            datasets api (feed402/0.2)
          </a>
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            publish · cite · be cited
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

function DatasetCard({ d }: { d: AtlasDataset }) {
  const inner = (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[200px] h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="flex items-center justify-between">
        <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
          {datasetTitle(d)}
        </div>
        <span className="text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          {d.kind} · {d.row_count.toLocaleString()} rows
        </span>
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {datasetDescription(d)}
      </p>
      <div className="flex flex-wrap gap-2 mt-1">
        {datasetEntityTypes(d).map((e) => (
          <span
            key={e}
            className="text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-2)] border border-[color:var(--hairline)] px-2 py-0.5"
          >
            {e}
          </span>
        ))}
      </div>
      <div className="mt-auto pt-3 flex items-center justify-between text-[11px] small-caps tracking-[0.14em]">
        <span className="text-[color:var(--basalt-3)]">
          {d.sources.join(", ")} · as of {d.as_of.slice(0, 10)}
        </span>
        <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
          open dataset →
        </span>
      </div>
    </div>
  );

  return (
    <Link href={`/research/datasets/${datasetSlug(d)}`} className="block h-full">
      {inner}
    </Link>
  );
}
