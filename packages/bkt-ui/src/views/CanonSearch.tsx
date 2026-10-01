import { useEffect, useState, type FormEvent } from "react";
import type { CanonAbout, CanonExcerpt, CanonHit } from "../api";
import { href } from "../router";

export interface CanonSearchApi {
  canonSearch(q: string, branch?: string, topK?: number): Promise<CanonHit[]>;
  canonExcerpt(id: number): Promise<CanonExcerpt>;
  canonAbout(): Promise<CanonAbout>;
  openLink(url: string): Promise<{ opened: string }>;
}

const label = (branch: string) => branch.replace(/^\d+-/, "").replace(/-/g, " ");
const KIND: Record<string, string> = { yt: "video", pubmed: "PubMed", arxiv: "arXiv", gutenberg: "Gutenberg", wikisource: "Wikisource", openalex: "OpenAlex", archive: "Internet Archive", blog: "article", _intake: "Bucket notes" };

function SourceLink({ api, url, onError, children }: { api: CanonSearchApi; url: string | null; onError: (m: string) => void; children: string }) {
  if (!url) return null;
  return (
    <button className="link" onClick={() => void api.openLink(url).catch((e: Error) => onError(e.message))}>
      {children}
    </button>
  );
}

export function CanonSearchView({ api, id }: { api: CanonSearchApi; id?: number }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [hits, setHits] = useState<CanonHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [about, setAbout] = useState<CanonAbout | null>(null);
  const [detail, setDetail] = useState<CanonExcerpt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.canonAbout().then(setAbout, (e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    setDetail(null);
    if (id === undefined) return;
    let live = true;
    api.canonExcerpt(id).then(
      (d) => live && setDetail(d),
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, id]);

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

  const conceptName = detail ? detail.concept.replace(/-/g, " ") : "";

  return (
    <section>
      <header className="head">
        <h1>Canon search</h1>
        <p className="muted">{about ? `${about.excerpts} source excerpts on this computer. Keyword search works with the network off.` : "Opening the canon pack…"}</p>
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
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
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
          {detail ? (
            <>
              <span className="tag ghost">{label(detail.branch)}</span>
              <h2>{conceptName}</h2>
              <blockquote>{detail.text.slice(detail.title.length + 2)}</blockquote>
              <p className="muted">
                {detail.source.title}
                {detail.source.timestamp ? `, at ${detail.source.timestamp.slice(0, 8)}` : ""}
              </p>
              <p className="links">
                <SourceLink api={api} url={detail.source.url} onError={setError}>
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
                      <SourceLink api={api} url={p.url} onError={setError}>
                        Open the source
                      </SourceLink>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p className="muted">{id === undefined ? "Pick an excerpt to read it with its evidence." : "Opening the excerpt…"}</p>
          )}
        </aside>
      </div>
      {about && about.licences.length > 0 && (
        <details className="panel licences">
          <summary>Sources and licences</summary>
          <table>
            <tbody>
              {about.licences.map((l) => (
                <tr key={l.kind}>
                  <th scope="row">{l.name}</th>
                  <td>
                    {l.terms}{" "}
                    <SourceLink api={api} url={l.url} onError={setError}>
                      Terms
                    </SourceLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
