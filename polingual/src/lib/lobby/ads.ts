export type AdPlacement = "rail" | "banner" | "between-rounds" | "results" | "interstitial" | "rewarded";
export type AdMode = "off" | "placeholder" | "adsense-test" | "adsense";
export type AdSize = { width: number; height: number };
export type AdLayout = "phone" | "rail-160" | "rail-300";

export interface AdConfig {
  mode: AdMode;
  client: string | null;
  slots: Record<AdPlacement, string | null>;
}

export interface AdEnv {
  NEXT_PUBLIC_POLINGUAL_ADS?: string;
  NEXT_PUBLIC_ADSENSE_CLIENT?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_RAIL?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_BANNER?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_ROUND?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_RESULTS?: string;
}

const CLIENT = /^ca-pub-\d{10,20}$/;
const SLOT = /^\d{6,12}$/;
const PUB = /^(?:ca-)?(pub-\d{10,20})$/;

export const RAIL_MIN = 1000;
export const WIDE_RAIL_MIN = 1360;
export const BANNER: AdSize = { width: 320, height: 50 };

export function adConfig(env: AdEnv): AdConfig {
  const raw = (env.NEXT_PUBLIC_POLINGUAL_ADS ?? "off").trim();
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT && CLIENT.test(env.NEXT_PUBLIC_ADSENSE_CLIENT) ? env.NEXT_PUBLIC_ADSENSE_CLIENT : null;
  const slot = (v: string | undefined) => (v && SLOT.test(v) ? v : null);
  const slots = {
    rail: slot(env.NEXT_PUBLIC_ADSENSE_SLOT_RAIL),
    banner: slot(env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER),
    "between-rounds": slot(env.NEXT_PUBLIC_ADSENSE_SLOT_ROUND),
    results: slot(env.NEXT_PUBLIC_ADSENSE_SLOT_RESULTS),
    interstitial: null,
    rewarded: null,
  };
  if (raw === "placeholder" || raw === "on") return { mode: "placeholder", client: null, slots };
  if ((raw === "adsense" || raw === "adsense-test") && client) return { mode: raw, client, slots };
  return { mode: "off", client: null, slots };
}

export function adsOn(config: AdConfig): boolean {
  return config.mode !== "off";
}

export function adShows(config: AdConfig, placement: AdPlacement): boolean {
  return config.mode === "placeholder" || adLive(config, placement);
}

export function adLive(config: AdConfig, placement: AdPlacement): boolean {
  return (config.mode === "adsense" || config.mode === "adsense-test") && config.client !== null && config.slots[placement] !== null;
}

export function adLayout(viewportWidth: number): AdLayout {
  if (viewportWidth >= WIDE_RAIL_MIN) return "rail-300";
  if (viewportWidth >= RAIL_MIN) return "rail-160";
  return "phone";
}

export function railSize(layout: AdLayout): AdSize | null {
  if (layout === "rail-300") return { width: 300, height: 600 };
  if (layout === "rail-160") return { width: 160, height: 600 };
  return null;
}

export type Entitlement = "signed-out" | "subscriber" | "free" | "unknown";

export function showsAds(config: AdConfig, entitlement: Entitlement | "checking"): boolean {
  if (!adsOn(config)) return false;
  return entitlement === "signed-out" || entitlement === "free";
}

export function pubId(raw: string | undefined): string | null {
  const m = raw?.trim().match(PUB);
  return m ? m[1] : null;
}

export function adsTxt(raw: string | undefined): string | null {
  const id = pubId(raw);
  return id ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n` : null;
}

export const CONSENT_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "UK", "CH",
]);

export function needsConsent(country: string | null | undefined): boolean {
  return !!country && CONSENT_COUNTRIES.has(country.trim().toUpperCase());
}

export const ADS = adConfig({
  NEXT_PUBLIC_POLINGUAL_ADS: process.env.NEXT_PUBLIC_POLINGUAL_ADS,
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_SLOT_RAIL: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RAIL,
  NEXT_PUBLIC_ADSENSE_SLOT_BANNER: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER,
  NEXT_PUBLIC_ADSENSE_SLOT_ROUND: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ROUND,
  NEXT_PUBLIC_ADSENSE_SLOT_RESULTS: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULTS,
});

export function entitlementOf(signedIn: boolean, access: { status: "checking" | "open" | "locked" | "unknown" } | null): Entitlement {
  if (!signedIn) return "signed-out";
  if (access?.status === "open") return "subscriber";
  if (access?.status === "locked") return "free";
  return "unknown";
}

export interface AccountCtaState {
  signIn: boolean;
  learn: { label: string; href: string } | null;
}

export function accountCta(entitlement: Entitlement | "checking"): AccountCtaState {
  if (entitlement === "signed-out") return { signIn: true, learn: { label: "Start learning", href: "/app?from=play" } };
  if (entitlement === "subscriber") return { signIn: false, learn: { label: "Continue learning", href: "/app" } };
  if (entitlement === "free" || entitlement === "unknown") return { signIn: false, learn: { label: "Start learning", href: "/app?from=play" } };
  return { signIn: false, learn: null };
}

export const INTERSTITIAL_GAP_MS = 3 * 60_000;

export function interstitialDue(gamesFinished: number, lastShownAt: number | null, now: number): boolean {
  if (gamesFinished < 2) return false;
  return lastShownAt === null || now - lastShownAt >= INTERSTITIAL_GAP_MS;
}

export function betweenRoundsAd(game: string, round: number, gamesFinished: number): boolean {
  if (gamesFinished < 1 || game === "tiles") return false;
  return round === 4;
}
