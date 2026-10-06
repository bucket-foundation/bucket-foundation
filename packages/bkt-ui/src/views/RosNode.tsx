import { useEffect, useState } from "react";
import { STAGE_LABEL } from "@/components/ui";
import { href } from "../router";
import { windowHref } from "../site-fetch";
import "../ros.css";

interface Lite {
  id: string;
  slug: string;
  title: string;
  kind: string;
}

interface NodeData {
  node: { id: string; slug: string; title: string; kind: string; branch: string; summary: string | null };
  standing: { stage: string | null };
  prerequisites: Lite[];
  dependents: Lite[];
  directions: { frontier: Lite[] };
  learn: { href: string } | null;
  transfer: { prompt: string };
}

interface Module {
  kind: string;
  items: { prompt?: string; answer?: string }[];
}

export const NODE_MISSING = "This idea is not in your decks on this computer.";
const branchName = (b: string) => b.replace(/^\d+-/, "").replace(/-/g, " ");

function Links({ title, nodes, empty }: { title: string; nodes: Lite[]; empty: string }) {
  return (
    <article className="panel card">
      <h2>{title}</h2>
      {nodes.length ? (
        <ul className="ros-links">
          {nodes.map((n) => (
            <li key={n.id}>
              <a href={href({ name: "node", slug: n.slug })}>{n.title}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </article>
  );
}

export function RosNodeView({ slug }: { slug: string }) {
  const [data, setData] = useState<NodeData | null>(null);
  const [recall, setRecall] = useState<Module | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch(`/api/research-os/node?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!live) return;
      if (r.status === 404) return setError(NODE_MISSING);
      if (!r.ok) return setError("This idea did not load. Close the window and open it again.");
      const body = (await r.json()) as NodeData;
      const opened = await fetch("/api/research-os/state", { method: "POST", body: JSON.stringify({ nodeId: body.node.id, action: "open" }) });
      const stage = opened.ok ? ((await opened.json()) as { stage: string }).stage : body.standing.stage;
      if (live) setData({ ...body, standing: { stage } });
      const m = await fetch(`/api/research-os/modules?node=${encodeURIComponent(slug)}&kind=recall`, { cache: "no-store" });
      if (live && m.ok) setRecall(((await m.json()) as { modules: Module[] }).modules[0] ?? null);
    })().catch(() => live && setError("This idea did not load. Close the window and open it again."));
    return () => {
      live = false;
    };
  }, [slug]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading the idea…</p>;
  const practice = data.learn ? windowHref(data.learn.href) : null;
  const stage = data.standing.stage as keyof typeof STAGE_LABEL | null;

  return (
    <section>
      <header className="head">
        <p className="muted small">
          <a href={href({ name: "graph", branch: data.node.branch })}>{branchName(data.node.branch)}</a> · {data.node.kind}
        </p>
        <h1>{data.node.title}</h1>
        {stage && <p className="muted">You are at {STAGE_LABEL[stage] ?? stage}.</p>}
      </header>
      <article className="panel card">
        <p>{data.node.summary ?? "No summary yet."}</p>
        {practice && (
          <p>
            <a className="primary" href={practice}>
              Practice this idea
            </a>
          </p>
        )}
      </article>
      <div className="ros-grid">
        <Links title="Builds on" nodes={data.prerequisites} empty="Nothing comes before this idea." />
        <Links title="Leads to" nodes={data.dependents} empty="Nothing builds on this idea yet." />
        <Links title="Frontier" nodes={data.directions.frontier} empty="No open frontier from here." />
      </div>
      {recall && recall.items.length > 0 && (
        <article className="panel card">
          <h2>Recall</h2>
          <ol className="ros-recall">
            {recall.items.map((it, i) => (
              <li key={i}>
                <p>{it.prompt}</p>
                {it.answer && (
                  <details>
                    <summary>Show answer</summary>
                    <p>{it.answer}</p>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </article>
      )}
      <article className="panel card">
        <h2>Carry it further</h2>
        <p className="muted">{data.transfer.prompt}</p>
      </article>
    </section>
  );
}
