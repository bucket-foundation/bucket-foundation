# Open Datasets — the PUBLISH surface for research-atlas

**Bead:** (orchestrator-tracked)
**Author:** Engineering pillar
**Date:** 2026-06-18
**Status:** shipped — catalog + dataset pages + API live; DOI is a labelled seam

Goal: turn **research-atlas** datasets into **open, citable resources** on
bucket.foundation. This is the open-data half of Bucket's thesis — *publish
everything we research* — sitting beside the existing `/research` publish→cite
flow and the `/research/tools` instrument surface.

The model is plain and **has no blockchain**: datasets are **free-to-read,
paid-to-cite over feed402/x402**, and get a **real DOI (via Zenodo)** for
permanence. There is **NO Story Protocol, NO Walrus, NO IP-NFT** anywhere on this
surface (founder decision, matches the org "NO Story Protocol anywhere" rule).
Credentials, if any, use **Open Badges 3.0 / W3C VC** — issuer-signed, no chain.

> Bucket's mission: **open research that's free to read and priced-once to
> cite.** A dataset page makes a research-atlas table free to download, born
> citeable in the feed402/0.2 envelope, and one step away from a real DOI.

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
envelope, and DOI registration live in the Bucket Foundation stack** — which is
exactly what this surface implements.

---

## The pipeline: manifest → catalog → dataset page → cite/DOI seam

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
 entity types, as_of)           CITE block, DOI seam)          {data,citation,receipt,
                                                               cite,provenance,canon_tier})
        │
        ▼   (optional permanence — the DOI seam; NO blockchain)
Real DOI via Zenodo:
  deposit content-addressed parquet to Zenodo → mint a real DOI →
  record DOI in gdrive bucket-canon CANON_INDEX.md alongside the feed402/0.2 cite
  block → downstream citation fees route to authors over feed402/x402.
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
- **Hosted, content-addressed release + real DOI** — the download currently
  points at the parquet committed in the research-atlas GitHub repo (raw). A
  proper hosted release with a **real DOI minted via Zenodo** is a TODO seam.
- **DOI registration (permanence)** — depositing a dataset's content-addressed
  parquet to **Zenodo** for a **real DOI**, recording it in gdrive
  `bucket-canon/CANON_INDEX.md` alongside the feed402/0.2 cite block, with
  downstream citation fees routed to authors over feed402/x402, is a
  clearly-labelled seam on the dataset page (`§05 doi`). It is **NOT required**
  to read, download, or cite a dataset, and involves **no blockchain, no Story
  Protocol, no IP-NFT, no wallet**.

This realizes *"publish everything we research"*: the moment research-atlas adds
a dataset to its manifest, re-running the sync surfaces it in the catalog, gives
it a citeable dataset page and a feed402 API envelope, and leaves it one step
from a real, permanent DOI.

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
