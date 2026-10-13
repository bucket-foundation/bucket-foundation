import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const DECK_CATALOG_DIR = "decks";
export const DECK_CATALOG_CACHE = "public, max-age=300";
export const DECK_CATALOG_FILES: Record<string, string> = {
  "catalog.json": "application/json; charset=utf-8",
  "catalog.json.sig": "text/plain; charset=utf-8",
};

export interface DeckCatalogFile {
  body: Buffer;
  type: string;
}

export function deckCatalogFile(name: string, root: string = process.cwd()): DeckCatalogFile | null {
  if (!Object.hasOwn(DECK_CATALOG_FILES, name)) return null;
  const file = path.join(root, DECK_CATALOG_DIR, name);
  if (!existsSync(file)) return null;
  return { body: readFileSync(file), type: DECK_CATALOG_FILES[name] };
}

export function deckCatalogResponse(name: string, root: string = process.cwd()): Response {
  const found = deckCatalogFile(name, root);
  if (!found) return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  return new Response(new Uint8Array(found.body), { headers: { "content-type": found.type, "cache-control": DECK_CATALOG_CACHE } });
}
