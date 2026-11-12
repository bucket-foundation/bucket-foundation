export type AdPlacement = "lobby" | "between-rounds" | "results";
export type AdMode = "off" | "placeholder" | "adsense-test" | "adsense";

export interface AdConfig {
  mode: AdMode;
  client: string | null;
  slots: Record<AdPlacement, string | null>;
}

export interface AdEnv {
  NEXT_PUBLIC_POLINGUAL_ADS?: string;
  NEXT_PUBLIC_ADSENSE_CLIENT?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_LOBBY?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_ROUND?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_RESULTS?: string;
}

const CLIENT = /^ca-pub-\d{10,20}$/;
const SLOT = /^\d{6,12}$/;

export function adConfig(env: AdEnv): AdConfig {
  const raw = (env.NEXT_PUBLIC_POLINGUAL_ADS ?? "off").trim();
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT && CLIENT.test(env.NEXT_PUBLIC_ADSENSE_CLIENT) ? env.NEXT_PUBLIC_ADSENSE_CLIENT : null;
  const slot = (v: string | undefined) => (v && SLOT.test(v) ? v : null);
  const slots = { lobby: slot(env.NEXT_PUBLIC_ADSENSE_SLOT_LOBBY), "between-rounds": slot(env.NEXT_PUBLIC_ADSENSE_SLOT_ROUND), results: slot(env.NEXT_PUBLIC_ADSENSE_SLOT_RESULTS) };
  if (raw === "placeholder") return { mode: "placeholder", client: null, slots };
  if ((raw === "adsense" || raw === "adsense-test") && client) return { mode: raw, client, slots };
  return { mode: "off", client: null, slots };
}

export function adShows(config: AdConfig, placement: AdPlacement): boolean {
  if (config.mode === "off") return false;
  if (config.mode === "placeholder") return true;
  return config.slots[placement] !== null;
}

export const ADS = adConfig({
  NEXT_PUBLIC_POLINGUAL_ADS: process.env.NEXT_PUBLIC_POLINGUAL_ADS,
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_SLOT_LOBBY: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOBBY,
  NEXT_PUBLIC_ADSENSE_SLOT_ROUND: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ROUND,
  NEXT_PUBLIC_ADSENSE_SLOT_RESULTS: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULTS,
});
