/* Sync the research-atlas data/MANIFEST.json into this repo as the source for
 * the open-datasets publishing surface (/research/datasets).
 *
 * Source of truth: github.com/bucket-foundation/research-atlas → data/MANIFEST.json
 * (local checkout at ../research-atlas). research-atlas is the canonical
 * research-economy graph (Funder→Grant→Organization→Person→Work→Field) published
 * as parquet datasets with an authoritative manifest (path, schema_version,
 * row_count, as_of, sources per dataset). See research-atlas/docs/ARCHITECTURE.md
 * §"Publish-to-Bucket seam".
 *
 * This vendors a COPY into src/data/research-atlas-manifest.json so the catalog
 * and dataset pages render statically at build time without a network dep on the
 * sibling repo. Re-run by hand or wire into prebuild when research-atlas updates.
 *
 *   node scripts/sync-research-atlas-manifest.mjs
 *   ATLAS_MANIFEST=/abs/path/to/MANIFEST.json node scripts/sync-research-atlas-manifest.mjs
 *
 * Idempotent: re-running converges on the same vendored file. If the source is
 * not found locally, it leaves the existing vendored copy in place (so the build
 * never breaks just because the sibling repo isn't checked out on this machine).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "src", "data", "research-atlas-manifest.json");

// Candidate source locations, in order of preference.
const candidates = [
  process.env.ATLAS_MANIFEST,
  join(root, "..", "research-atlas", "data", "MANIFEST.json"),
  join(root, "..", "..", "research-atlas", "data", "MANIFEST.json"),
].filter(Boolean);

const src = candidates.find((p) => existsSync(p));

if (!src) {
  if (existsSync(dest)) {
    console.warn(
      "[sync-research-atlas-manifest] source MANIFEST.json not found; keeping vendored copy at",
      dest,
    );
    process.exit(0);
  }
  console.error(
    "[sync-research-atlas-manifest] source MANIFEST.json not found and no vendored copy exists. Looked in:\n  " +
      candidates.join("\n  "),
  );
  process.exit(0); // never break the build
}

const raw = readFileSync(src, "utf8");
let manifest;
try {
  manifest = JSON.parse(raw);
} catch (e) {
  console.error("[sync-research-atlas-manifest] source is not valid JSON:", e);
  process.exit(1);
}

// Stamp where/when this copy came from so the catalog can show provenance.
const vendored = {
  _vendored: {
    source_repo: "github.com/bucket-foundation/research-atlas",
    source_path: "data/MANIFEST.json",
    synced_at: new Date().toISOString(),
    note:
      "Read-only copy. Edit research-atlas/data/MANIFEST.json and re-run scripts/sync-research-atlas-manifest.mjs.",
  },
  ...manifest,
};

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(vendored, null, 2) + "\n");
console.log(
  `[sync-research-atlas-manifest] vendored ${manifest.datasets?.length ?? 0} datasets from ${src} → ${dest}`,
);
