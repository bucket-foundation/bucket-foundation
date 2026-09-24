"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HistoryConflict, HistoryReviewQueue, PendingFactoid } from "@/lib/history/review";

function years(startMin: number, endMax: number): string {
  const label = (y: number) => (y <= 0 ? `${1 - y} BCE` : `${y}`);
  return startMin === endMax ? label(startMin) : `${label(startMin)} to ${label(endMax)}`;
}

export default function HistoryReview({ headers }: { headers: Record<string, string> }) {
  const [queue, setQueue] = useState<HistoryReviewQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const auth = headers.authorization ?? "";

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/research-os/history", { headers: auth ? { authorization: auth } : {}, cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as HistoryReviewQueue & { error?: string };
      if (!res.ok) {
        setError(res.status === 403 ? "forbidden" : data.error || "load_failed");
        setQueue(null);
        return;
      }
      setQueue(data);
    } catch {
      setError("network_error");
    }
  }, [auth]);

  useEffect(() => {
    if (auth) load();
  }, [auth, load]);

  async function post(url: string, key: string, body: Record<string, unknown>, done: string) {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setNotice(res.ok ? done : data.message || data.error || "decision_failed");
      if (res.ok) load();
    } finally {
      setBusy(null);
    }
  }

  const decide = (f: PendingFactoid, action: "approve" | "reject") => {
    const key = `h:${f.silverId}`;
    const reason = (reasons[key] || "").trim();
    if (action === "reject" && !reason) {
      setNotice("A one-line reason is required to reject a factoid.");
      return;
    }
    return post("/api/research-os/history", key, { action, silverId: f.silverId, reason: reason || undefined }, action === "approve" ? "Factoid approved." : "Factoid rejected.");
  };

  const prefer = (c: HistoryConflict, silverId: string) =>
    post("/api/research-os/history", `c:${silverId}:${c.role}`, { action: "prefer", silverId, role: c.role }, `Preferred for ${c.subjectTitle}, ${c.role}.`);

  const decideNode = (id: string, decision: "approved" | "rejected") =>
    post("/api/research-os/node-proposals", `n:${id}`, { id, decision, reason: decision === "rejected" ? "not a history subject" : undefined }, decision === "approved" ? "Node created." : "Node proposal rejected.");

  if (!auth) return null;

  return (
    <section className="mt-10" aria-labelledby="history-review">
      <h2 id="history-review" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-3">
        history factoids
      </h2>
      {notice && <p className="mb-3 text-[13px] text-[color:var(--basalt-2)]">{notice}</p>}
      {error === "forbidden" && <p className="text-[13px] text-red-700">This account is not on the graph reviewer allowlist.</p>}
      {error && error !== "forbidden" && <p className="text-[13px] text-red-700">Could not load the history queue ({error}).</p>}
      {queue && (
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="small-caps text-[12px] tracking-[0.14em] text-[color:var(--aegean-deep)] mb-2">conflicts: {queue.conflicts.length}</h3>
            {queue.conflicts.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">No disagreeing sources.</p>}
            <div className="flex flex-col gap-3">
              {queue.conflicts.map((c) => (
                <div key={`${c.a.factoidId}:${c.b.factoidId}`} className="p-4 bg-[color:var(--bone)] text-[13px] text-[color:var(--basalt)]">
                  <div>
                    <Link href={`/research-os/n/${c.subject}`} className="underline underline-offset-4">
                      <strong>{c.subjectTitle}</strong>
                    </Link>{" "}
                    &middot; {c.role} &middot; {c.disjointSpans ? "spans disagree" : "places disagree"}
                  </div>
                  {[c.a, c.b].map((s) => (
                    <div key={s.factoidId} className="mt-2 flex flex-wrap items-center gap-3">
                      <span>
                        {years(s.startMin, s.endMax)} ({s.edtf}) from {s.source}
                        {s.place ? `, ${s.place}` : ""}, confidence {s.confidence.toFixed(2)}
                        {s.preferred ? ", preferred" : ""}
                      </span>
                      {!s.preferred && (
                        <button
                          onClick={() => prefer(c, s.silverId)}
                          disabled={busy === `c:${s.silverId}:${c.role}`}
                          className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                        >
                          prefer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="small-caps text-[12px] tracking-[0.14em] text-[color:var(--aegean-deep)] mb-2">pending factoids: {queue.pendingTotal}</h3>
            {queue.pendingTotal > queue.pending.length && (
              <p className="mb-2 text-[12px] text-[color:var(--basalt-2)]">The first {queue.pending.length} are shown, highest confidence first.</p>
            )}
            {queue.pending.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            <div className="flex flex-col gap-3">
              {queue.pending.map((f) => {
                const key = `h:${f.silverId}`;
                return (
                  <div key={key} className="p-4 bg-[color:var(--bone)] text-[13px] text-[color:var(--basalt)]">
                    <div>
                      <strong>{f.subjectTitle ?? f.subject}</strong>
                      {!f.subjectExists && <span className="text-[color:var(--aegean-deep)]"> &middot; node proposed, approve it first</span>}
                    </div>
                    {f.roles.map((r) => (
                      <div key={r.role} className="mt-1">
                        {r.role}: {years(r.startMin, r.endMax)} ({r.edtf})
                        {r.place ? ` at ${r.place.title} (${r.place.lat.toFixed(2)}, ${r.place.lng.toFixed(2)})` : ""}
                      </div>
                    ))}
                    <div className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                      {f.source}, bytes {f.span.start} to {f.span.end}
                      {f.span.text ? `: "${f.span.text}"` : ""} &middot; rule {f.rule ?? "unknown"} &middot; confidence {f.confidence.toFixed(2)}
                    </div>
                    <input
                      value={reasons[key] || ""}
                      onChange={(e) => setReasons((x) => ({ ...x, [key]: e.target.value }))}
                      placeholder="one-line reason (required to reject)"
                      className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                    />
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => decide(f, "approve")}
                        disabled={busy === key || !f.subjectExists}
                        title={f.subjectExists ? undefined : "Approve the node proposal for this subject first."}
                        className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                      >
                        approve
                      </button>
                      <button
                        onClick={() => decide(f, "reject")}
                        disabled={busy === key}
                        className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                      >
                        reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="small-caps text-[12px] tracking-[0.14em] text-[color:var(--aegean-deep)] mb-2">proposed subjects: {queue.proposals.length}</h3>
            {queue.proposals.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">No subjects waiting.</p>}
            <div className="flex flex-col gap-2">
              {queue.proposals.map((p) => (
                <div key={p.id} className="p-3 bg-[color:var(--bone)] text-[13px] text-[color:var(--basalt)] flex flex-wrap items-center gap-3">
                  <span>
                    <strong>{p.title}</strong> &middot; {p.kind} &middot; {p.slug} &middot; {p.silverIds.length} factoid{p.silverIds.length === 1 ? "" : "s"} waiting
                  </span>
                  <button
                    onClick={() => decideNode(p.id, "approved")}
                    disabled={busy === `n:${p.id}`}
                    className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                  >
                    create node
                  </button>
                  <button
                    onClick={() => decideNode(p.id, "rejected")}
                    disabled={busy === `n:${p.id}`}
                    className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
