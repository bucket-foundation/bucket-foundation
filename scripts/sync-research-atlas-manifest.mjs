import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "src", "data", "research-atlas-manifest.json");

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
  process.exit(0);
}

const raw = readFileSync(src, "utf8");
let manifest;
try {
  manifest = JSON.parse(raw);
} catch (e) {
  console.error("[sync-research-atlas-manifest] source is not valid JSON:", e);
  process.exit(1);
}

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
