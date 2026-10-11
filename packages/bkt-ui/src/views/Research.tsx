import { useEffect, useRef, useState } from "react";
import type { Api, PackedFile, ReportAsset, ResearchDetail, ResearchRow } from "../api";
import { href, RESEARCH_TABS, type ResearchTab } from "../router";
import { useEngineImage } from "../use-engine-image";
import { Lesson } from "./Lesson";
import "../research.css";

export type ResearchApi = Pick<Api, "researchList" | "researchManifest" | "researchText" | "image">;

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
const TAB_LABELS: Record<ResearchTab, string> = { report: "Report", figures: "Figures" };
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
          {RESEARCH_TABS.map((t) => (
            <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => (window.location.hash = href({ name: "research", slug, tab: t }))}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      {d.unreadable ? <Unverified reason={d.unreadable} /> : tab === "figures" ? <Figures api={api} d={d} /> : <Report api={api} d={d} />}
    </section>
  );
}

export function ResearchView({ api, slug, tab }: { api: ResearchApi; slug?: string; tab: ResearchTab }) {
  return slug ? <Output api={api} slug={slug} tab={tab} /> : <List api={api} />;
}
