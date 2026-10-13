import type { LibraryBody, LibraryRow } from "../api";

const row = (id: string, title: string, cards: number, mb: number, state: LibraryRow["state"], over: Partial<LibraryRow> = {}): LibraryRow => ({
  id,
  title,
  kind: "words",
  language: id.split("-")[1],
  cards,
  downloadBytes: mb * 1024 * 1024,
  installedBytes: mb * 6 * 1024 * 1024,
  version: "1f0c2ab49d31",
  source: "Wiktionary via Kaikki (kaikki.org)",
  licence: "CC-BY-SA 3.0",
  licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/",
  curator: "Bucket Foundation",
  built: "2026-10-11",
  state,
  inCatalog: true,
  received: 0,
  error: null,
  ...over,
});

export const LIBRARY: LibraryBody = {
  built: "2026-10-11",
  refreshedAt: null,
  offline: false,
  from: "bundled",
  signed: true,
  decks: [
    row("polingual-es", "Spanish words", 755090, 30, "available"),
    row("polingual-de", "German words", 333622, 17, "installed"),
    row("polingual-ja", "Japanese words", 113923, 8, "update"),
    row("polingual-ar", "Arabic words", 24278, 2, "downloading", { received: 1024 * 1024 }),
    row("polingual-fr", "French words", 378499, 18, "failed", { error: "The downloaded file did not match the catalog, so Bucket did not install it." }),
    row("my-french", "Kitchen French", 40, 1, "installed", { kind: "cards", inCatalog: false, licenceHref: null, licence: "CC0", curator: "Ada" }),
  ],
};

export const EMPTY_LIBRARY: LibraryBody = { built: "1970-01-01", refreshedAt: null, offline: true, from: "bundled", signed: false, decks: [] };
