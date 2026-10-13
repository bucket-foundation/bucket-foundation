import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import whatsNewData from "../../../data/whats-new.json";
import { loadPublicEntries, mergeEntries, publishedEntries, type LegacyEntry, type PublicEntry } from "./public";
import { getWhatsNewStore, type StoredEntry } from "./store";

export const WHATS_NEW_TAG = "whats-new-entries";
export const LEGACY_ENTRIES = (whatsNewData as { entries: LegacyEntry[] }).entries;

export const cachedPublished: () => Promise<StoredEntry[]> = unstable_cache(() => publishedEntries(getWhatsNewStore()), ["whats-new-published"], {
  tags: [WHATS_NEW_TAG],
  revalidate: 300,
});

export async function publicWhatsNew(): Promise<PublicEntry[]> {
  try {
    return mergeEntries(LEGACY_ENTRIES, await cachedPublished());
  } catch (err) {
    console.error("[whats-new] published read failed, serving the legacy feed:", err instanceof Error ? err.message : err);
    return mergeEntries(LEGACY_ENTRIES, []);
  }
}

export function freshPublicWhatsNew(): Promise<PublicEntry[]> {
  return loadPublicEntries(LEGACY_ENTRIES, getWhatsNewStore());
}

export function revalidateWhatsNew(): void {
  revalidateTag(WHATS_NEW_TAG);
  revalidatePath("/whats-new");
}
