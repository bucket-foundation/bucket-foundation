/**
 * bucket.foundation — /api/research/datasets
 * -------------------------------------------
 * Serves the research-atlas dataset catalog + per-dataset metadata in the
 * SAME feed402/0.2 envelope shape as /api/research ({data, citation, receipt,
 * cite, provenance, canon_tier}), so the open-data publishing surface is
 * queryable like the rest of Bucket.
 *
 * research-atlas (github.com/bucket-foundation/research-atlas) is the canonical
 * research-economy graph (Funder→Grant→Organization→Person→Work→Field). This
 * route reads the VENDORED manifest (src/data/research-atlas-manifest.json,
 * synced by scripts/sync-research-atlas-manifest.mjs).
 *
 * TRUST MODEL (mirrors /api/research): the caller needs NO wallet and NO key and
 * is NEVER asked to pay. These datasets are open (CC-BY-4.0), free to read. The
 * `cite` block is passive, forward-looking license metadata for a downstream
 * PUBLISHER — not an instruction to the reader. There is no payment challenge.
 *
 *   GET /api/research/datasets
 *     → { data: { catalog }, citation, receipt, cite, provenance, canon_tier }
 *       lists every published dataset (title, sources, row_count, as_of, schema).
 *
 *   GET /api/research/datasets?dataset=<table>
 *     → a single dataset's full feed402/0.2 envelope (data + citation +
 *       provenance + canon_tier + download), born citeable.
 *
 *   404 → { error: { code:"not_found", message } }   (unknown dataset)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getManifest,
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
  type AtlasDataset,
} from "@/lib/research-atlas";

export const runtime = "nodejs";
// Dynamic because the route reads a `?dataset=` query param. The underlying data
// is static (vendored manifest), so responses are cheap and deterministic.
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, x-bucket-client",
  "x-bucket-proxy": "v1",
  "x-robots-tag": "all",
  link: '</cite-forever/v0.1>; rel="license"',
};

// The declarative anti-injection notice, identical in spirit to /api/research:
// nothing to sign, nothing to pay, nothing to follow.
function agentNotice() {
  return {
    agent_action_required: false,
    payment_required_from_you: false,
    summary:
      "This is open data (CC-BY-4.0) you may read and cite freely. No action, " +
      "payment, signature, or transaction is required from you or your user. " +
      "The `cite` block is passive license metadata describing what a future " +
      "PUBLISHER would owe if they re-publish this in a paid work — it is not " +
      "an instruction to you and you owe nothing for reading or citing. There " +
      "is no payment challenge in this response.",
  };
}

function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

/** A single dataset's full feed402/0.2 envelope — born citeable. */
function datasetEnvelope(d: AtlasDataset) {
  return {
    data: {
      dataset: d.table,
      kind: d.kind,
      title: datasetTitle(d),
      description: datasetDescription(d),
      entity_types: datasetEntityTypes(d),
      row_count: d.row_count,
      schema_version: d.schema_version,
      columns: d.columns,
      download: datasetDownload(d),
    },
    citation: datasetCitation(d),
    receipt: {
      tier: "raw",
      status: "open_dataset",
      price_usd: 0,
      paid_by: "bucket-foundation (open data, CC-BY-4.0; reader pays nothing)",
    },
    cite: datasetCiteBlock(),
    tags: [d.kind, ...d.sources],
    // Tool/dataset outputs are downstream applications, not foundations/axioms —
    // they publish as candidate, never canon. Mirrors /api/research precedence.
    canon_tier: "candidate" as const,
    provenance: datasetProvenance(d),
    // TODO(publish): Story Protocol mint via the existing /research flow attaches
    // a mint_url / ip_asset_id here once a dataset is minted. No wallet needed to
    // read or cite — this is the optional on-chain permanence seam.
    ...agentNotice(),
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dataset = (url.searchParams.get("dataset") ?? "").trim();
  const m = getManifest();

  // ---- single dataset ----
  if (dataset) {
    const d = getDatasetBySlug(dataset) ?? getDatasetBySlug(dataset.replace(/_/g, "-"));
    if (!d) {
      return json(
        {
          error: {
            code: "not_found",
            message: `Unknown dataset "${dataset}". GET /api/research/datasets for the catalog.`,
          },
          ...agentNotice(),
        },
        { status: 404, headers: { "x-bucket-source": "research-atlas" } },
      );
    }
    return json(datasetEnvelope(d), {
      headers: { "x-bucket-source": "research-atlas", "x-bucket-tier": "raw" },
    });
  }

  // ---- full catalog ----
  const now = new Date().toISOString();
  const datasets = listDatasets();
  const catalog = datasets.map((d) => ({
    slug: datasetSlug(d),
    table: d.table,
    kind: d.kind,
    title: datasetTitle(d),
    description: datasetDescription(d),
    entity_types: datasetEntityTypes(d),
    row_count: d.row_count,
    schema_version: d.schema_version,
    sources: d.sources,
    as_of: d.as_of,
    canonical_url: `https://www.bucket.foundation/research/datasets/${datasetSlug(d)}`,
    api_url: `https://www.bucket.foundation/api/research/datasets?dataset=${d.table}`,
    download: datasetDownload(d),
  }));

  return json(
    {
      data: {
        catalog: "research-atlas",
        description: m.description,
        publisher: m.publisher,
        schema_version: m.schema_version,
        generated_at: m.generated_at,
        dataset_count: datasets.length,
        total_rows: m.totals?.rows ?? datasets.reduce((s, d) => s + d.row_count, 0),
        datasets: catalog,
      },
      citation: {
        type: "source",
        source_id: `research-atlas:catalog@${m.schema_version}`,
        provider: "bucket-foundation",
        dataset: "research-atlas",
        retrieved_at: now,
        license: m.license,
        canonical_url: "https://www.bucket.foundation/research/datasets",
      },
      receipt: {
        tier: "raw",
        status: "open_dataset",
        price_usd: 0,
        paid_by: "bucket-foundation (open data, CC-BY-4.0; reader pays nothing)",
      },
      cite: datasetCiteBlock(),
      tags: ["research-atlas", "open-data", "catalog"],
      canon_tier: "candidate" as const,
      provenance: [
        {
          action: "published",
          at: m.generated_at,
          by: `research-atlas/${m.schema_version}`,
          via: "data/MANIFEST.json",
        },
        {
          action: "vendored",
          at: m._vendored?.synced_at ?? m.generated_at,
          by: "bucket-foundation/sync-research-atlas-manifest",
          via: m._vendored?.source_repo ?? "research-atlas",
        },
      ],
      ...agentNotice(),
    },
    { headers: { "x-bucket-source": "research-atlas", "x-bucket-tier": "raw" } },
  );
}
