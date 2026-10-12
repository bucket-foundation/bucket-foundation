import { useEffect, useRef, useState } from "react";
import { Tex } from "@/components/math/InlineMath";
import { EDIT_BYTES, EDIT_EXTS, type Api, type Change, type Exported, type PackedFile, type PaperPage, type ReportAsset, type ResearchDetail, type ResearchRow, type TablePage } from "../api";
import { texPreview, type Block, type Inline } from "../tex-preview";
import { holdPendingSave } from "../pending-saves";
import { href, RESEARCH_TABS, type ResearchTab } from "../router";
import { useEngineImage, usePageImage } from "../use-engine-image";
import { FILTER_WAIT_MS, Pager, SortHead } from "./Data";
import { Lesson } from "./Lesson";
import "../research.css";

export type ResearchApi = Pick<Api, "researchList" | "researchManifest" | "researchText" | "researchTable" | "researchPage" | "researchChanges" | "researchSource" | "researchSave" | "researchRevert" | "researchExport" | "researchNew" | "researchUpload" | "image" | "openLink">;

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
export const PREVIEW_LABEL = "Preview";
export const PAGES_MOUNTED = 6;
export const PAGE_POLL_MS = 1000;
export const PAGE_POLLS = 90;
const TAB_LABELS: Record<ResearchTab, string> = { report: "Report", data: "Data", figures: "Figures", paper: "Paper", records: "Records", changes: "Changes" };
const SOURCE_EXTS = [".tex", ".bib", ".sty", ".md"];
const count = (n: number) => n.toLocaleString("en-US");
const heading = (column: string) => column.replace(/_/g, " ");

export const SAVE_WAIT_MS = 700;
export const NO_CHANGES = "Nothing is changed. The files match the shipped version.";
const STATE_LABELS: Record<Change["state"], string> = { edited: "Edited here", "shipped-changed": "The shipped version changed", "base-unknown": "Edited before Bucket tracked it" };

export function editable(d: ResearchDetail): PackedFile[] {
  return d.files.filter((f) => EDIT_EXTS.some((ext) => f.path.toLowerCase().endsWith(ext)) && f.path.split("/").pop() !== "report.json" && f.size <= EDIT_BYTES);
}

export function tabsFor(d: ResearchDetail): ResearchTab[] {
  const local = d.manifest.schema !== "bucket.report/1";
  const paper = d.files.some((f) => f.role === "pdf" || f.role === "public-pdf") || d.manifest.source_path.endsWith(".tex");
  return RESEARCH_TABS.filter((t) => t === "report" || t === "figures" || (t === "paper" ? paper : local));
}
export const ORIGIN_LABELS: Record<ResearchRow["origin"], string> = { shipped: "Shipped", staff: "Staff", local: "Local" };

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

export const KIND_LABELS: Record<string, string> = { memo: "Memo", brief: "Brief", paper: "Paper", "dataset-report": "Dataset report" };
export const ROLE_LABELS: Record<string, string> = { report: "Report text", figure: "Figure", data: "Data table", paper: "Paper" };
export const UPLOAD_MAX_BYTES = 16 * 1024 * 1024;

export function shortName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

function NewOutput({ api }: { api: ResearchApi }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [kind, setKind] = useState("memo");
  const [failed, setFailed] = useState<string | null>(null);
  const name = slug ?? shortName(title);
  const create = () => {
    setFailed(null);
    void api.researchNew({ title: title.trim(), slug: name, kind }).then(
      (made) => (window.location.hash = href({ name: "research", slug: made.slug, tab: "report" })),
      (e: Error) => setFailed(e.message),
    );
  };
  return (
    <div className="panel research-new">
      <h2>New output</h2>
      <label>
        Title
        <input type="text" value={title} maxLength={500} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Short name
        <input type="text" value={name} maxLength={64} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label>
        Kind
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(KIND_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="primary" disabled={title.trim() === "" || name === ""} onClick={create}>
        Create the output
      </button>
      {failed && (
        <p className="banner" role="alert">
          {failed}
        </p>
      )}
      <p className="muted">It starts as a draft that stays on this computer.</p>
    </div>
  );
}

function AddFile({ api, slug, onAdded }: { api: ResearchApi; slug: string; onAdded: () => void }) {
  const [role, setRole] = useState("figure");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const add = (file: File | undefined) => {
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) return setNote({ ok: false, text: "That file is over 16 MB." });
    setNote(null);
    void api.researchUpload(slug, role, file.name, file).then(
      () => {
        setNote({ ok: true, text: `Added ${file.name}.` });
        onAdded();
      },
      (e: Error) => setNote({ ok: false, text: e.message }),
    );
  };
  return (
    <div className="research-add">
      <h2>Add a file</h2>
      <div className="toolbar">
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="What the file is">
          {Object.entries(ROLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <label className="file">
          <input type="file" onChange={(e) => (add(e.target.files?.[0]), (e.target.value = ""))} />
          <span>Choose a file</span>
        </label>
      </div>
      {note && (
        <p className={note.ok ? "muted" : "banner"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </div>
  );
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
      {state.status !== "loading" && <NewOutput api={api} />}
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

export const PLAIN_STORE = "Edits are kept on this computer as plain files, so the tools that build a paper can read them.";

export function Editor({ api, slug, path, onSaved, check }: { api: ResearchApi; slug: string; path: string; onSaved?: () => void; check?: (text: string) => string | null }) {
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
        onSaved?.();
      },
      (e: Error) => {
        setError(e.message);
        setStatus("error");
      },
    );
  };

  const unsaved = useRef<string | null>(null);
  const flush = useRef(() => {});
  flush.current = () => {
    const body = unsaved.current;
    if (body === null) return;
    unsaved.current = null;
    void save(body, rev.current);
  };

  useEffect(() => {
    unsaved.current = null;
    if (status !== "typing" || text === null || (check && check(text) !== null)) return;
    unsaved.current = text;
    const t = setTimeout(() => flush.current(), SAVE_WAIT_MS);
    return () => clearTimeout(t);
  }, [status, text]);

  useEffect(() => {
    const release = holdPendingSave(() => flush.current());
    return () => {
      release();
      flush.current();
    };
  }, []);

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
        {status === "typing" && check && check(text) !== null ? check(text) : status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "typing" ? "Not saved yet" : ""}
      </p>
      <p className="muted plain-store">{PLAIN_STORE}</p>
    </div>
  );
}

function canEdit(d: ResearchDetail, path: string | null | undefined): path is string {
  return typeof path === "string" && editable(d).some((f) => f.path === path);
}

function Markdown({ api, slug, path }: { api: ResearchApi; slug: string; path: string }) {
  const state = useLoaded(() => api.researchText(slug, path), [api, slug, path]);
  if (state.status === "loading") return <p className="muted">Loading…</p>;
  if (state.status === "error") return <p className="error">{state.error}</p>;
  return <Lesson text={state.data} />;
}

function ReportText({ api, d, path }: { api: ResearchApi; d: ResearchDetail; path: string }) {
  const [editing, setEditing] = useState(false);
  const [saves, setSaves] = useState(0);
  return (
    <>
      <h2>Report text</h2>
      {canEdit(d, path) && (
        <div className="toolbar">
          <button type="button" aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? "Close the editor" : "Edit the text"}
          </button>
        </div>
      )}
      {editing && <Editor api={api} slug={d.slug} path={path} onSaved={() => setSaves((n) => n + 1)} />}
      <Markdown key={`${saves}:${d.files.find((f) => f.path === path)?.sha256 ?? ""}`} api={api} slug={d.slug} path={path} />
    </>
  );
}

function Report({ api, d, onAdded }: { api: ResearchApi; d: ResearchDetail; onAdded: () => void }) {
  const m = d.manifest;
  const listed = new Set(d.files.map((f) => f.path));
  const paragraphs = m.abstract_paragraphs ?? (m.abstract ? [m.abstract] : []);
  const readme = m.tool?.readme && listed.has(m.tool.readme) ? m.tool.readme : null;
  const source = m.source_path.endsWith(".md") && listed.has(m.source_path) ? m.source_path : null;
  return (
    <div className="panel research-report">
      <p className="muted">{m.authors.join(", ")}</p>
      {d.origin === "local" && <AddFile api={api} slug={d.slug} onAdded={onAdded} />}
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
      {source && <ReportText api={api} d={d} path={source} />}
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
              {canEdit(d, full.source) ? <Editor api={api} slug={d.slug} path={full.source} /> : <Script api={api} slug={d.slug} path={full.source} />}
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

export function Rows({ api, slug, id, label, pick }: { api: ResearchApi; slug: string; id: string; label: string; pick?: { column: string; onPick: (row: Record<string, string>) => void } }) {
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

type TableEntry = NonNullable<ResearchDetail["manifest"]["tables"]>[number];
type RecordSetEntry = NonNullable<ResearchDetail["manifest"]["record_sets"]>[number];

export function TablePane({ api, d, table }: { api: ResearchApi; d: ResearchDetail; table: TableEntry }) {
  const [editing, setEditing] = useState(false);
  const [saves, setSaves] = useState(0);
  return (
    <>
      <p className="muted licence-line">{table.licence === "mixed" ? "Each row carries its own licence and source." : `Licence: ${table.licence}`}</p>
      {canEdit(d, table.path) && (
        <div className="toolbar">
          <button type="button" aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? "Close the editor" : "Edit the text"}
          </button>
        </div>
      )}
      {editing && canEdit(d, table.path) && <Editor api={api} slug={d.slug} path={table.path} onSaved={() => setSaves((n) => n + 1)} />}
      <Rows key={saves} api={api} slug={d.slug} id={table.id} label={table.label} />
    </>
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
          <TablePane key={table.id} api={api} d={d} table={table} />
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

function validJson(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch {
    return "This text does not parse yet, so it is not saved.";
  }
}

export function Record({ api, slug, path, title, onClose, canEditRecord }: { api: ResearchApi; slug: string; path: string; title: string; onClose: () => void; canEditRecord: boolean }) {
  const [saves, setSaves] = useState(0);
  const state = useLoaded(() => api.researchText(slug, path), [api, slug, path, saves]);
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
      {state.status === "ready" && parsed && (raw ? canEditRecord ? <Editor api={api} slug={slug} path={path} check={validJson} onSaved={() => setSaves((n) => n + 1)} /> : <pre className="record-raw">{state.data}</pre> : <Value value={parsed} />)}
    </article>
  );
}

export function RecordSetPane({ api, d, set }: { api: ResearchApi; d: ResearchDetail; set: RecordSetEntry }) {
  const [open, setOpen] = useState<{ path: string; title: string } | null>(null);
  if (open) return <Record api={api} slug={d.slug} path={open.path} title={open.title} onClose={() => setOpen(null)} canEditRecord={canEdit(d, open.path)} />;
  return (
    <>
      <p className="muted licence-line">
        {set.label}. Licence: {set.licence}
      </p>
      <Rows api={api} slug={d.slug} id={set.id} label={set.label} pick={{ column: "title", onPick: (row) => setOpen({ path: row.path, title: row.title }) }} />
    </>
  );
}

function Records({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const sets = d.manifest.record_sets ?? [];
  if (sets.length === 0) return <p className="muted staff-absent">{d.withheld > 0 ? STAFF_ABSENT : NO_RECORDS}</p>;
  return <RecordSetPane api={api} d={d} set={sets[0]} />;
}

function Linked({ api, url, label }: { api: ResearchApi; url: string; label: string }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <span className="tex-link">
      {label}{" "}
      <button type="button" className="link" onClick={() => void api.openLink(url).then(() => setNote(null), (e: Error) => setNote(e.message))}>
        Open
      </button>
      {note && <span className="error"> {note}</span>}
    </span>
  );
}

function Inlines({ api, items }: { api: ResearchApi; items: Inline[] }) {
  return (
    <>
      {items.map((x, i) =>
        x.t === "math" ? (
          <Tex key={i} tex={x.tex} display={false} />
        ) : x.t === "link" ? (
          <Linked key={i} api={api} url={x.url} label={x.v} />
        ) : x.t === "em" ? (
          <em key={i}>{x.v}</em>
        ) : x.t === "strong" ? (
          <strong key={i}>{x.v}</strong>
        ) : x.t === "code" ? (
          <code key={i}>{x.v}</code>
        ) : (
          <span key={i}>{x.v}</span>
        ),
      )}
    </>
  );
}

function PreviewFigure({ api, d, name }: { api: ResearchApi; d: ResearchDetail; name: string }) {
  const stem = name.replace(/\.[A-Za-z0-9]+$/, "");
  const item = figureItems(d).find((f) => f.file !== null && f.file.path.split("/").pop()!.replace(/\.[A-Za-z0-9]+$/, "") === stem);
  const [ref, seen] = useSeen();
  if (!item) return <p className="muted tex-missing">A figure sits here in the paper. This build holds no copy of it.</p>;
  return (
    <figure className="research-figure" ref={ref}>
      <Picture api={api} slug={d.slug} item={item} show={seen} />
      <figcaption>{item.caption}</figcaption>
    </figure>
  );
}

export function TexBlocks({ api, d, blocks }: { api: ResearchApi; d: ResearchDetail; blocks: Block[] }) {
  return (
    <div className="lesson tex-preview">
      {blocks.map((b, i) =>
        b.k === "heading" ? (
          b.level === 1 ? (
            <h2 key={i}>
              <Inlines api={api} items={b.inline} />
            </h2>
          ) : (
            <h3 key={i}>
              <Inlines api={api} items={b.inline} />
            </h3>
          )
        ) : b.k === "para" ? (
          <p key={i}>
            <Inlines api={api} items={b.inline} />
          </p>
        ) : b.k === "list" ? (
          b.ordered ? (
            <ol key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inlines api={api} items={it} />
                </li>
              ))}
            </ol>
          ) : (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inlines api={api} items={it} />
                </li>
              ))}
            </ul>
          )
        ) : b.k === "math" ? (
          <div key={i} className="tex-display">
            <Tex tex={b.tex} display />
          </div>
        ) : b.k === "figure" ? (
          <PreviewFigure key={i} api={api} d={d} name={b.name} />
        ) : (
          <p key={i} className="tex-table">
            A table sits here in the paper.{" "}
            <a className="link" href={href({ name: "research", slug: d.slug, tab: "data" })}>
              Open the Data tab
            </a>
          </p>
        ),
      )}
    </div>
  );
}

function PdfPage({ api, slug, pdf, n, show }: { api: ResearchApi; slug: string; pdf: string; n: number; show: boolean }) {
  const image = usePageImage(api, slug, pdf, n, show);
  return (
    <div className="pdf-page" data-page={n}>
      {image.status === "ready" ? <img src={image.src} alt={`Page ${n}`} /> : image.status === "error" ? <p className="error">{image.error}</p> : <p className="muted">Page {n}</p>}
    </div>
  );
}

export function PdfPane({ api, slug, pdf, pages }: { api: ResearchApi; slug: string; pdf: string; pages: number }) {
  const [at, setAt] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement | undefined)?.dataset?.page)).filter((n) => Number.isInteger(n) && n >= 1);
      if (seen.length) setAt(Math.min(...seen));
    });
    for (const child of Array.from(el.children)) watch.observe(child);
    return () => watch.disconnect();
  }, [pages]);
  const first = Math.max(1, Math.min(at - 2, pages - PAGES_MOUNTED + 1));
  return (
    <div className="pdf-pane" ref={box}>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <PdfPage key={n} api={api} slug={slug} pdf={pdf} n={n} show={n >= first && n < first + PAGES_MOUNTED} />
      ))}
    </div>
  );
}

function Rendered({ api, d, source }: { api: ResearchApi; d: ResearchDetail; source: string | null }) {
  const [page, setPage] = useState<PaperPage | { state: "error"; error: string } | null>(null);
  useEffect(() => {
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = () =>
      api.researchPage(d.slug, 1).then(
        (p) => {
          if (!alive) return;
          if (p.state === "rendering" && tries++ < PAGE_POLLS) timer = setTimeout(ask, PAGE_POLL_MS);
          else setPage(p.state === "rendering" ? { state: "preview", reason: "", install: null } : p);
        },
        (e: Error) => alive && setPage({ state: "error", error: e.message }),
      );
    setPage(null);
    void ask();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [api, d.slug]);
  if (page === null || page.state === "rendering") return <p className="muted">Drawing the pages…</p>;
  if (page.state === "ready") return <PdfPane api={api} slug={d.slug} pdf={page.pdf} pages={page.pages} />;
  const preview = source === null ? null : texPreview(source);
  return (
    <>
      <p className="tag ghost preview-label">{PREVIEW_LABEL}</p>
      {page.state === "error" ? (
        <p className="error">{page.error}</p>
      ) : (
        <>
          <p className="muted">This computer lacks the tool that draws the pages, so the paper shows as plain text and math.</p>
          {page.install && (
            <details className="fine">
              <summary>How to get the pages</summary>
              <p>Run this in a terminal, then open the paper again:</p>
              <pre>{page.install}</pre>
            </details>
          )}
        </>
      )}
      {preview ? (
        <>
          <TexBlocks api={api} d={d} blocks={preview.blocks} />
          {preview.truncated && <p className="muted">The paper is longer than the preview shows.</p>}
        </>
      ) : (
        <p className="muted">This output ships its paper without the source, so there is no preview.</p>
      )}
    </>
  );
}

function Paper({ api, d }: { api: ResearchApi; d: ResearchDetail }) {
  const listed = new Set(d.files.map((f) => f.path));
  const paper = d.manifest.paper;
  const sources = [d.manifest.source_path, ...(paper?.includes ?? []), ...(paper?.bib ?? []), ...(paper?.style ?? [])].filter((p, i, all) => listed.has(p) && SOURCE_EXTS.some((ext) => p.endsWith(ext)) && all.indexOf(p) === i);
  const main = sources[0] === d.manifest.source_path && sources[0].endsWith(".tex") ? sources[0] : null;
  const [open, setOpen] = useState(sources[0] ?? "");
  const [saves, setSaves] = useState(0);
  const text = useLoaded(() => (open && !canEdit(d, open) ? api.researchText(d.slug, open) : Promise.resolve("")), [api, d.slug, open]);
  const entry = useLoaded(() => (main ? api.researchText(d.slug, main) : Promise.resolve(null)), [api, d.slug, main, saves]);
  return (
    <div className={sources.length ? "paper-split" : "paper-single"}>
      {sources.length > 0 && (
        <div className="panel paper-source">
          <div className="toolbar">
            <select value={open} onChange={(e) => setOpen(e.target.value)} aria-label="Source file">
              {sources.map((p) => (
                <option key={p} value={p}>
                  {p.split("/").slice(-2).join("/")}
                </option>
              ))}
            </select>
          </div>
          {canEdit(d, open) ? (
            <Editor key={open} api={api} slug={d.slug} path={open} onSaved={() => setSaves((n) => n + 1)} />
          ) : (
            <>
              {text.status === "loading" && <p className="muted">Loading…</p>}
              {text.status === "error" && <p className="error">{text.error}</p>}
              {text.status === "ready" && <pre>{text.data}</pre>}
            </>
          )}
        </div>
      )}
      <div className="panel paper-view">{entry.status === "loading" ? <p className="muted">Loading…</p> : <Rendered api={api} d={d} source={entry.status === "ready" ? entry.data : null} />}</div>
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
      <p className="muted">Edit a file in its own tab: the paper source under Paper, a table under Data, a record under Records.</p>
      {failed && (
        <p className="banner" role="alert">
          {failed}
        </p>
      )}
      <div className="panel">
        <h2>Changed files</h2>
        {last.changes.length === 0 ? (
          <>
            <p className="muted">{NO_CHANGES}</p>
            {d.origin === "local" && (
              <div className="toolbar">
                <button type="button" className="primary" onClick={() => act(() => api.researchExport(d.slug).then(setExported))}>
                  Export this output
                </button>
              </div>
            )}
          </>
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
                    <button type="button" onClick={() => act(() => api.researchRevert(d.slug, c.path))}>
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
  const [adds, setAdds] = useState(0);
  const state = useLoaded(() => api.researchManifest(slug), [api, slug, adds]);
  const [held, setHeld] = useState<ResearchDetail | null>(null);
  useEffect(() => {
    if (state.status === "ready") setHeld(state.data);
  }, [state]);
  if (state.status === "loading" && !held) return <p className="muted">Loading…</p>;
  if (state.status === "error")
    return (
      <section>
        <p className="error">{state.error}</p>
        <a className="link" href={href({ name: "research" })}>
          All research
        </a>
      </section>
    );
  const d = state.status === "ready" ? state.data : (held as ResearchDetail);
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
      ) : tab === "paper" && tabsFor(d).includes("paper") ? (
        <Paper api={api} d={d} />
      ) : tab === "records" && tabsFor(d).includes("records") ? (
        <Records api={api} d={d} />
      ) : (
        <Report api={api} d={d} onAdded={() => setAdds((n) => n + 1)} />
      )}
    </section>
  );
}

export function ResearchView({ api, slug, tab }: { api: ResearchApi; slug?: string; tab: ResearchTab }) {
  return slug ? <Output api={api} slug={slug} tab={tab} /> : <List api={api} />;
}
