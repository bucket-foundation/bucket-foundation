import { useEffect, useState } from "react";
import type { DataDetail, DataPage, DataQuery, DataRow, Dataset } from "../api";
import { openTab, patchTab, readTabs, windowStorage, writeTabs, type Tab, type Tabs, type TabStorage } from "../tabs";
import { TabBar } from "./TabBar";
import "../data.css";

export interface DataApi {
  data(): Promise<Dataset[]>;
  dataRecords(dataset: string, query?: DataQuery): Promise<DataPage>;
  dataRecord(dataset: string, id: string): Promise<DataDetail>;
  openLink(url: string): Promise<{ opened: string }>;
}

type Sort = NonNullable<DataQuery["sort"]>;

interface TableState {
  q: string;
  kind: string;
  sort: Sort | "";
  dir: "asc" | "desc";
  offset: number;
}

export type DataTab = Tab & { dataset: string; record?: string; table?: TableState };

export const DATA_TABS_KEY = "bucket.data.tabs";
export const PAGE_ROWS = 50;
export const FILTER_WAIT_MS = 200;
export const NO_DATA = "No data is loaded.";
export const NOT_LOADED = "This data is no longer loaded. Close this tab.";
export const NO_RECORDS = "This dataset holds no records.";
export const NOT_RECORDED = "Not recorded";
const TITLE_CHARS = 40;
const SORTS: Sort[] = ["title", "creators", "year", "kind"];
const COLUMNS: { sort: Sort; label: string }[] = [
  { sort: "title", label: "Title" },
  { sort: "creators", label: "By" },
  { sort: "year", label: "Year" },
  { sort: "kind", label: "Kind" },
];
const STORED: Record<NonNullable<Dataset["counts"][number]["stored"]>, string> = {
  encrypted: "stored encrypted",
  partly: "answer text stored encrypted",
  plain: "stored without encryption",
};
const START: TableState = { q: "", kind: "", sort: "", dir: "asc", offset: 0 };

const fmt = (n: number) => n.toLocaleString("en-US");
const short = (s: string) => (s.length > TITLE_CHARS ? `${s.slice(0, TITLE_CHARS - 1).trimEnd()}…` : s);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

function validTable(raw: unknown): TableState {
  const t = (raw ?? {}) as Partial<TableState>;
  return {
    q: typeof t.q === "string" ? t.q.slice(0, 200) : "",
    kind: typeof t.kind === "string" ? t.kind.slice(0, 64) : "",
    sort: SORTS.includes(t.sort as Sort) ? (t.sort as Sort) : "",
    dir: t.dir === "desc" ? "desc" : "asc",
    offset: Number.isInteger(t.offset) && (t.offset as number) >= 0 ? (t.offset as number) : 0,
  };
}

export function validDataTab(raw: unknown): DataTab | null {
  const t = raw as Partial<DataTab> | null;
  if (!t || typeof t !== "object" || !text(t.id, 1200) || !text(t.title, 200) || !text(t.dataset, 32)) return null;
  if (t.record !== undefined && !text(t.record, 1024)) return null;
  return t.record === undefined ? { id: t.id, title: t.title, dataset: t.dataset, table: validTable(t.table) } : { id: t.id, title: t.title, dataset: t.dataset, record: t.record };
}

function SourceLink({ api, url, onError, children }: { api: DataApi; url: string; onError: (m: string) => void; children: string }) {
  return (
    <button className="link" onClick={() => void api.openLink(url).catch((e: Error) => onError(e.message))}>
      {children}
    </button>
  );
}

function recordTotal(d: Dataset): number {
  const kinds = new Set(d.kinds.map((k) => k.id));
  return d.counts.filter((c) => kinds.has(c.kind)).reduce((n, c) => n + c.n, 0);
}

function DatasetCard({ api, d, onOpen, onError }: { api: DataApi; d: Dataset; onOpen: () => void; onError: (m: string) => void }) {
  return (
    <article className="panel dataset">
      <h2>{d.name}</h2>
      <p>{d.about}</p>
      <ul className="counts">
        {d.counts.map((c) => (
          <li key={c.kind}>
            <strong>{fmt(c.n)}</strong> {c.label}
            {c.stored && <span className="muted">, {STORED[c.stored]}</span>}
            {c.screen && (
              <a href={`#/${c.screen}`} aria-label={`Open ${c.label}`}>
                Open
              </a>
            )}
          </li>
        ))}
      </ul>
      {d.leftOut && (
        <p className="left-out">
          {fmt(d.leftOut.count)} records left out. {d.leftOut.reason}
        </p>
      )}
      {d.parts.length > 0 && (
        <details className="licences">
          <summary>Sources and licences</summary>
          <table>
            <tbody>
              {d.parts.map((p) => (
                <tr key={p.name}>
                  <th scope="row">
                    {p.name}
                    <span className="muted cite">
                      {fmt(p.count)} {p.unit}
                    </span>
                  </th>
                  <td>
                    {p.terms ?? "Licence not recorded."}{" "}
                    {p.link === null ? (
                      "Source not recorded."
                    ) : p.openable ? (
                      <SourceLink api={api} url={p.link} onError={onError}>
                        Open the source
                      </SourceLink>
                    ) : (
                      p.link
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {d.browsable && (
        <details className="fine">
          <summary>Details</summary>
          <dl>
            <dt>Version</dt>
            <dd>{d.version ?? NOT_RECORDED}</dd>
            <dt>Built</dt>
            <dd>{d.builtAt === null ? NOT_RECORDED : new Date(d.builtAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</dd>
            <dt>Checksum</dt>
            <dd>{d.checksum ?? NOT_RECORDED}</dd>
          </dl>
        </details>
      )}
      {d.browsable && (
        <button className="open" onClick={onOpen}>
          Browse {fmt(recordTotal(d))} records
        </button>
      )}
    </article>
  );
}

function TablePane({ api, d, table, onTable, onRecord, onError }: { api: DataApi; d: Dataset; table: TableState; onTable: (t: TableState) => void; onRecord: (r: DataRow) => void; onError: (m: string) => void }) {
  const [typed, setTyped] = useState(table.q);
  const [page, setPage] = useState<DataPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (typed === table.q) return;
    const t = setTimeout(() => onTable({ ...table, q: typed, offset: 0 }), FILTER_WAIT_MS);
    return () => clearTimeout(t);
  }, [typed, table, onTable]);

  useEffect(() => {
    let live = true;
    api.dataRecords(d.id, { q: table.q, kind: table.kind, sort: table.sort || undefined, dir: table.sort ? table.dir : undefined, offset: table.offset, limit: PAGE_ROWS }).then(
      (p) => {
        if (!live) return;
        setFailed(null);
        setPage(p);
      },
      (e: Error) => live && setFailed(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, d.id, table.q, table.kind, table.sort, table.dir, table.offset]);

  const sortBy = (sort: Sort) => onTable({ ...table, sort, dir: table.sort === sort && table.dir === "asc" ? "desc" : "asc", offset: 0 });
  const total = page?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_ROWS));
  const at = Math.floor(table.offset / PAGE_ROWS) + 1;

  return (
    <div className="data-table">
      <div className="toolbar">
        <input className="search" type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Filter by title, author or year" aria-label="Filter records" />
        <select value={table.kind} onChange={(e) => onTable({ ...table, kind: e.target.value, offset: 0 })} aria-label="Kind">
          <option value="">All kinds</option>
          {d.kinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {failed ? (
        <p className="banner" role="alert">
          {failed}
        </p>
      ) : !page ? (
        <p className="muted">Opening the records…</p>
      ) : total === 0 ? (
        <p className="muted">{table.q || table.kind ? (table.q ? `No record matches “${table.q}”.` : "No record is of that kind.") : NO_RECORDS}</p>
      ) : (
        <>
          <p className="muted" role="status">
            {fmt(page.offset + 1)} to {fmt(page.offset + page.records.length)} of {fmt(total)} records
          </p>
          <div className="panel rows">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.sort} scope="col" aria-sort={table.sort === c.sort ? (table.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <button className="sort" onClick={() => sortBy(c.sort)}>
                        {c.label}
                        {table.sort === c.sort && <span aria-hidden> {table.dir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  ))}
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {page.records.map((r) => (
                  <tr key={r.id}>
                    <td className="title">
                      <button className="link" onClick={() => onRecord(r)}>
                        {r.title}
                      </button>
                    </td>
                    <td>{r.creators}</td>
                    <td>{r.year}</td>
                    <td>{r.kindLabel}</td>
                    <td>
                      {r.source && r.openable && (
                        <SourceLink api={api} url={r.source} onError={onError}>
                          Open the source
                        </SourceLink>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button disabled={at <= 1} onClick={() => onTable({ ...table, offset: Math.max(0, table.offset - PAGE_ROWS) })}>
              Previous
            </button>
            <span className="muted">
              Page {fmt(at)} of {fmt(pages)}
            </span>
            <button disabled={at >= pages} onClick={() => onTable({ ...table, offset: table.offset + PAGE_ROWS })}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RecordPane({ api, dataset, id, onError }: { api: DataApi; dataset: string; id: string; onError: (m: string) => void }) {
  const [detail, setDetail] = useState<DataDetail | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setDetail(null);
    setFailed(null);
    api.dataRecord(dataset, id).then(
      (d) => live && setDetail(d),
      (e: Error) => live && setFailed(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, dataset, id]);

  if (failed)
    return (
      <p className="banner" role="alert">
        {failed}
      </p>
    );
  if (!detail) return <p className="muted">Opening the record…</p>;
  const r = detail.record;
  return (
    <article className="panel card record">
      <span className="tag ghost">{r.kindLabel}</span>
      <h2>{r.title}</h2>
      <dl>
        <dt>By</dt>
        <dd>{r.creators ?? NOT_RECORDED}</dd>
        <dt>Year</dt>
        <dd>{r.year ?? NOT_RECORDED}</dd>
        {detail.fields.map((f) => (
          <div key={f.label} className="field">
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
        <dt>Source</dt>
        <dd>
          {r.source === null ? (
            "No source link recorded."
          ) : r.openable ? (
            <SourceLink api={api} url={r.source} onError={onError}>
              Open the source in your browser
            </SourceLink>
          ) : (
            r.source
          )}
        </dd>
      </dl>
    </article>
  );
}

export function DataView({ api, storage = windowStorage() }: { api: DataApi; storage?: TabStorage | null }) {
  const [tabs, setTabs] = useState<Tabs<DataTab>>(() => readTabs(storage, DATA_TABS_KEY, validDataTab));
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.data().then(setDatasets, (e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    writeTabs(storage, DATA_TABS_KEY, tabs);
  }, [storage, tabs]);

  const active = tabs.tabs.find((t) => t.id === tabs.active) ?? null;
  const dataset = active ? (datasets?.find((d) => d.id === active.dataset) ?? null) : null;
  const openDataset = (d: Dataset) => setTabs((s) => openTab(s, { id: `set:${d.id}`, title: d.name, dataset: d.id, table: START }));
  const openRecord = (d: Dataset, r: DataRow) => setTabs((s) => openTab(s, { id: `rec:${d.id}:${r.id}`, title: short(r.title), dataset: d.id, record: r.id }));

  return (
    <section className="data">
      <header className="head">
        <h1>Data</h1>
        <p className="muted">What Bucket has loaded on this computer. Open a dataset or a record and it stays here as a tab.</p>
      </header>
      <TabBar label="Open data" home="All data" state={tabs} onChange={setTabs} />
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
      <div role="tabpanel">
        {datasets === null ? (
          !error && <p className="muted">Opening the list of data…</p>
        ) : active === null ? (
          datasets.length === 0 ? (
            <p className="muted">{NO_DATA}</p>
          ) : (
            <div className="datasets">
              {datasets.map((d) => (
                <DatasetCard key={d.id} api={api} d={d} onOpen={() => openDataset(d)} onError={setError} />
              ))}
            </div>
          )
        ) : !dataset || !dataset.browsable ? (
          <p className="muted">{NOT_LOADED}</p>
        ) : active.record !== undefined ? (
          <RecordPane key={active.id} api={api} dataset={dataset.id} id={active.record} onError={setError} />
        ) : (
          <TablePane key={active.id} api={api} d={dataset} table={active.table ?? START} onTable={(table) => setTabs((s) => patchTab(s, active.id, { table }))} onRecord={(r) => openRecord(dataset, r)} onError={setError} />
        )}
      </div>
    </section>
  );
}

