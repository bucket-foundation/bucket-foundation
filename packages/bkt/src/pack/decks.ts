import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DECK_MANIFEST } from "../decks";
import { buildCatalog, type Catalog } from "../library";

export const CURATED_DIR = "decks";
export const CATALOG_FILE = "catalog.json";

export function curatedCatalog(repo: string): Catalog {
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
  return buildCatalog(manifests);
}

export function catalogText(c: Catalog): string {
  return `${JSON.stringify(c, null, 1)}\n`;
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const catalog = curatedCatalog(repo);
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "deck-catalog.json"), JSON.stringify(catalog));
  if (process.argv.includes("--publish")) writeFileSync(join(repo, CURATED_DIR, CATALOG_FILE), catalogText(catalog));
  console.log(`deck catalog ${catalog.sha256.slice(0, 12)}: ${catalog.decks.length} decks, ${catalog.decks.reduce((n, d) => n + d.counts.cards, 0)} cards`);
}
