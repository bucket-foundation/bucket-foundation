import { langName } from "@academy/lang-systems";

export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  tags: string;
  favicon: string;
  votes: number;
}

const RADIO_FALLBACK = ["de1.api.radio-browser.info", "fi1.api.radio-browser.info", "de2.api.radio-browser.info", "nl1.api.radio-browser.info"];
const RADIO_MIN_VOTES = 10;
const NAMES: Record<string, string> = { zh: "chinese", grc: "", ang: "", sa: "sanskrit", fa: "persian", el: "greek" };

export function radioName(lang: string): string | null {
  if (lang in NAMES) return NAMES[lang] || null;
  const n = langName(lang);
  return n && n !== lang ? n.toLowerCase() : null;
}

export function streamOf(s: Pick<RadioStation, "url_resolved">): string | null {
  return s.url_resolved?.startsWith("https://") && s.url_resolved.length > 8 ? s.url_resolved : null;
}

export function filterStations(all: RadioStation[], limit: number): RadioStation[] {
  const seen = new Set<string>();
  return all
    .map((s) => ({ ...s, name: (s.name ?? "").trim() }))
    .filter((s) => {
      const k = s.name.toLowerCase();
      if (!streamOf(s) || (s.votes ?? 0) < RADIO_MIN_VOTES || !s.name || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

async function radioHosts(f: typeof fetch): Promise<string[]> {
  try {
    const r = await f("https://all.api.radio-browser.info/json/servers");
    const list = (await r.json()) as { name: string }[];
    const names = list.map((x) => x.name).filter((n) => n.endsWith(".api.radio-browser.info")).sort();
    return [...new Set([...names, ...RADIO_FALLBACK])];
  } catch {
    return RADIO_FALLBACK;
  }
}

export async function radioStations(lang: string, f: typeof fetch = fetch, limit = 25): Promise<RadioStation[]> {
  const name = radioName(lang);
  if (!name) return [];
  let failed = false;
  for (const host of await radioHosts(f)) {
    try {
      const q = new URLSearchParams({ language: name, hidebroken: "true", is_https: "true", order: "clickcount", reverse: "true", limit: String(limit * 2) });
      const r = await f(`https://${host}/json/stations/search?${q}`);
      if (!r.ok) throw new Error(String(r.status));
      return filterStations((await r.json()) as RadioStation[], limit);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("offline");
  return [];
}
