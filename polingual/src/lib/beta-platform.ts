export const PLAY_GROUP_URL = "https://groups.google.com/g/polingual-beta";
export const PLAY_GROUP_EMAIL = "polingual-beta@googlegroups.com";
export const PLAY_TESTING_URL = "https://play.google.com/apps/testing/com.polingual.app";

export const BETA_PLATFORMS = ["ios", "android"] as const;
export type BetaPlatform = (typeof BETA_PLATFORMS)[number];

export function parsePlatform(body: unknown): BetaPlatform {
  const p = body && typeof body === "object" ? (body as { platform?: unknown }).platform : undefined;
  return p === "android" ? "android" : "ios";
}

export function platformFromUA(ua: string | null | undefined): BetaPlatform {
  return ua && /android/i.test(ua) ? "android" : "ios";
}

export const ANDROID_STEPS = [
  { title: "Join the tester group", body: `Sign in with the Google account you use for Play and tap Join group. The group is ${PLAY_GROUP_EMAIL}.`, href: PLAY_GROUP_URL, cta: "Join the group" },
  { title: "Become a tester", body: "Open the Play testing link with the same account, tap Become a tester, then install Polingual from Play.", href: PLAY_TESTING_URL, cta: "Become a tester" },
] as const;
