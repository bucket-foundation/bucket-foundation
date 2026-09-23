const DB_URL =
  process.env.POLINGUAL_DB_URL || "https://db.agfarms.dev";
const ANON_KEY =
  process.env.POLINGUAL_DB_ANON_KEY ||
  "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3NzI2NzExOTIsICJleHAiOiAzMzUwNTA3OTkyfQ.84yH0_ALk078aiLJrc5tcKEUxKTYASfWnVjn7xSlz-0";

const SCHEMA = "polingual";

export type Photon = {
  id: string;
  kind: string;
  lang: string;
  surface: string;
  meaning_en: string;
  tier: string;
  branch: string[];
  pos?: string | null;
  ipa?: string | null;
  provenance?: {
    source: string;
    source_uri: string;
    captured_at: string;
  };
  relations?: { predicate: string; to: string }[];
};

const SELECT_COLS =
  "id,kind,lang,surface,meaning_en,tier,branch,pos,ipa,provenance,relations";

function pgrstHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Accept-Profile": SCHEMA,
    Accept: "application/json",
    ...extra,
  };
}

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${DB_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export async function getPhoton(id: string): Promise<Photon | null> {
  const url = buildUrl("photons", {
    select: SELECT_COLS,
    id: `eq.${id}`,
    limit: 1,
  });
  const r = await fetch(url, {
    headers: pgrstHeaders(),
    next: { revalidate: 60 },
  });
  if (!r.ok) return null;
  const rows = (await r.json()) as Photon[];
  return rows[0] || null;
}

export type SearchOptions = {
  lang?: string;
  kind?: string;
  topK?: number;
};

export type SearchResult = {
  query: string;
  n_results: number;
  results: Photon[];
  took_ms: number;
};

export async function searchPhotons(
  query: string,
  opts: SearchOptions = {}
): Promise<SearchResult> {
  const t0 = Date.now();
  const q = (query || "").trim();
  const topK = Math.min(Math.max(opts.topK ?? 30, 1), 100);

  if (!q) {
    return { query: q, n_results: 0, results: [], took_ms: 0 };
  }

  const safe = q.replace(/[%,()]/g, " ");

  const baseParams: Record<string, string | number> = {
    select: SELECT_COLS,
    limit: topK,
  };
  if (opts.lang) baseParams["lang"] = `eq.${opts.lang}`;
  if (opts.kind) baseParams["kind"] = `eq.${opts.kind}`;

  const exactUrl = buildUrl("photons", {
    ...baseParams,
    surface: `ilike.${safe}`,
  });
  const prefixUrl = buildUrl("photons", {
    ...baseParams,
    surface: `ilike.${safe}*`,
  });
  const containsUrl = buildUrl("photons", {
    ...baseParams,
    surface: `ilike.*${safe}*`,
  });
  const ftsUrl = buildUrl("photons", {
    ...baseParams,
    meaning_tsv: `fts(english).${safe.split(/\s+/).filter(Boolean).join("&")}`,
  });

  const headers = pgrstHeaders();
  const [exact, prefix, contains, fts] = await Promise.all([
    fetch(exactUrl, { headers, next: { revalidate: 30 } }).then(safeJson),
    fetch(prefixUrl, { headers, next: { revalidate: 30 } }).then(safeJson),
    fetch(containsUrl, { headers, next: { revalidate: 30 } }).then(safeJson),
    fetch(ftsUrl, { headers, next: { revalidate: 30 } }).then(safeJson),
  ]);

  const seen = new Set<string>();
  const out: Photon[] = [];
  for (const bucket of [exact, prefix, contains, fts] as Photon[][]) {
    for (const p of bucket) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= topK) break;
    }
    if (out.length >= topK) break;
  }

  return {
    query: q,
    n_results: out.length,
    results: out,
    took_ms: Date.now() - t0,
  };
}

async function safeJson(r: Response): Promise<Photon[]> {
  if (!r.ok) return [];
  try {
    const j = (await r.json()) as Photon[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export type PhotonStats = {
  total: number;
  by_lang: Record<string, number>;
};

export async function photonStats(): Promise<PhotonStats> {
  const totalUrl = buildUrl("photons", { select: "id", limit: 1 });
  const totalRes = await fetch(totalUrl, {
    headers: pgrstHeaders({ Prefer: "count=exact" }),
    next: { revalidate: 300 },
  });
  const range = totalRes.headers.get("content-range") || "0-0/0";
  const total = parseInt(range.split("/")[1] || "0", 10) || 0;

  const KNOWN_LANGS = [
    "en", "la", "sa", "fr", "de", "es", "it", "pt", "ru", "zh",
    "ja", "ko", "ar", "he", "hi", "fa", "el", "tr", "pl", "nl",
    "sv", "fi", "cs", "vi", "th", "id", "ta", "grc",
  ];
  const by_lang: Record<string, number> = {};
  for (const code of KNOWN_LANGS) by_lang[code] = 0;

  return { total, by_lang };
}
