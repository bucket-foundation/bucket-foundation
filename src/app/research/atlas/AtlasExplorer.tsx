"use client";

// AtlasExplorer — the live, interactive explorer for the research-atlas graph.
// Drives the same-origin proxy /api/research/atlas (which forwards to the
// read-only atlas API on the Hetzner box). NO arbitrary SQL: it only calls the
// vetted endpoints (stats, search, funder portfolio, field top-funders/works,
// org summary, metascience). Stone-bone styling, graceful offline fallback.
//
//   /api/research/atlas?op=stats
//   /api/research/atlas?op=search&q=&kind=&limit=
//   /api/research/atlas?op=portfolio&id=<funder>&limit=
//   /api/research/atlas?op=field-funders&id=<field>&limit=
//   /api/research/atlas?op=field-works&id=<field>&limit=
//   /api/research/atlas?op=org&ror=<ror>
//   /api/research/atlas?op=metascience&name=&...

import { useCallback, useEffect, useState } from "react";

type SearchHit = {
  kind: "funder" | "field" | "org";
  id: string;
  name: string;
  detail: string | null;
  country_code: string | null;
};

type Stats = {
  funders: number;
  grants: number;
  organizations: number;
  persons: number;
  works: number;
  fields: number;
  usd_funded: number | null;
};

type Selected =
  | { kind: "funder"; id: string; name: string }
  | { kind: "field"; id: string; name: string }
  | { kind: "org"; id: string; name: string }
  | null;

const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString();
const fmtUsd = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

async function api<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`/api/research/atlas?${qs}`, { cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = body?.error?.code ?? `http_${r.status}`;
    throw Object.assign(new Error(body?.error?.message ?? code), { code, status: r.status });
  }
  return body as T;
}

export default function AtlasExplorer() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [offline, setOffline] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "funder" | "field" | "org">("all");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailWorks, setDetailWorks] = useState<unknown[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [err, setErr] = useState<string>("");

  // Headline stats on mount (proves the API is live).
  useEffect(() => {
    let cancel = false;
    api<Stats>({ op: "stats" })
      .then((s) => !cancel && setStats(s))
      .catch(() => !cancel && setOffline(true));
    return () => {
      cancel = true;
    };
  }, []);

  const runSearch = useCallback(async () => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    setErr("");
    try {
      const res = await api<{ results: SearchHit[] }>({
        op: "search",
        q: term,
        kind,
        limit: "20",
      });
      setHits(res.results ?? []);
    } catch (e) {
      const er = e as Error & { code?: string };
      if (er.code === "atlas_offline") setOffline(true);
      else setErr(er.message);
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, [q, kind]);

  const select = useCallback(async (hit: SearchHit) => {
    setSelected({ kind: hit.kind, id: hit.id, name: hit.name });
    setDetail(null);
    setDetailWorks([]);
    setErr("");
    setLoadingDetail(true);
    try {
      if (hit.kind === "funder") {
        const r = await api<{ portfolio: unknown[] }>({
          op: "portfolio",
          id: hit.id,
          limit: "12",
        });
        setDetail(r.portfolio);
      } else if (hit.kind === "field") {
        const [funders, works] = await Promise.all([
          api<{ top_funders: unknown[] }>({ op: "field-funders", id: hit.id, limit: "10" }),
          api<{ top_works: unknown[] }>({ op: "field-works", id: hit.id, limit: "10" }),
        ]);
        setDetail(funders.top_funders);
        setDetailWorks(works.top_works ?? []);
      } else if (hit.kind === "org") {
        const r = await api<unknown>({ op: "org", ror: hit.id });
        setDetail(r);
      }
    } catch (e) {
      const er = e as Error & { code?: string };
      if (er.code === "atlas_offline") setOffline(true);
      else setErr(er.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  if (offline) {
    return (
      <div className="mt-6 border border-dashed border-[color:var(--basalt-3)] bg-[color:var(--bone)] p-7">
        <div className="text-[10px] small-caps tracking-[0.16em] text-[color:var(--basalt-3)] border border-[color:var(--basalt-3)] inline-block px-2 py-0.5">
          atlas API offline
        </div>
        <p className="mt-4 text-[15px] leading-[1.8] text-[color:var(--basalt-2)]">
          The live query API is not reachable right now. The full graph is still
          available as open datasets and as the reproducible pipeline on GitHub
          (links below). Try again shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Live stats strip (proves the API is live) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines mb-8">
          <MiniStat label="funders" value={fmtInt(stats.funders)} />
          <MiniStat label="grants" value={fmtInt(stats.grants)} />
          <MiniStat label="funded (USD)" value={fmtUsd(stats.usd_funded)} />
          <MiniStat label="organizations" value={fmtInt(stats.organizations)} />
          <MiniStat label="works" value={fmtInt(stats.works)} />
          <MiniStat label="fields" value={fmtInt(stats.fields)} />
        </div>
      )}

      {/* Search */}
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-7">
        <div className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
          ask the graph — search funders, fields, organizations
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. crispr · quantum · national science foundation · MIT"
            className="flex-1 bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--basalt)]"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-3 py-3 text-[13px] small-caps tracking-[0.1em] text-[color:var(--basalt-2)]"
          >
            <option value="all">all</option>
            <option value="funder">funders</option>
            <option value="field">fields</option>
            <option value="org">orgs</option>
          </select>
          <button
            type="submit"
            disabled={searching}
            className="font-display uppercase text-[13px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors disabled:opacity-50"
          >
            {searching ? "…" : "query"}
          </button>
        </form>

        {err && (
          <p className="mt-3 text-[12px] text-[color:var(--aegean-deep)]">{err}</p>
        )}

        {hits.length > 0 && (
          <ul className="mt-5 divide-y divide-[color:var(--hairline)] border-t border-[color:var(--hairline)]">
            {hits.map((h) => (
              <li key={`${h.kind}:${h.id}`}>
                <button
                  onClick={() => void select(h)}
                  className="w-full text-left py-3 flex items-center gap-3 hover:bg-[color:var(--bone-2,rgba(0,0,0,0.02))] transition-colors"
                >
                  <span className="text-[9px] small-caps tracking-[0.14em] text-[color:var(--gold-deep,var(--basalt-3))] border border-[color:var(--hairline)] px-1.5 py-0.5 min-w-[52px] text-center">
                    {h.kind}
                  </span>
                  <span className="text-[14px] text-[color:var(--basalt)]">{h.name}</span>
                  {h.detail && (
                    <span className="text-[11px] text-[color:var(--basalt-3)]">
                      {h.detail}
                      {h.country_code ? ` · ${h.country_code}` : ""}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="mt-6 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="text-[9px] small-caps tracking-[0.14em] text-[color:var(--gold-deep,var(--basalt-3))] border border-[color:var(--hairline)] px-1.5 py-0.5">
              {selected.kind}
            </span>
            <h3 className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
              {selected.name}
            </h3>
          </div>
          <div className="w-9 h-0.5 bg-[color:var(--gold)] mt-2.5" />

          {loadingDetail && (
            <p className="mt-5 text-[13px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
              reading the graph…
            </p>
          )}

          {!loadingDetail && selected.kind === "funder" && (
            <PortfolioTable rows={detail as PortfolioRow[]} />
          )}
          {!loadingDetail && selected.kind === "field" && (
            <FieldDetail funders={detail as FunderRow[]} works={detailWorks as WorkRow[]} />
          )}
          {!loadingDetail && selected.kind === "org" && (
            <OrgSummary row={detail as OrgRow} />
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- //
//  Detail renderers                                                            //
// --------------------------------------------------------------------------- //

type PortfolioRow = { field: string; works: number; grants: number };
type FunderRow = { funder: string; short_name: string | null; country_code: string | null; works: number; grants: number };
type WorkRow = { title: string; doi: string | null; publication_year: number | null; cited_by_count: number | null };
type OrgRow = { name: string; ror_id: string; country_code: string | null; city: string | null; org_type: string | null; grants: number; usd_funded: number | null; works: number };

function PortfolioTable({ rows }: { rows: PortfolioRow[] | null }) {
  if (!rows?.length) return <Empty>No linked research output found for this funder.</Empty>;
  return (
    <>
      <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
        Research output by topic (funder → grant → work → field).
      </p>
      <table className="mt-4 w-full text-[13px]">
        <thead>
          <Th3 a="topic" b="works" c="grants" />
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[color:var(--hairline)]">
              <td className="py-2 pr-4 text-[color:var(--basalt)]">{r.field}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-[color:var(--basalt-2)]">{fmtInt(r.works)}</td>
              <td className="py-2 text-right tabular-nums text-[color:var(--basalt-2)]">{fmtInt(r.grants)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FieldDetail({ funders, works }: { funders: FunderRow[] | null; works: WorkRow[] | null }) {
  return (
    <>
      <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">Top funders of work in this field.</p>
      {funders?.length ? (
        <table className="mt-3 w-full text-[13px]">
          <thead><Th3 a="funder" b="works" c="grants" /></thead>
          <tbody>
            {funders.map((r, i) => (
              <tr key={i} className="border-t border-[color:var(--hairline)]">
                <td className="py-2 pr-4 text-[color:var(--basalt)]">
                  {r.funder}
                  {r.country_code ? <span className="text-[color:var(--basalt-3)]"> · {r.country_code}</span> : null}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-[color:var(--basalt-2)]">{fmtInt(r.works)}</td>
                <td className="py-2 text-right tabular-nums text-[color:var(--basalt-2)]">{fmtInt(r.grants)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No funders linked to this field.</Empty>
      )}

      <p className="mt-7 text-[13px] text-[color:var(--basalt-2)]">
        Most-cited works in this field (by citation count).
      </p>
      {works?.length ? (
        <ul className="mt-3 divide-y divide-[color:var(--hairline)] border-t border-[color:var(--hairline)]">
          {works.map((w, i) => (
            <li key={i} className="py-3">
              <div className="flex items-baseline gap-3">
                <span className="tabular-nums text-[12px] text-[color:var(--gold-deep,var(--basalt-3))] min-w-[64px]">
                  {fmtInt(w.cited_by_count)} cites
                </span>
                <span className="text-[13px] leading-[1.5] text-[color:var(--basalt)]">
                  {w.doi ? (
                    <a href={w.doi.startsWith("http") ? w.doi : `https://doi.org/${w.doi}`} target="_blank" rel="noopener noreferrer" className="underline decoration-[color:var(--gold)] underline-offset-2 hover:text-[color:var(--aegean-deep)]">
                      {w.title}
                    </a>
                  ) : (
                    w.title
                  )}
                  {w.publication_year ? <span className="text-[color:var(--basalt-3)]"> ({w.publication_year})</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No works linked to this field.</Empty>
      )}
    </>
  );
}

function OrgSummary({ row }: { row: OrgRow | null }) {
  if (!row) return <Empty>No summary available.</Empty>;
  return (
    <>
      <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
        {[row.org_type, row.city, row.country_code].filter(Boolean).join(" · ")}
        {row.ror_id ? (
          <>
            {" · "}
            <a href={row.ror_id} target="_blank" rel="noopener noreferrer" className="underline decoration-[color:var(--gold)] underline-offset-2">
              {row.ror_id.replace("https://ror.org/", "ror:")}
            </a>
          </>
        ) : null}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
        <MiniStat label="grants" value={fmtInt(row.grants)} />
        <MiniStat label="funded (USD)" value={fmtUsd(row.usd_funded)} />
        <MiniStat label="works" value={fmtInt(row.works)} />
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--bone)] p-4 md:p-5">
      <div className="font-display text-[clamp(1.2rem,2.6vw,1.8rem)] leading-none text-[color:var(--basalt)]">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
        {label}
      </div>
    </div>
  );
}

function Th3({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr className="text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
      <th className="text-left font-normal pb-1">{a}</th>
      <th className="text-right font-normal pb-1">{b}</th>
      <th className="text-right font-normal pb-1">{c}</th>
    </tr>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[13px] text-[color:var(--basalt-3)]">{children}</p>;
}
