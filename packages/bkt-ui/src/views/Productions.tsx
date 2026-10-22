import { useCallback, useEffect, useState, type FormEvent } from "react";
import { href } from "../router";
import "../ros.css";

interface Production {
  id: string;
  kind: string;
  status: string;
  claim: string | null;
  target_node_id: string;
  related_node_id: string | null;
  sources: string[];
  updated_at: string;
}

interface Data {
  productions: Production[];
  nodes: Record<string, { slug: string; title: string; kind: string }>;
}

interface Hit {
  id: string;
  slug: string;
  title: string;
  branch: string;
}

const API = "/api/research-os/production";
const KIND: Record<string, string> = { production: "production", extension: "extension", replication: "replication", peer_review: "peer review" };

export const NO_DRAFTS = "No drafts yet. Pick an idea, write the claim and the sources it rests on, and save it here.";
export const SUBMIT_NOTE = "Drafts stay on this computer. A teacher reviews a production once you submit it on the website.";
export const LOAD_TROUBLE = "Bucket could not load your drafts. Try again.";
export const SAVE_TROUBLE = "Bucket could not save the draft. Try again.";
export const PICK_IDEA = "Pick the idea this claim is about.";

function NodeLink({ id, nodes }: { id: string; nodes: Data["nodes"] }) {
  const n = nodes[id];
  return n ? <a href={href({ name: "node", slug: n.slug })}>{n.title}</a> : <>an idea</>;
}

function Draft({ p, nodes, onEdit }: { p: Production; nodes: Data["nodes"]; onEdit: () => void }) {
  const kind = KIND[p.kind] ?? p.kind;
  return (
    <li className="production">
      <div className="row">
        <strong>{p.claim?.trim() || `Untitled ${kind}`}</strong>
        <button type="button" className="ghost" onClick={onEdit}>
          Edit
        </button>
      </div>
      <p className="muted">
        {p.kind === "production" ? "On " : `${kind[0].toUpperCase()}${kind.slice(1)} of `}
        <NodeLink id={p.kind === "production" ? p.target_node_id : p.related_node_id ?? p.target_node_id} nodes={nodes} />
        {" · "}
        {p.sources.length === 1 ? "1 source" : `${p.sources.length} sources`}
        {" · "}
        {new Date(p.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
    </li>
  );
}

function IdeaPicker({ picked, onPick }: { picked: Hit | null; onPick: (h: Hit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (!term) return setHits([]);
    let alive = true;
    fetch(`/api/research-os/search?q=${encodeURIComponent(term)}&limit=6`)
      .then((r) => (r.ok ? (r.json() as Promise<{ results: Hit[] }>) : { results: [] }))
      .then((d) => alive && setHits(d.results), () => alive && setHits([]));
    return () => {
      alive = false;
    };
  }, [q]);
  return (
    <div className="idea-picker">
      <label>
        Idea
        <input type="search" value={q} placeholder={picked ? picked.title : "Search ideas"} onChange={(e) => setQ(e.target.value)} />
      </label>
      {hits.length > 0 && (
        <ul className="hits">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" className={picked?.id === h.id ? "on" : ""} onClick={() => (onPick(h), setQ(""))}>
                {h.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && <p className="muted">About {picked.title}</p>}
    </div>
  );
}

function DraftForm({ editing, nodes, onSaved }: { editing: Production | null; nodes: Data["nodes"]; onSaved: () => void }) {
  const start = editing ? nodes[editing.target_node_id] : undefined;
  const [idea, setIdea] = useState<Hit | null>(editing && start ? { id: editing.target_node_id, slug: start.slug, title: start.title, branch: "" } : null);
  const [claim, setClaim] = useState(editing?.claim ?? "");
  const [sources, setSources] = useState(editing?.sources.join("\n") ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!idea) return setError(PICK_IDEA);
    setError(null);
    const body = { id: editing?.id, targetNodeId: idea.id, claim, sources: sources.split("\n"), status: "draft" };
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!r?.ok) return setError(SAVE_TROUBLE);
    if (!editing) {
      setIdea(null);
      setClaim("");
      setSources("");
    }
    onSaved();
  };

  return (
    <form className="panel card draft-form" onSubmit={(e) => void save(e)}>
      <h2>{editing ? "Edit draft" : "New draft"}</h2>
      <IdeaPicker picked={idea} onPick={setIdea} />
      <label>
        Claim
        <textarea rows={3} maxLength={4000} value={claim} onChange={(e) => setClaim(e.target.value)} />
      </label>
      <label>
        Sources, one per line
        <textarea rows={3} value={sources} onChange={(e) => setSources(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Save draft</button>
    </form>
  );
}

export function ProductionsView() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Production | null>(null);

  const load = useCallback(() => {
    fetch(API, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => (setError(false), setData(d)), () => setError(true));
  }, []);

  useEffect(load, [load]);

  return (
    <section>
      <header className="head">
        <h1>Productions</h1>
        <p className="muted">A production is a claim you organize from quotes and sources. {SUBMIT_NOTE}</p>
      </header>
      {error && <p className="error">{LOAD_TROUBLE}</p>}
      {!data && !error && <p className="muted">Loading drafts…</p>}
      {data && (
        <>
          <DraftForm key={editing?.id ?? "new"} editing={editing} nodes={data.nodes} onSaved={() => (setEditing(null), load())} />
          <article className="panel card">
            <h2>
              Drafts <span className="muted">{data.productions.length}</span>
            </h2>
            {data.productions.length === 0 ? (
              <p className="muted">{NO_DRAFTS}</p>
            ) : (
              <ul className="productions">
                {data.productions.map((p) => (
                  <Draft key={p.id} p={p} nodes={data.nodes} onEdit={() => setEditing(p)} />
                ))}
              </ul>
            )}
          </article>
        </>
      )}
    </section>
  );
}
