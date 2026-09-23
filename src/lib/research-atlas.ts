import manifestJson from "@/data/research-atlas-manifest.json";

export type AtlasDataset = {
  table: string;
  kind: "entity" | "edge";
  path: string;
  schema_version: string;
  row_count: number;
  columns: string[];
  sources: string[];
  as_of: string;
};

export type AtlasManifest = {
  _vendored?: {
    source_repo: string;
    source_path: string;
    synced_at: string;
    note?: string;
  };
  name: string;
  description: string;
  schema_version: string;
  generated_at: string;
  license: string;
  publisher: string;
  datasets: AtlasDataset[];
  totals?: { tables: number; rows: number };
};

const manifest = manifestJson as AtlasManifest;

export function getManifest(): AtlasManifest {
  return manifest;
}

export function datasetSlug(d: AtlasDataset): string {
  return d.table.replace(/_/g, "-");
}

export function getDatasetBySlug(slug: string): AtlasDataset | null {
  const table = slug.replace(/-/g, "_");
  return manifest.datasets.find((d) => d.table === table) ?? null;
}

export function listDatasets(): AtlasDataset[] {
  const order = (k: AtlasDataset["kind"]) => (k === "entity" ? 0 : 1);
  return [...manifest.datasets].sort(
    (a, b) => order(a.kind) - order(b.kind) || a.table.localeCompare(b.table),
  );
}

const TITLES: Record<string, string> = {
  funder: "Funders",
  grant: "Grants / Awards",
  organization: "Organizations",
  person: "People",
  field: "Fields / Topics",
  work: "Works / Outputs",
  funder_grant: "Funder → Grant",
  grant_org: "Grant → Organization",
  grant_person: "Grant → Person",
  grant_work: "Grant → Work",
  person_org: "Person → Organization",
  work_field: "Work → Field",
};

export function datasetTitle(d: AtlasDataset): string {
  return TITLES[d.table] ?? d.table;
}

const DESCRIPTIONS: Record<string, string> = {
  funder:
    "Funding bodies — government, private, nonprofit, corporate, supranational. Keyed on Crossref Funder id / ROR where resolvable.",
  grant:
    "Grants and awards with original-currency and normalized USD amounts, dates, status, and program. Unknown money is null, never a silent zero.",
  organization:
    "Research organizations — universities, labs, companies, facilities. Keyed on ROR where resolvable, with geocoordinates where available.",
  person:
    "Researchers — PIs, co-PIs, program officers. Keyed on ORCID where resolvable, linked to OpenAlex author ids.",
  field:
    "Fields and topics from the OpenAlex topic hierarchy (topic / subfield / field / domain), with parent links.",
  work: "Research outputs — papers and other works, keyed on OpenAlex id / DOI, with citation counts and open-access status.",
  funder_grant: "Directed edge: a funder awarded a grant (role-typed, provenance-bearing).",
  grant_org: "Directed edge: a grant's recipient / host organization.",
  grant_person: "Directed edge: a grant's PI / co-PI / program officer.",
  grant_work: "Directed edge: a work acknowledges a grant's funding.",
  person_org: "Directed edge: a person's affiliation with an organization.",
  work_field: "Directed edge: a work belongs to a field/topic (scored).",
};

export function datasetDescription(d: AtlasDataset): string {
  return (
    DESCRIPTIONS[d.table] ??
    `${d.kind === "edge" ? "Directed edge" : "Entity"} table from the research-atlas graph.`
  );
}

export function datasetEntityTypes(d: AtlasDataset): string[] {
  if (d.kind === "entity") return [datasetTitle(d)];
  const map: Record<string, string> = {
    funder: "Funder",
    grant: "Grant",
    org: "Organization",
    person: "Person",
    work: "Work",
    field: "Field",
  };
  return d.table.split("_").map((p) => map[p] ?? p);
}

export const ATLAS_REPO = "https://github.com/bucket-foundation/research-atlas";
export const ATLAS_RAW_BASE =
  "https://raw.githubusercontent.com/bucket-foundation/research-atlas/main";

export function datasetDownload(d: AtlasDataset): {
  parquet_url: string;
  csv_url: string | null;
} {
  return {
    parquet_url: `${ATLAS_RAW_BASE}/${d.path}`,
    csv_url: null,
  };
}

export const CITE_LICENSE = "bucket.foundation/cite-forever/v0.1";
export const DATA_LICENSE = "CC-BY-4.0";
export const PAYOUT_WALLET =
  process.env.BUCKET_PAYOUT_WALLET ??
  "0xa91115B1AB8412f380Fd62446F523559F668b96B";

export const DATASET_CITE_PRICE_USD = 0.05;

export function datasetCitation(d: AtlasDataset, now = new Date().toISOString()) {
  const slug = datasetSlug(d);
  return {
    type: "source" as const,
    source_id: `research-atlas:${d.table}@${d.schema_version}`,
    provider: "bucket-foundation",
    dataset: "research-atlas",
    retrieved_at: now,
    license: DATA_LICENSE,
    canonical_url: `https://www.bucket.foundation/research/datasets/${slug}`,
    download_url: datasetDownload(d).parquet_url,
    title: `research-atlas — ${datasetTitle(d)} (${d.table})`,
    as_of: d.as_of,
    schema_version: d.schema_version,
    row_count: d.row_count,
    sources: d.sources,
  };
}

export function datasetCiteBlock() {
  return {
    applies_to: "downstream_republication_in_a_paid_work",
    reader_owes: 0,
    price_usd: DATASET_CITE_PRICE_USD,
    payout_wallet: PAYOUT_WALLET,
    license: CITE_LICENSE,
  };
}

export function datasetProvenance(d: AtlasDataset) {
  return [
    {
      action: "published",
      at: manifest.generated_at,
      by: `research-atlas/${manifest.schema_version}`,
      via: "data/MANIFEST.json",
    },
    {
      action: "vendored",
      at: manifest._vendored?.synced_at ?? manifest.generated_at,
      by: "bucket-foundation/sync-research-atlas-manifest",
      via: manifest._vendored?.source_repo ?? "research-atlas",
    },
    {
      action: "cataloged",
      at: new Date().toISOString(),
      by: "bucket-foundation/research-datasets",
      via: `data/processed: ${d.path}`,
    },
  ];
}
