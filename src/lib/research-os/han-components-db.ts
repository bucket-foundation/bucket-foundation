import { graphService } from "./db";
import { inChunks, pagedRead } from "./paging";
import { hanChars, shownParts, type HanChar, type HanComponentRow } from "./han-components";

const COLUMNS = "char,ord,component,meaning,meaning_source,ids,source,confidence,agrees_with_wiktionary,decomposition_license,meaning_license";

type Page<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;

export async function loadHanParts(words: { lang: string; word: string }[]): Promise<Map<string, HanChar>> {
  const chars = hanChars(words);
  if (chars.length === 0) return new Map();
  const rows = await inChunks<HanComponentRow>(chars, (chunk, page) =>
    graphService().from("han_components").select(COLUMNS).in("char", chunk).order("char").order("ord").range(page.from, page.to) as unknown as Page<HanComponentRow>,
  );
  return shownParts(rows);
}

export async function loadAllHanComponents(): Promise<HanComponentRow[]> {
  return pagedRead<HanComponentRow>((page) =>
    graphService().from("han_components").select(COLUMNS).order("char").order("ord").range(page.from, page.to) as unknown as Page<HanComponentRow>,
  );
}
