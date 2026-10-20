import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DECK_MANIFEST } from "../decks";
import { buildCatalog, CATALOG_SIG_SUFFIX, type Catalog, type SignedCatalog } from "../library";

export const CURATED_DIR = "decks";
export const CATALOG_FILE = "catalog.json";

function committedCatalog(repo: string): { serial: number; sha256: string } | null {
  const file = join(repo, CURATED_DIR, CATALOG_FILE);
  if (!existsSync(file)) return null;
  const c = JSON.parse(readFileSync(file, "utf8")) as { serial?: unknown; sha256?: unknown };
  return typeof c.serial === "number" && typeof c.sha256 === "string" ? { serial: c.serial, sha256: c.sha256 } : null;
}

export function curatedCatalog(repo: string, o: { publish?: boolean } = {}): Catalog {
  const root = join(repo, CURATED_DIR);
  const manifests = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(root, name, DECK_MANIFEST), "utf8")) as { id?: unknown };
      if (raw.id !== name) throw new Error(`deck catalog: ${CURATED_DIR}/${name} holds a manifest with another id`);
      return raw;
    });
  const held = committedCatalog(repo);
  const same = buildCatalog(manifests, held?.serial ?? 1);
  return o.publish && held && same.sha256 !== held.sha256 ? buildCatalog(manifests, held.serial + 1) : same;
}

export function catalogText(c: Catalog): string {
  return `${JSON.stringify(c, null, 1)}\n`;
}

export function bundledCatalog(repo: string): SignedCatalog {
  const file = join(repo, CURATED_DIR, CATALOG_FILE);
  const sig = `${file}${CATALOG_SIG_SUFFIX}`;
  return { text: readFileSync(file, "utf8"), signature: existsSync(sig) ? readFileSync(sig, "utf8") : "" };
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const publish = process.argv.includes("--publish");
  const catalog = curatedCatalog(repo, { publish });
  if (publish) writeFileSync(join(repo, CURATED_DIR, CATALOG_FILE), catalogText(catalog));
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "deck-catalog.json"), JSON.stringify(bundledCatalog(repo)));
  console.log(`deck catalog ${catalog.sha256.slice(0, 12)}: ${catalog.decks.length} decks, ${catalog.decks.reduce((n, d) => n + d.counts.cards, 0)} cards`);
}
