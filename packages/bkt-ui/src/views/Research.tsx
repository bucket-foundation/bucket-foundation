import { useEffect, useRef, useState } from "react";
import { EDIT_BYTES, EDIT_EXTS, type Api, type Change, type Exported, type PackedFile, type ReportAsset, type ResearchDetail, type ResearchRow, type TablePage } from "../api";
import { href, RESEARCH_TABS, type ResearchTab } from "../router";
import { useEngineImage } from "../use-engine-image";
import { FILTER_WAIT_MS, Pager, SortHead } from "./Data";
import { Lesson } from "./Lesson";
import "../research.css";

export type ResearchApi = Pick<Api, "researchList" | "researchManifest" | "researchText" | "researchTable" | "researchChanges" | "researchSource" | "researchSave" | "researchRevert" | "researchExport" | "image">;

type Loaded<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: string };

export const STAFF_ABSENT = "Staff data is absent from this build.";
export const NO_FIGURES = "This output lists no figures.";
export const UNVERIFIED = "Bucket could not verify the files of this output, so it stays closed.";

function host(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function Unverified({ reason }: { reason: string }) {
  return (
    <>
      <p className="error">{UNVERIFIED}</p>
      <details className="fine">
        <summary>Details</summary>
        <p>{reason}</p>
      </details>
    </>
  );
}
export const NO_ROWS = "This table holds no rows.";
export const NO_TABLES = "This output lists no tables.";
export const NO_RECORDS = "This output lists no records.";
export const SAVE_WAIT_MS = 700;
export const NO_CHANGES = "Nothing is changed. The files match the shipped version.";
const TAB_LABELS: Record<ResearchTab, string> = { report: "Report", data: "Data", figures: "Figures", records: "Records", changes: "Changes" };
const STATE_LABELS: Record<Change["state"], string> = { edited: "Edited here", "shipped-changed": "The shipped version changed", "base-unknown": "Edited before Bucket tracked it" };

export function editable(d: ResearchDetail): PackedFile[] {
  return d.files.filter((f) => EDIT_EXTS.some((ext) => f.path.toLowerCase().endsWith(ext)) && f.path.split("/").pop() !== "report.json" && f.size <= EDIT_BYTES);
}
const count = (n: number) => n.toLocaleString("en-US");
const heading = (column: string) => column.replace(/_/g, " ");

export function tabsFor(d: ResearchDetail): ResearchTab[] {
  const local = d.manifest.schema !== "bucket.report/1";
  return RESEARCH_TABS.filter((t) => t === "report" || t === "figures" || local);
}
const ORIGIN_LABELS: Record<ResearchRow["origin"], string> = { shipped: "Shipped", staff: "Staff", local: "Local" };

function useLoaded<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    load().then(
      (data) => alive && setState({ status: "ready", data }),
      (e: Error) => alive && setState({ status: "error", error: e.message }),
    );
    return () => {
      alive = false;
    };
  }, deps);
  return state;
}

export interface FigureItem {
  id: string;
  file: PackedFile | null;
  caption: string;
  licence: string;
  source: string | null;
}

export function figureItems(d: ResearchDetail): FigureItem[] {
  const byPath = new Map(d.files.map((f) => [f.path, f]));
  const assets: ReportAsset[] | undefined = d.manifest.assets;
  if (assets) return assets.map((a) => ({ id: a.id, file: byPath.get(a.path) ?? null, caption: a.caption, licence: a.licence, source: a.source && byPath.has(a.source) ? a.source : null }));
  const copies = d.files.filter((f) => f.role === "figure");
  return (d.manifest.figures ?? []).flatMap((fig, i) => {
    const name = fig.path.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "");
    const file = copies.find((f) => f.path.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "") === name) ?? null;
    return file ? [{ id: `figure-${i + 1}`, file, caption: fig.caption, licence: fig.licence, source: null }] : [];
  });
}

function List({ api }: { api: ResearchApi }) {
  const state = useLoaded(() => api.researchList(), [api]);
  return (
    <section>
      <header className="head">
        <h1>Research</h1>
        <p className="muted">Reports, figures and data that ship with this build, read from this computer.</p>
      </header>
      {state.status === "loading" && <p className="muted">Loading…</p>}
      {state.status === "error" && <p className="error">{state.error}</p>}
      {state.status === "ready" && state.data.outputs.length === 0 && <p className="muted">This build holds no research outputs.</p>}
      {state.status === "ready" && state.data.outputs.length > 0 && (
        <div className="panel">
          <table className="research-list">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Date</th>
                <th>Origin</th>
                <th>Changed files</th>
              </tr>
            </thead>
            <tbody>
              {state.data.outputs.map((o) => (
                <tr key={o.slug}>
                  <td>
                    <a className="link" href={href({ name: "research", slug: o.slug, tab: "report" })}>
                      {o.title}
                    </a>
                    {o.unreadable && <Unverified reason={o.unreadable} />}
                  </td>
                  <td>{o.kind}</td>
                  <td>{o.status}</td>
                  <td className="num">{o.date}</td>
                  <td>{ORIGIN_LABELS[o.origin]}</td>
                  <td className="num">{o.changed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Markdown({ api, slug, path }: { api: ResearchApi; slug: string; path: string }) {
  const state = useLoaded(() => api.researchText(slug, path), [api, slug, path]);
  if (state.status === "loading") return <p className="muted">Loading…</p>;
  if (state.status === "error") return <p className="error">{state.error}</p>;
  return <Lesson text={state.data} />;
}

function Report({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const m = d.manifest;
  const listed = new Set(d.files.map((f) => f.path));
  const paragraphs = m.abstract_paragraphs ?? (m.abstract ? [m.abstract] : []);
  const readme = m.tool?.readme && listed.has(m.tool.readme) ? m.tool.readme : null;
  const source = m.source_path.endsWith(".md") && listed.has(m.source_path) ? m.source_path : null;
  return (
    <div className="panel research-report">
      <p className="muted">{m.authors.join(", ")}</p>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <dl className="stats">
        <div>
          <dt>Licence</dt>
          <dd>{m.licence ?? "Not stated"}</dd>
        </div>
      </dl>
      <details className="fine">
        <summary>Details</summary>
        <dl>
          <dt>Checksum of the source</dt>
          <dd className="hash">{m.source_hash}</dd>
          {m.pdf_hash && (
            <>
              <dt>Checksum of the paper</dt>
              <dd className="hash">{m.pdf_hash}</dd>
            </>
          )}
        </dl>
      </details>
      {d.withheld > 0 && <p className="muted staff-absent">{STAFF_ABSENT}</p>}
      {m.attributions && m.attributions.length > 0 && (
        <>
          <h2>Attribution</h2>
          <table className="research-attributions">
            <thead>
              <tr>
                <th>Source</th>
                <th>Link</th>
                <th>Licence</th>
                <th>Rows</th>
                <th>Notice</th>
              </tr>
            </thead>
            <tbody>
              {m.attributions.map((a, i) => (
                <tr key={i}>
                  <td>{a.source}</td>
                  <td>{host(a.url)}</td>
                  <td>{a.licence}</td>
                  <td className="num">{a.rows.toLocaleString("en-US")}</td>
                  <td>{a.notice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {source && (
        <>
          <h2>Report text</h2>
          <Markdown api={api} slug={d.slug} path={source} />
        </>
      )}
      {readme && (
        <>
          <h2>Tool notes</h2>
          <Markdown api={api} slug={d.slug} path={readme} />
        </>
      )}
    </div>
  );
}

function useSeen(): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (seen || !el || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    watch.observe(el);
    return () => watch.disconnect();
  }, [seen]);
  return [ref, seen];
}

function Picture({ api, slug, item, show }: { api: ResearchApi; slug: string; item: FigureItem; show: boolean }) {
  const image = useEngineImage(api, slug, item.file, show);
  if (!item.file) return <p className="muted">This build holds no copy of this image.</p>;
  if (image.status === "ready") return <img src={image.src} alt={item.caption} />;
  if (image.status === "too-large") return <p className="muted">This image is over 8 MB and stays out of the window.</p>;
  if (image.status === "error") return <p className="error">{image.error}</p>;
  return <p className="muted">Loading…</p>;
}

function Thumb({ api, slug, item, onOpen }: { api: ResearchApi; slug: string; item: FigureItem; onOpen: () => void }) {
  const [ref, seen] = useSeen();
  return (
    <figure className="research-figure" ref={ref}>
      <button type="button" onClick={onOpen} aria-label={`Open ${item.caption}`}>
        <Picture api={api} slug={slug} item={item} show={seen} />
      </button>
      <figcaption>
        {item.caption}
        <span className="licence">{item.licence}</span>
      </figcaption>
    </figure>
  );
}

function Script({ api, slug, path }: { api: ResearchApi; slug: string; path: string }) {
  const state = useLoaded(() => api.researchText(slug, path), [api, slug, path]);
  if (state.status === "loading") return <p className="muted">Loading…</p>;
  if (state.status === "error") return <p className="error">{state.error}</p>;
  return <pre>{state.data}</pre>;
}

function Figures({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const items = figureItems(d);
  const [open, setOpen] = useState<string | null>(null);
  const full = items.find((i) => i.id === open);
  if (items.length === 0) return <p className="muted">{NO_FIGURES}</p>;
  return (
    <>
      {full && (
        <figure className="panel research-full">
          <div className="toolbar">
            <button type="button" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
          <Picture api={api} slug={d.slug} item={full} show />
          <figcaption>
            {full.caption}
            <span className="licence">{full.licence}</span>
          </figcaption>
          {full.source && (
            <details className="fine">
              <summary>Script that draws it</summary>
              <Script api={api} slug={d.slug} path={full.source} />
            </details>
          )}
        </figure>
      )}
      <div className="research-figures">
        {items.map((item) => (
          <Thumb key={item.id} api={api} slug={d.slug} item={item} onOpen={() => setOpen(item.id)} />
        ))}
      </div>
    </>
  );
}

interface PageState {
  q: string;
  sort: string;
  page: number;
}

function Rows({ api, slug, id, label, pick }: { api: ResearchApi; slug: string; id: string; label: string; pick?: { column: string; onPick: (row: Record<string, string>) => void } }) {
  const [state, setState] = useState<PageState>({ q: "", sort: "", page: 1 });
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState<TablePage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (typed === state.q) return;
    const t = setTimeout(() => setState((s) => ({ ...s, q: typed, page: 1 })), FILTER_WAIT_MS);
    return () => clearTimeout(t);
  }, [typed, state.q]);

  useEffect(() => {
    let live = true;
    api.researchTable(slug, id, { page: state.page, q: state.q || undefined, sort: state.sort || undefined }).then(
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
  }, [api, slug, id, state.page, state.q, state.sort]);

  if (failed) return <p className="banner" role="alert">{failed}</p>;
  if (!page) return <p className="muted">Opening the rows…</p>;
  const order = [...page.pinned, ...page.columns.filter((c) => !page.pinned.includes(c))].map((c) => ({ name: c, at: page.columns.indexOf(c), pinned: page.pinned.includes(c) }));
  const pages = Math.max(1, Math.ceil(page.total / page.size));
  const down = state.sort.startsWith("-");
  const sorted = down ? state.sort.slice(1) : state.sort;
  const start = (page.page - 1) * page.size;
  return (
    <div className="data-table research-table">
      <div className="toolbar">
        <input className="search" type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Filter the rows" aria-label={`Filter ${label}`} />
      </div>
      {page.truncated && <p className="muted">This table is longer than Bucket reads. The first {count(page.total)} rows are here.</p>}
      {page.total === 0 ? (
        <p className="muted">{state.q ? `No row matches “${state.q}”.` : NO_ROWS}</p>
      ) : (
        <>
          <p className="muted" role="status">
            {count(start + 1)} to {count(start + page.rows.length)} of {count(page.total)} rows
          </p>
          <div className="panel rows research-rows">
            <table>
              <thead>
                <tr>
                  {order.map((c) => (
                    <SortHead key={c.name} label={heading(c.name)} active={sorted === c.name} dir={down ? "desc" : "asc"} onSort={() => setState((s) => ({ ...s, sort: sorted === c.name && !down ? `-${c.name}` : c.name, page: 1 }))} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row, i) => (
                  <tr key={page.index[i]}>
                    {order.map((c) => (
                      <td key={c.name} className={c.pinned ? "pinned" : undefined}>
                        {pick && pick.column === c.name ? (
                          <button className="link" onClick={() => pick.onPick(Object.fromEntries(page.columns.map((name, at) => [name, row[at]])))}>
                            {row[c.at]}
                          </button>
                        ) : (
                          row[c.at]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager at={page.page} pages={pages} onPrev={() => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) }))} onNext={() => setState((s) => ({ ...s, page: s.page + 1 }))} />
        </>
      )}
    </div>
  );
}

function DataTab({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const tables = d.manifest.tables ?? [];
  const [open, setOpen] = useState(tables[0]?.id ?? "");
  const table = tables.find((t) => t.id === open) ?? tables[0];
  return (
    <>
      {d.withheld > 0 && <p className="muted staff-absent">{STAFF_ABSENT}</p>}
      {tables.length === 0 && d.withheld === 0 && <p className="muted">{NO_TABLES}</p>}
      {table && (
        <>
          <div className="toolbar">
            <div className="seg research-tables">
              {tables.map((t) => (
                <button key={t.id} type="button" className={t.id === table.id ? "on" : ""} onClick={() => setOpen(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <p className="muted licence-line">{table.licence === "mixed" ? "Each row carries its own licence and source." : `Licence: ${table.licence}`}</p>
          <Rows key={table.id} api={api} slug={d.slug} id={table.id} label={table.label} />
        </>
      )}
    </>
  );
}

function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="muted">None</span>;
  if (typeof value !== "object") return <>{String(value)}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="muted">None</span>;
    if (value.every((v) => v === null || typeof v !== "object")) return <>{value.map(String).join(", ")}</>;
    return (
      <ol className="record-items">
        {value.map((v, i) => (
          <li key={i}>
            <Value value={v} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <dl className="record-fields nested">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <dt>{heading(k)}</dt>
          <dd>
            <Value value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Record({ api, slug, path, title, onClose }: { api: ResearchApi; slug: string; path: string; title: string; onClose: () => void }) {
  const state = useLoaded(() => api.researchText(slug, path), [api, slug, path]);
  const [raw, setRaw] = useState(false);
  let parsed: Record<string, unknown> | null = null;
  if (state.status === "ready") {
    try {
      const value = JSON.parse(state.data) as unknown;
      parsed = value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }
  }
  return (
    <article className="panel research-record">
      <div className="toolbar">
        <button type="button" onClick={onClose}>
          All records
        </button>
        {parsed && (
          <button type="button" aria-pressed={raw} onClick={() => setRaw(!raw)}>
            {raw ? "Show the fields" : "Show the stored text"}
          </button>
        )}
      </div>
      <h2>{title}</h2>
      {state.status === "loading" && <p className="muted">Loading…</p>}
      {state.status === "error" && <p className="error">{state.error}</p>}
      {state.status === "ready" && !parsed && <p className="error">Bucket could not read this record.</p>}
      {state.status === "ready" && parsed && (raw ? <pre className="record-raw">{state.data}</pre> : <Value value={parsed} />)}
    </article>
  );
}

function Records({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const sets = d.manifest.record_sets ?? [];
  const [open, setOpen] = useState<{ path: string; title: string } | null>(null);
  if (sets.length === 0) return <p className="muted staff-absent">{d.withheld > 0 ? STAFF_ABSENT : NO_RECORDS}</p>;
  const set = sets[0];
  if (open) return <Record api={api} slug={d.slug} path={open.path} title={open.title} onClose={() => setOpen(null)} />;
  return (
    <>
      <p className="muted licence-line">
        {set.label}. Licence: {set.licence}
      </p>
      <Rows api={api} slug={d.slug} id={set.id} label={set.label} pick={{ column: "title", onPick: (row) => setOpen({ path: row.path, title: row.title }) }} />
    </>
  );
}

function Editor({ api, slug, path, onSaved }: { api: ResearchApi; slug: string; path: string; onSaved: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "saved" | "typing" | "saving" | "conflict" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const rev = useRef("");
  const stored = useRef("");
  const theirs = useRef("");

  const load = () => {
    setStatus("loading");
    return api.researchSource(slug, path).then(
      (r) => {
        rev.current = r.rev;
        stored.current = r.text;
        setText(r.text);
        setStatus("saved");
      },
      (e: Error) => {
        setError(e.message);
        setStatus("error");
      },
    );
  };

  useEffect(() => {
    void load();
  }, [api, slug, path]);

  const save = (body: string, base: string) => {
    setStatus("saving");
    return api.researchSave(slug, path, base, body).then(
      (r) => {
        if (!r.saved) {
          theirs.current = r.current;
          setStatus("conflict");
          return;
        }
        rev.current = r.rev;
        stored.current = body;
        setStatus("saved");
        onSaved();
      },
      (e: Error) => {
        setError(e.message);
        setStatus("error");
      },
    );
  };

  useEffect(() => {
    if (status !== "typing" || text === null) return;
    const t = setTimeout(() => void save(text, rev.current), SAVE_WAIT_MS);
    return () => clearTimeout(t);
  }, [status, text]);

  if (text === null) return status === "error" ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;
  return (
    <div className="research-editor">
      {status === "conflict" && (
        <div className="banner" role="alert">
          This file changed in another window.{" "}
          <button type="button" onClick={() => void load()}>
            Load that version
          </button>{" "}
          <button type="button" onClick={() => void save(text, theirs.current)}>
            Keep mine
          </button>
        </div>
      )}
      {status === "error" && <p className="error">{error}</p>}
      <textarea
        value={text}
        spellCheck={false}
        aria-label="File text"
        onChange={(e) => {
          setText(e.target.value);
          if (status !== "conflict") setStatus(e.target.value === stored.current ? "saved" : "typing");
        }}
      />
      <p className="muted save-state" role="status">
        {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "typing" ? "Not saved yet" : ""}
      </p>
    </div>
  );
}

function Diff({ change }: { change: Change }) {
  if (!change.hunks) return <p className="muted">This file is too large or holds bytes that are no text, so only its size shows: {count(change.shippedSize)} bytes shipped, {count(change.size)} bytes now.</p>;
  return (
    <div className="research-diff">
      {change.hunks.map((h, i) => (
        <pre key={i}>
          {h.lines.map((l, j) => (
            <span key={j} className={l.op === "+" ? "add" : l.op === "-" ? "del" : undefined}>
              {l.op}
              {l.text}
              {"\n"}
            </span>
          ))}
        </pre>
      ))}
    </div>
  );
}

function Changes({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const [tick, setTick] = useState(0);
  const state = useLoaded(() => api.researchChanges(d.slug), [api, d.slug, tick]);
  const [last, setLast] = useState<{ notice: string; changes: Change[] } | null>(null);
  const files = editable(d);
  const [editing, setEditing] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [exported, setExported] = useState<Exported | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (state.status === "ready") setLast(state.data);
  }, [state]);
  const refresh = () => setTick((n) => n + 1);
  const act = (run: () => Promise<unknown>) => {
    setFailed(null);
    void run().then(refresh, (e: Error) => setFailed(e.message));
  };
  if (state.status === "error" && !last) return <p className="error">{state.error}</p>;
  if (!last) return <p className="muted">Loading…</p>;
  return (
    <div className="research-changes">
      <p className="muted plain-store">{last.notice}</p>
      {failed && (
        <p className="banner" role="alert">
          {failed}
        </p>
      )}
      <div className="panel">
        <h2>Edit a file</h2>
        {files.length === 0 ? (
          <p className="muted">This output ships no file that can be edited here.</p>
        ) : (
          <>
            <select value={editing} onChange={(e) => setEditing(e.target.value)} aria-label="File to edit">
              <option value="">Choose a file</option>
              {files.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                </option>
              ))}
            </select>
            {editing && <Editor key={editing} api={api} slug={d.slug} path={editing} onSaved={refresh} />}
          </>
        )}
      </div>
      <div className="panel">
        <h2>Changed files</h2>
        {last.changes.length === 0 ? (
          <p className="muted">{NO_CHANGES}</p>
        ) : (
          <>
            <ul className="change-list">
              {last.changes.map((c) => (
                <li key={c.path}>
                  <div className="change-head">
                    <span className="change-path">{c.path}</span>
                    <span className="tag ghost">{STATE_LABELS[c.state]}</span>
                    <span className="muted">
                      {count(c.added)} added, {count(c.removed)} removed
                    </span>
                    <button type="button" onClick={() => setShown(shown === c.path ? null : c.path)}>
                      {shown === c.path ? "Hide the changes" : "Show the changes"}
                    </button>
                    {c.state !== "edited" && (
                      <button type="button" onClick={() => act(() => api.researchRevert(d.slug, c.path, true))}>
                        Keep mine
                      </button>
                    )}
                    <button type="button" onClick={() => act(() => api.researchRevert(d.slug, c.path).then(() => editing === c.path && setEditing("")))}>
                      Take the shipped version
                    </button>
                  </div>
                  {shown === c.path && <Diff change={c} />}
                </li>
              ))}
            </ul>
            <div className="toolbar">
              <button type="button" className="primary" onClick={() => act(() => api.researchExport(d.slug).then(setExported))}>
                Export the changes
              </button>
            </div>
          </>
        )}
        {exported && (
          <div className="research-export">
            <p>The export is in this folder:</p>
            <p className="hash">{exported.dir}</p>
            <ul>
              {exported.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Output({ api, slug, tab }: { api: ResearchApi; slug: string; tab: ResearchTab }) {
  const state = useLoaded(() => api.researchManifest(slug), [api, slug]);
  if (state.status === "loading") return <p className="muted">Loading…</p>;
  if (state.status === "error")
    return (
      <section>
        <p className="error">{state.error}</p>
        <a className="link" href={href({ name: "research" })}>
          All research
        </a>
      </section>
    );
  const d = state.data;
  return (
    <section>
      <header className="head">
        <h1>{d.manifest.title}</h1>
        <div className="research-meta">
          <a className="link" href={href({ name: "research" })}>
            All research
          </a>
          <span className="tag ghost">{d.manifest.kind}</span>
          <span className="tag ghost">{d.manifest.status}</span>
          <span className="tag ghost">{d.manifest.date}</span>
          <span className="tag ghost">{ORIGIN_LABELS[d.origin]}</span>
        </div>
      </header>
      <div className="toolbar">
        <div className="seg">
          {tabsFor(d).map((t) => (
            <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => (window.location.hash = href({ name: "research", slug, tab: t }))}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      {d.unreadable ? (
        <Unverified reason={d.unreadable} />
      ) : tab === "figures" ? (
        <Figures api={api} d={d} />
      ) : tab === "data" && tabsFor(d).includes("data") ? (
        <DataTab api={api} d={d} />
      ) : tab === "changes" && tabsFor(d).includes("changes") ? (
        <Changes api={api} d={d} />
      ) : tab === "records" && tabsFor(d).includes("records") ? (
        <Records api={api} d={d} />
      ) : (
        <Report api={api} d={d} />
      )}
    </section>
  );
}

export function ResearchView({ api, slug, tab }: { api: ResearchApi; slug?: string; tab: ResearchTab }) {
  return slug ? <Output api={api} slug={slug} tab={tab} /> : <List api={api} />;
}
