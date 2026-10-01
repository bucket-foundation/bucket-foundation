import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import CanonGlobeMount, { type CanonCounts, type CanonFetcher, type CanonLinkMapper } from "@/app/canon/CanonGlobeMount";
import { ALL_EVENTS, ALL_SITES, MAX_YEAR, MIN_YEAR } from "@/lib/canon-explorer/markers";
import type { CanonAbout, CanonExcerpt, CanonHit } from "../api";
import { href } from "../router";
import "../ros.css";

export interface CanonSearchApi {
  canonSearch(q: string, branch?: string, topK?: number): Promise<CanonHit[]>;
  canonExcerpt(id: number): Promise<CanonExcerpt>;
  canonAbout(): Promise<CanonAbout>;
  openLink(url: string): Promise<{ opened: string }>;
}

export const CANON_CONTAINER =
  "relative w-full md:h-[calc(100vh-5rem)] md:min-h-[790px] md:max-h-[900px] px-4 md:px-6 md:pr-[440px] md:overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]";

const label = (branch: string) => branch.replace(/^\d+-/, "").replace(/-/g, " ");
const KIND: Record<string, string> = { yt: "video", pubmed: "PubMed", arxiv: "arXiv", gutenberg: "Gutenberg", wikisource: "Wikisource", openalex: "OpenAlex", archive: "Internet Archive", _intake: "Bucket notes" };

const era = (y: number) => (y < 0 ? `${-y} BCE` : `${y} CE`);

export function canonCounts(about: CanonAbout): CanonCounts {
  return { excerpts: about.excerpts, branches: about.branches.length, bridges: null, events: ALL_EVENTS.length + ALL_SITES.length, span: `${era(MIN_YEAR)}, ${era(MAX_YEAR)}` };
}

export function webglAvailable(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function canonLink(ids: ReadonlyMap<string, number>): CanonLinkMapper {
  return (path) => {
    const excerpt = /^\/excerpts\/([^/?#]+)\/([^/?#]+)$/.exec(path);
    if (excerpt) {
      const id = ids.get(`${excerpt[1]}/${excerpt[2]}`);
      return id === undefined ? null : href({ name: "search", id });
    }
    const find = /^\/canon\/search\?q=([^&#]+)$/.exec(path);
    if (!find) return null;
    try {
      return href({ name: "canon", find: decodeURIComponent(find[1]) });
    } catch {
      return null;
    }
  };
}

function SourceLink({ api, url, onError, children }: { api: CanonSearchApi; url: string | null; onError: (m: string) => void; children: string }) {
  if (!url) return null;
  return (
    <button className="link" onClick={() => void api.openLink(url).catch((e: Error) => onError(e.message))}>
      {children}
    </button>
  );
}

function useAbout(api: CanonSearchApi, onError: (m: string) => void): CanonAbout | null {
  const [about, setAbout] = useState<CanonAbout | null>(null);
  useEffect(() => {
    void api.canonAbout().then(setAbout, (e: Error) => onError(e.message));
  }, [api, onError]);
  return about;
}

function useExcerpt(api: CanonSearchApi, id: number | undefined, onError: (m: string) => void): CanonExcerpt | null {
  const [detail, setDetail] = useState<CanonExcerpt | null>(null);
  useEffect(() => {
    setDetail(null);
    if (id === undefined) return;
    let live = true;
    api.canonExcerpt(id).then(
      (d) => live && setDetail(d),
      (e: Error) => live && onError(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, id, onError]);
  return detail;
}

function Excerpt({ api, detail, onError }: { api: CanonSearchApi; detail: CanonExcerpt; onError: (m: string) => void }) {
  const conceptName = detail.concept.replace(/-/g, " ");
  return (
    <>
      <span className="tag ghost">{label(detail.branch)}</span>
      <h2>{conceptName}</h2>
      <blockquote>{detail.text.slice(detail.title.length + 2)}</blockquote>
      <p className="muted">
        {detail.source.title}
        {detail.source.timestamp ? `, at ${detail.source.timestamp.slice(0, 8)}` : ""}
      </p>
      <p className="links">
        <SourceLink api={api} url={detail.source.url} onError={onError}>
          Open the source in your browser
        </SourceLink>
      </p>
      <h3>Evidence</h3>
      {detail.evidence.length === 0 ? (
        <p className="muted">No evidence passage ships with this excerpt.</p>
      ) : (
        <ol className="evidence">
          {detail.evidence.map((p, i) => (
            <li key={i}>
              <span className="card-top">
                <span className="tag ghost">{KIND[p.kind] ?? p.kind}</span>
                <span className="mastery">{p.score.toFixed(2)}</span>
              </span>
              <p>{p.text}</p>
              <p className="muted cite">
                {p.title}
                {p.author ? `, ${p.author}` : ""}
                {p.url && !p.openable ? `, ${p.url}` : ""}
              </p>
              <SourceLink api={api} url={p.openable ? p.url : null} onError={onError}>
                Open the source
              </SourceLink>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Licences({ api, about, onError }: { api: CanonSearchApi; about: CanonAbout | null; onError: (m: string) => void }) {
  if (!about || about.licences.length === 0) return null;
  return (
    <details className="panel licences">
      <summary>Sources and licences</summary>
      <table>
        <tbody>
          {about.licences.map((l) => (
            <tr key={l.kind}>
              <th scope="row">
                {l.name}
                <span className="muted cite">{l.works} sources</span>
              </th>
              <td>
                {l.terms}{" "}
                <SourceLink api={api} url={l.url} onError={onError}>
                  Terms
                </SourceLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Problem({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="banner" role="alert">
      {error}
    </p>
  );
}

function KeywordSearch({ api, id, globe }: { api: CanonSearchApi; id?: number; globe: boolean }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [hits, setHits] = useState<CanonHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const about = useAbout(api, setError);
  const detail = useExcerpt(api, id, setError);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setError(null);
    try {
      const found = await api.canonSearch(query, branch);
      setHits(found.filter((h) => h.score > 0));
      setAsked(query);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      {globe && (
        <a className="back" href={href({ name: "canon" })}>
          Back to the globe
        </a>
      )}
      <header className="head">
        <h1>{globe ? "Canon search" : "Canon"}</h1>
        <p className="muted">{about ? `${about.excerpts} source excerpts on this computer. Keyword search works with the network off.` : "Opening the canon…"}</p>
        {!globe && <p className="muted">Bucket could not start 3D graphics on this computer, so the globe and the circle are hidden.</p>}
      </header>
      <form className="toolbar" onSubmit={run}>
        <input className="search canon-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="entropy, structured water, speed of light" aria-label="Search the canon" />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
          <option value="">All branches</option>
          {(about?.branches ?? []).map((b) => (
            <option key={b} value={b}>
              {label(b)}
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy || !q.trim()}>
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      <Problem error={error} />
      <div className="split canon-search">
        <div className="canon-hits">
          {asked === null ? (
            <p className="muted">Type a word or a phrase and press Search.</p>
          ) : hits.length === 0 ? (
            <p className="muted">No excerpt holds “{asked}”.</p>
          ) : (
            <>
              <p className="muted">
                {hits.length} excerpts for “{asked}”
              </p>
              {hits.map((h) => (
                <a key={h.claim_id} className={`panel hit${id === h.claim_id ? " on" : ""}`} href={href({ name: "search", id: h.claim_id })}>
                  <span className="card-top">
                    <span className="tag ghost">{label(h.branch)}</span>
                    <span className="muted">{h.concept.replace(/-/g, " ")}</span>
                    <span className="mastery">
                      {h.score} {h.score === 1 ? "match" : "matches"} · {h.evidence_count} evidence
                    </span>
                  </span>
                  <span className="hit-text">{h.excerpt.slice(h.title.length + 2)}</span>
                </a>
              ))}
            </>
          )}
        </div>
        <aside className="panel card canon-detail">
          {detail ? <Excerpt api={api} detail={detail} onError={setError} /> : <p className="muted">{id === undefined ? "Pick an excerpt to read it with its evidence." : "Opening the excerpt…"}</p>}
        </aside>
      </div>
      <Licences api={api} about={about} onError={setError} />
    </section>
  );
}

function GlobeScreen({ api, find }: { api: CanonSearchApi; find?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const about = useAbout(api, setError);
  const ids = useRef(new Map<string, number>());
  const linkFor = useMemo(() => canonLink(ids.current), []);
  const counts = useMemo(() => (about ? canonCounts(about) : null), [about]);

  const fetcher = useCallback<CanonFetcher>(
    async (url, { signal }) => {
      const p = new URL(url).searchParams;
      try {
        const hits = (await api.canonSearch(p.get("q") ?? "", p.get("branch") ?? "", Number(p.get("top_k")) || undefined)).filter((h) => h.score > 0);
        if (signal.aborted) throw Object.assign(new Error("search replaced by a newer one"), { name: "AbortError" });
        for (const h of hits) ids.current.set(`${h.concept}/${h.slug}`, h.claim_id);
        setError(null);
        return { ok: true, status: 200, json: async () => ({ results: hits }) };
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
        throw e;
      }
    },
    [api],
  );

  useEffect(() => {
    if (!find) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", find);
    url.hash = href({ name: "canon" });
    window.history.replaceState(window.history.state, "", url.toString());
    window.dispatchEvent(new Event("hashchange"));
    setRound((n) => n + 1);
  }, [find]);

  const onLink = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as Element).closest("a");
    const to = a?.getAttribute("href") ?? "";
    if (!a || to.startsWith("#/")) return;
    e.preventDefault();
    if (to === "/canon/search") window.location.hash = href({ name: "search" });
    if (/^https:\/\//.test(to)) void api.openLink(to).catch((err: Error) => setError(err.message));
  };

  return (
    <section>
      <header className="head slim">
        <h1>Canon</h1>
        <p className="muted">{about ? `${about.excerpts} source excerpts on this computer. Search and the globe work with the network off.` : "Opening the canon…"}</p>
      </header>
      <Problem error={error} />
      <div className="canon-site" onClickCapture={onLink}>
        {counts && <CanonGlobeMount key={round} branches={[]} containerClassName={CANON_CONTAINER} fetcher={fetcher} linkFor={linkFor} counts={counts} />}
      </div>
      <Licences api={api} about={about} onError={setError} />
    </section>
  );
}

export function CanonSearchView({ api, page, id, find, webgl }: { api: CanonSearchApi; page: "globe" | "search"; id?: number; find?: string; webgl?: boolean }) {
  const [drawable, setDrawable] = useState(() => webgl ?? webglAvailable());
  useEffect(() => {
    const refused = () => setDrawable(false);
    document.addEventListener("webglcontextcreationerror", refused, true);
    return () => document.removeEventListener("webglcontextcreationerror", refused, true);
  }, []);
  if (!drawable || page === "search") return <KeywordSearch api={api} id={id} globe={drawable} />;
  return <GlobeScreen api={api} find={find} />;
}
