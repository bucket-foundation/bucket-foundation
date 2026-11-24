import type { HeardAbout } from "./funnel-steps";

export const HEARD_KEY = "pl.heard";

export const HEARD_LABELS: Record<HeardAbout, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  app_store: "App Store",
  google_play: "Google Play",
  search: "Google or another search",
  friend: "A friend or family",
  school: "School or a teacher",
  reddit: "Reddit",
  other: "Somewhere else",
};

export function heardAboutDue(store: Pick<Storage, "getItem"> | null): boolean {
  try {
    return !store?.getItem(HEARD_KEY);
  } catch {
    return false;
  }
}
