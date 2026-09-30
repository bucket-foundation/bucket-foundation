import { useCallback, useEffect, useState } from "react";
import { PRODUCTION_STATUSES, type ProductionStatus } from "@ros/productions-snapshot";
import type { Api, HistoryData } from "../api";
import { readJsonFile } from "./file";

const STATUS: Record<ProductionStatus, string> = { draft: "Drafts", submitted: "Waiting on review", accepted: "Accepted", returned: "Returned" };
const KIND: Record<string, string> = { production: "production", extension: "extension", replication: "replication", peer_review: "peer review" };

export function HistoryView({ api }: { api: Api }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    api.history().then(setData, (e: Error) => setStatus(e.message));
  }, [api]);

  useEffect(load, [load]);

  const onFile = async (f: File | undefined) => {
    const parsed = await readJsonFile(f);
    if (!parsed.ok) return setStatus(parsed.error);
    try {
      const r = await api.importHistory(parsed.value);
      setStatus(`Saved a snapshot of ${r.productions} productions.`);
      load();
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  if (!data) return <p className="muted">Loading history…</p>;
  const snap = data.snapshot;
  const max = Math.max(1, ...data.activity.map((d) => d.learn + d.work + d.notes));
  const title = (id: string | null) => (id && snap?.nodes[id]?.title) || "a node";

  return (
    <section>
      <header className="head">
        <h1>History</h1>
        <p className="muted">Your last 60 days on this computer, and a snapshot of your productions from the web.</p>
      </header>
      <article className="panel card">
        <h2>Activity</h2>
        <div className="activity" role="img" aria-label="Daily activity for 60 days">
          {data.activity.map((d) => {
            const total = d.learn + d.work + d.notes;
            return (
              <span key={d.day} className="day" title={`${d.day}: ${d.learn} learn, ${d.work} work quiz, ${d.notes} notes`}>
                <span className="learn" style={{ height: `${(100 * d.learn) / max}%` }} />
                <span className="work" style={{ height: `${(100 * d.work) / max}%` }} />
                <span className="note" style={{ height: `${(100 * d.notes) / max}%` }} />
                {total === 0 && <span className="none" />}
              </span>
            );
          })}
        </div>
        <p className="muted small legend">
          <i className="learn" /> learn <i className="work" /> work quiz <i className="note" /> notes
        </p>
      </article>
      <article className="panel card">
        <h2>Productions</h2>
        <div className="toolbar">
          <label className="file">
            <input type="file" accept=".json,application/json" onChange={(e) => void onFile(e.target.files?.[0])} />
            <span>{snap ? "Replace snapshot" : "Open productions JSON"}</span>
          </label>
          {snap && (
            <button className="ghost" onClick={() => window.confirm("Remove the productions snapshot from this computer?") && void api.forgetHistory().then(load)}>
              Remove snapshot
            </button>
          )}
        </div>
        {!snap ? (
          <p className="muted">
            Export while the web is up: sign in at bucket.foundation, open /api/research-os/production, and save the page as a .json file. Open that file here. Bucket keeps the last snapshot on this computer, encrypted, so the list stays readable while the web is down; export again once it is back.
          </p>
        ) : (
          <>
            <p className="muted small">Snapshot from {new Date(snap.importedAt).toLocaleString()}.</p>
            {PRODUCTION_STATUSES.map((st) => {
              const rows = snap.productions.filter((p) => p.status === st);
              if (!rows.length) return null;
              return (
                <div key={st} className="prod-group">
                  <h3>
                    {STATUS[st]} <span className="muted small">{rows.length}</span>
                  </h3>
                  <ul>
                    {rows.map((p) => {
                      const last = p.notes.length ? p.notes[p.notes.length - 1] : null;
                      return (
                        <li key={p.id}>
                          <b>{p.claim?.trim() || `Untitled ${KIND[p.kind] ?? p.kind}`}</b>
                          <span className="muted small">
                            {" "}
                            {KIND[p.kind] ?? p.kind} on {title(p.kind === "production" ? p.target_node_id : (p.related_node_id ?? p.target_node_id))}, {p.updated_at.slice(0, 10)}
                          </span>
                          {last?.reason && <p className="muted small">{last.reason}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </>
        )}
        {status && <p className="status">{status}</p>}
      </article>
    </section>
  );
}
