/**
 * Retrievers for the Bucket research agent — the RETRIEVE step.
 *
 * Every retriever returns provenance-tagged `Source` records drawn ONLY from
 * public/documented assets we already have:
 *   - canon      : the Bucket canon claim index (runtime, Vercel-shipped via
 *                  `@/lib/canon-search-index` tokenRank — closed-set, real text)
 *   - openalex   : live OpenAlex works API (public, no key)
 *   - pubmed     : live NCBI E-utilities esearch+esummary (public, no key)
 *   - atlas      : the research-atlas read-only query API (atlas-api.agfarms.dev)
 *   - methods    : the live MethodsMatcher tool on the research-tools gateway
 *                  (research-tools.agfarms.dev) — picks the right Bucket tool
 *
 * Each `Source` carries `provenance.call` — the EXACT request made — so the
 * brief is reproducible. NO source is fabricated; DOIs/IDs come straight from
 * the upstream payloads. Network failures degrade gracefully (the retriever
 * returns [] + a note), never throw the whole run.
 */
import { tokenRank } from "@/lib/canon-search-index";

// ---- types ---------------------------------------------------------------

export type SourceKind = "canon" | "openalex" | "pubmed" | "atlas" | "methods";

export type Source = {
  /** Stable citation key the LLM must copy verbatim into `claims[].citation`. */
  id: string;
  kind: SourceKind;
  title: string;
  /** The evidence text the synthesizer is allowed to read (snippet/abstract). */
  snippet: string;
  url?: string;
  doi?: string;
  year?: number | null;
  meta?: Record<string, unknown>;
  provenance: {
    retriever: SourceKind;
    /** The exact call made, so a reader can reproduce it. */
    call: string;
  };
};

export type RetrievalLog = {
  retriever: SourceKind;
  call: string;
  ok: boolean;
  count: number;
  note?: string;
};

export type RetrievalResult = { sources: Source[]; log: RetrievalLog[] };

const ATLAS_API = (process.env.ATLAS_API_URL ?? "https://atlas-api.agfarms.dev").replace(/\/$/, "");
const GATEWAY = (process.env.TOOLS_GATEWAY_URL ?? "https://research-tools.agfarms.dev").replace(/\/$/, "");
const RETR_TIMEOUT_MS = Number(process.env.RESEARCH_AGENT_RETR_TIMEOUT_MS ?? "12000");
// OpenAlex asks for a mailto in the polite pool. Public, documented, no key.
const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO ?? "research@bucket.foundation";

function clip(s: string, n = 900): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), RETR_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "bucket-research-agent/1.0 (research@bucket.foundation)" },
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(to);
  }
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), RETR_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(to);
  }
}

// ---- canon (runtime, Vercel-shipped, closed-set) -------------------------

/** Retrieve from the Bucket canon claim index via lexical tokenRank — entirely
 *  local + deterministic, no network, always reproducible. The text is the
 *  canon excerpt itself (closed-set grounding). */
export function retrieveCanon(query: string, topK = 4): RetrievalResult {
  const call = `canon-search-index.tokenRank(${JSON.stringify(query)}, topK=${topK})`;
  let ranked: ReturnType<typeof tokenRank> = [];
  try {
    ranked = tokenRank(query, topK).filter((r) => r.score > 0);
  } catch {
    return { sources: [], log: [{ retriever: "canon", call, ok: false, count: 0, note: "canon index unavailable" }] };
  }
  const sources: Source[] = ranked.map((r, i) => ({
    id: `canon:${r.entry.branch}/${r.entry.concept}/${r.entry.slug}`,
    kind: "canon",
    title: r.entry.title || `${r.entry.concept} · ${r.entry.slug}`,
    snippet: clip(r.entry.text),
    url: undefined,
    meta: { branch: r.entry.branch, concept: r.entry.concept, path: r.entry.path, rank: i + 1, overlap_score: r.score },
    provenance: { retriever: "canon", call },
  }));
  return { sources, log: [{ retriever: "canon", call, ok: true, count: sources.length }] };
}

// ---- OpenAlex (live literature, public) ----------------------------------

type OpenAlexWork = {
  id?: string;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: { landing_page_url?: string | null; source?: { display_name?: string | null } | null } | null;
};

/** Reconstruct an abstract from OpenAlex's inverted index (their documented
 *  shape). Returns "" when absent — never fabricates text. */
function deinvertAbstract(inv?: Record<string, number[]> | null): string {
  if (!inv) return "";
  const slots: string[] = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) slots[p] = word;
  }
  return slots.filter(Boolean).join(" ");
}

/** OpenAlex's stemmed `search` treats `*`/`?` as wildcards and 400s on a bare
 *  question mark. Strip wildcard chars + collapse whitespace so a natural
 *  question is a valid full-text search. (Documented behavior — see the API's
 *  "Wildcards require exact search" error.) */
function sanitizeForSearch(query: string): string {
  return query.replace(/[*?]/g, " ").replace(/\s+/g, " ").trim();
}

export async function retrieveOpenAlex(query: string, perPage = 4): Promise<RetrievalResult> {
  const params = new URLSearchParams({
    search: sanitizeForSearch(query),
    per_page: String(perPage),
    select: "id,display_name,title,publication_year,doi,cited_by_count,abstract_inverted_index,primary_location",
    mailto: OPENALEX_MAILTO,
  });
  const url = `https://api.openalex.org/works?${params.toString()}`;
  const call = `GET ${url}`;
  try {
    const data = (await getJson(url)) as { results?: OpenAlexWork[] };
    const works = data.results ?? [];
    const sources: Source[] = works.map((w) => {
      const title = (w.display_name || w.title || "untitled").trim();
      const abs = clip(deinvertAbstract(w.abstract_inverted_index));
      const doi = w.doi ? w.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : undefined;
      const url2 = w.primary_location?.landing_page_url || (w.doi ?? undefined) || w.id;
      return {
        id: `openalex:${(w.id || "").replace("https://openalex.org/", "") || doi || title.slice(0, 24)}`,
        kind: "openalex" as const,
        title,
        snippet: abs || "(no abstract indexed for this work)",
        url: url2 ?? undefined,
        doi,
        year: w.publication_year ?? null,
        meta: { cited_by_count: w.cited_by_count ?? 0, venue: w.primary_location?.source?.display_name ?? null },
        provenance: { retriever: "openalex", call },
      };
    });
    return { sources, log: [{ retriever: "openalex", call, ok: true, count: sources.length }] };
  } catch (e) {
    return { sources: [], log: [{ retriever: "openalex", call, ok: false, count: 0, note: String((e as Error).message) }] };
  }
}

// ---- PubMed (live literature, public E-utilities) ------------------------

export async function retrievePubMed(query: string, retmax = 4): Promise<RetrievalResult> {
  const eutils = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const searchUrl = `${eutils}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}&term=${encodeURIComponent(query)}`;
  const searchCall = `GET ${searchUrl}`;
  let ids: string[] = [];
  try {
    const s = (await getJson(searchUrl)) as { esearchresult?: { idlist?: string[] } };
    ids = s.esearchresult?.idlist ?? [];
  } catch (e) {
    return { sources: [], log: [{ retriever: "pubmed", call: searchCall, ok: false, count: 0, note: String((e as Error).message) }] };
  }
  if (ids.length === 0) {
    return { sources: [], log: [{ retriever: "pubmed", call: searchCall, ok: true, count: 0, note: "no PubMed hits" }] };
  }
  const summUrl = `${eutils}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
  const summCall = `GET ${summUrl}`;
  try {
    const data = (await getJson(summUrl)) as {
      result?: Record<string, { uid?: string; title?: string; pubdate?: string; fulljournalname?: string; source?: string; elocationid?: string; articleids?: Array<{ idtype: string; value: string }> }>;
    };
    const res = data.result ?? {};
    const sources: Source[] = ids
      .map((id) => res[id])
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => {
        const doiEntry = (d.articleids || []).find((a) => a.idtype === "doi");
        const doi = doiEntry?.value || (d.elocationid?.startsWith("doi:") ? d.elocationid.slice(4) : undefined);
        const yearM = (d.pubdate || "").match(/\d{4}/);
        return {
          id: `pubmed:${d.uid}`,
          kind: "pubmed" as const,
          title: (d.title || "untitled").replace(/\.$/, ""),
          // esummary gives no abstract; the title + venue is the grounding we
          // expose. The synthesizer must not invent findings from a bare title.
          snippet: `${d.title || ""} — ${d.fulljournalname || d.source || "journal"} (${d.pubdate || "n.d."}).`,
          url: `https://pubmed.ncbi.nlm.nih.gov/${d.uid}/`,
          doi,
          year: yearM ? Number(yearM[0]) : null,
          meta: { venue: d.fulljournalname || d.source || null, pmid: d.uid },
          provenance: { retriever: "pubmed", call: `${searchCall} ; ${summCall}` },
        };
      });
    return { sources, log: [{ retriever: "pubmed", call: `${searchCall} ; ${summCall}`, ok: true, count: sources.length }] };
  } catch (e) {
    return { sources: [], log: [{ retriever: "pubmed", call: summCall, ok: false, count: 0, note: String((e as Error).message) }] };
  }
}

// ---- research-atlas (metascience / grant-economy questions) --------------

/** Pull headline stats from the atlas. Cheap, always-available signal that lets
 *  the agent ground metascience claims about the research economy. We only hit
 *  the documented read-only `/stats` + `/metascience` surface. */
export async function retrieveAtlas(): Promise<RetrievalResult> {
  const statsUrl = `${ATLAS_API}/stats`;
  const call = `GET ${statsUrl}`;
  try {
    const stats = (await getJson(statsUrl)) as Record<string, number>;
    const fmtUsd = typeof stats.usd_funded === "number" ? `$${(stats.usd_funded / 1e9).toFixed(0)}B` : "n/a";
    const snippet =
      `research-atlas (reconciled global research-funding graph): ` +
      `${stats.funders ?? "?"} funders, ${stats.grants ?? "?"} grants, ` +
      `${stats.organizations ?? "?"} organizations, ${stats.persons ?? "?"} persons, ` +
      `${stats.works ?? "?"} works, ${fmtUsd} total awarded (USD-normalized).`;
    const sources: Source[] = [
      {
        id: "atlas:stats",
        kind: "atlas",
        title: "research-atlas — global research-economy graph (headline stats)",
        snippet,
        url: "https://doi.org/10.5281/zenodo.20774322",
        meta: { ...stats },
        provenance: { retriever: "atlas", call },
      },
    ];
    return { sources, log: [{ retriever: "atlas", call, ok: true, count: 1 }] };
  } catch (e) {
    return { sources: [], log: [{ retriever: "atlas", call, ok: false, count: 0, note: String((e as Error).message) }] };
  }
}

// ---- MethodsMatcher (route to the right Bucket instrument) ---------------

type MethodsOut = {
  recommended_methods?: Array<{ method: string; papers_in_set: number; total_citations: number }>;
  our_tools?: Array<{ slug: string; name: string; answers: string }>;
  exemplar_papers?: Array<{ title: string; venue?: string; year?: number | null; cited_by_count?: number; url?: string }>;
  recommendation?: string;
  degraded?: boolean;
};

export type MethodsMatch = {
  recommendation: string;
  methods: Array<{ method: string; papers_in_set: number }>;
  tools: Array<{ slug: string; name: string; answers: string }>;
  degraded: boolean;
  call: string;
  ok: boolean;
};

/** Route a sub-question through the live MethodsMatcher tool on the gateway. It
 *  mines recurring methods in the literature and picks which Bucket tool fits.
 *  Returns a structured match + any exemplar papers (which we also fold into
 *  the source set so the brief can cite them). */
export async function matchMethods(question: string): Promise<{ match: MethodsMatch; sources: Source[]; log: RetrievalLog }> {
  const url = `${GATEWAY}/v1/methodsmatcher/submit`;
  const call = `POST ${url} {"question": ${JSON.stringify(question)}}`;
  try {
    const resp = (await postJson(url, { question })) as { result?: { output?: MethodsOut } } | { output?: MethodsOut };
    const output: MethodsOut =
      ("result" in resp && resp.result?.output) || ("output" in resp && resp.output) || {};
    const exemplars = output.exemplar_papers ?? [];
    const sources: Source[] = exemplars.slice(0, 3).map((p, i) => ({
      id: `methods-exemplar:${i + 1}:${(p.url || p.title).slice(0, 32)}`,
      kind: "openalex" as const, // exemplars are OpenAlex works surfaced via the tool
      title: p.title,
      snippet: `Exemplar method paper for "${clip(question, 120)}" — ${[p.venue, p.year, `${p.cited_by_count ?? 0} cites`].filter(Boolean).join(", ")}.`,
      url: p.url,
      year: p.year ?? null,
      meta: { via: "methodsmatcher", cited_by_count: p.cited_by_count ?? 0 },
      provenance: { retriever: "methods", call },
    }));
    const match: MethodsMatch = {
      recommendation: output.recommendation || "(no recommendation returned)",
      methods: (output.recommended_methods ?? []).slice(0, 6).map((m) => ({ method: m.method, papers_in_set: m.papers_in_set })),
      tools: (output.our_tools ?? []).map((t) => ({ slug: t.slug, name: t.name, answers: t.answers })),
      degraded: !!output.degraded,
      call,
      ok: true,
    };
    return { match, sources, log: { retriever: "methods", call, ok: true, count: sources.length } };
  } catch (e) {
    const match: MethodsMatch = { recommendation: "(MethodsMatcher unreachable)", methods: [], tools: [], degraded: true, call, ok: false };
    return { match, sources: [], log: { retriever: "methods", call, ok: false, count: 0, note: String((e as Error).message) } };
  }
}
