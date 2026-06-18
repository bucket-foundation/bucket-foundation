# Open Datasets — the PUBLISH surface for research-atlas

**Bead:** (orchestrator-tracked)
**Author:** Engineering pillar
**Date:** 2026-06-18
**Status:** shipped — catalog + dataset pages + API live; mint is a labelled seam

Goal: turn **research-atlas** datasets into **open, citable resources** on
bucket.foundation. This is the open-data half of Bucket's thesis — *publish
everything we research* — sitting beside the existing `/research`
publish→mint→cite flow and the `/research/tools` instrument surface.

> Bucket's mission: **open research that's free to read and priced-once to
> cite.** A dataset page makes a research-atlas table free to download, born
> citeable in the feed402/0.2 envelope, and one step away from a permanent
> on-chain mint.

---

## What research-atlas is

`research-atlas` (github.com/bucket-foundation/research-atlas) is the canonical,
normalized **graph of the global research economy**:

```
Funder → Grant → Organization → Person → Work → Field
```

Six entity tables + directed edge tables, every row carrying **provenance**
(`source`, `source_id`, `source_url`, `as_of`) and a stable surrogate key
(`atlas_id`). It publishes **parquet** datasets and an authoritative
`data/MANIFEST.json` — the manifest is the source of truth: *if a parquet is not
in the manifest, treat it as not-published* (see research-atlas
`docs/SCHEMA.md`, `docs/ARCHITECTURE.md`).

research-atlas explicitly defines a **"Publish-to-Bucket seam"** in its
`docs/ARCHITECTURE.md`: it builds the dataset + manifest; the **catalog, cite
envelope, and mint live in the Bucket Foundation stack** — which is exactly what
this surface implements.

---

## The pipeline: manifest → catalog → dataset page → cite/mint seam

```
research-atlas/data/MANIFEST.json          (authoritative: path, schema_version,
        │                                   row_count, as_of, sources per dataset)
        │  scripts/sync-research-atlas-manifest.mjs   (vendor a read-only copy)
        ▼
src/data/research-atlas-manifest.json      (vendored; build-time source)
        │  src/lib/research-atlas.ts        (typed read layer + cite helpers)
        ├────────────────────────────────────────────────────────────┐
        ▼                              ▼                               ▼
/research/datasets             /research/datasets/[slug]      /api/research/datasets
(catalog: card grid,           (detail: description, schema,  (feed402/0.2 envelope:
 row counts, sources,           provenance, DOWNLOAD link,     catalog + per-dataset
 entity types, as_of)           CITE block, MINT seam)         {data,citation,receipt,
                                                               cite,provenance,canon_tier})
        │
        ▼   (optional permanence — the MINT seam)
Story Protocol IP-NFT mint via the existing /research publish→mint flow:
  register manifest entry + parquet hash as an IP asset → pin parquet to Walrus →
  record in gdrive bucket-canon CANON_INDEX.md → citation fees route to authors.
  // TODO(publish) — NOT required to read, download, or cite a dataset.
```

### How the catalog reads the manifest

- **Sync (vendoring):** `scripts/sync-research-atlas-manifest.mjs` copies
  `research-atlas/data/MANIFEST.json` → `src/data/research-atlas-manifest.json`,
  stamping a `_vendored` block (source repo, path, `synced_at`). It looks for the
  sibling repo at `../research-atlas` (overridable via `ATLAS_MANIFEST=`), and is
  **idempotent + non-breaking**: if the source isn't checked out, it keeps the
  existing vendored copy and never fails the build.
- **Read layer:** `src/lib/research-atlas.ts` imports the vendored JSON
  (`@/data/...`, the established `resolveJsonModule` pattern used by canon /
  sacred-history pages) and exposes typed helpers — `listDatasets()`,
  `getDatasetBySlug()`, `datasetTitle/Description/EntityTypes()`,
  `datasetDownload()`, and the cite helpers below.
- **Build-time render:** the catalog and every dataset page are **static** —
  `generateStaticParams()` pre-renders one page per published dataset. No network
  dependency on the sibling repo at request time.

### How a dataset is "born citeable"

`src/lib/research-atlas.ts` emits the **same feed402/0.2 envelope shape** that
`/api/research` uses (`{ data, citation, receipt, cite, provenance, canon_tier }`):

- `citation` — `type:"source"`, `source_id: research-atlas:<table>@<schema>`,
  `license: CC-BY-4.0`, `canonical_url`, `download_url`, `as_of`, `row_count`,
  `sources`. The per-row `source_url` is the per-fact attribution chain.
- `cite` — the **passive, forward-looking** cite-forever block: `reader_owes: 0`,
  `price_usd` (what a downstream *publisher* would owe to re-publish in a paid
  work), `payout_wallet`, `license: bucket.foundation/cite-forever/v0.1`.
- `receipt` — `status:"open_dataset"`, `price_usd: 0`, paid-by Bucket.
- `canon_tier: "candidate"` — datasets are **downstream applications**, not
  foundations/axioms, mirroring the canon-precedence rules in
  `src/app/api/research/route.ts`.

The dataset page shows this envelope verbatim so a publisher can copy it, and the
API serves it at `/api/research/datasets?dataset=<table>`.

---

## What is REAL vs TODO seam

**Real (works today, non-breaking, `npx tsc --noEmit` clean):**

- The **catalog** at `/research/datasets` — reads the vendored manifest, lists
  every published dataset with title, sources, entity types, row counts, `as_of`,
  schema version. Stone-bone styling consistent with `/research`.
- The **dataset detail page** at `/research/datasets/[slug]` — description,
  full schema (every column documented from `docs/SCHEMA.md`), provenance chain,
  row counts, a **download link** to the canonical parquet, and the **cite
  block** in the feed402 envelope shape.
- The **API** at `/api/research/datasets` — the catalog and per-dataset metadata
  in the feed402/0.2 envelope, with the same anti-injection `agentNotice()`,
  CORS, and `cite-forever` license header as `/api/research`.
- The **sync script** `scripts/sync-research-atlas-manifest.mjs`.

**TODO seams (clearly marked `// TODO(publish):` in code):**

- **CSV mirror** — only the parquet download is real today; a generated CSV
  mirror is a labelled seam (`datasetDownload().csv_url = null`).
- **Hosted, DOI'd, content-addressed release** — the download currently points
  at the parquet committed in the research-atlas GitHub repo (raw). A proper
  hosted release with a DOI is a TODO seam.
- **On-chain MINT** — minting a dataset as a Story Protocol IP-NFT (parquet hash
  pinned to Walrus, recorded in gdrive `bucket-canon/CANON_INDEX.md`, citation
  fees routed to authors) **reuses the existing `/research` publish→mint flow**
  and is a clearly-labelled seam on the dataset page (`§05 mint`). It is **NOT
  required** to read, download, or cite a dataset — **no wallet needed**.

This realizes *"publish everything we research"*: the moment research-atlas adds
a dataset to its manifest, re-running the sync surfaces it in the catalog, gives
it a citeable dataset page and a feed402 API envelope, and leaves it one click
from a permanent on-chain mint.

---

## Re-syncing when research-atlas updates

```bash
# from bucket-foundation/ with the sibling repo checked out at ../research-atlas
node scripts/sync-research-atlas-manifest.mjs
# or point at an explicit manifest
ATLAS_MANIFEST=/abs/path/to/MANIFEST.json node scripts/sync-research-atlas-manifest.mjs
```

Idempotent — re-running converges on the same vendored file. Consider adding it
to the `prebuild` hook (alongside `sync-academy.mjs`) once research-atlas
publishes on a cadence.
