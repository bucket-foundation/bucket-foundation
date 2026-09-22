"use client";

import { useCallback, useEffect, useState } from "react";
import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";

// Assignments for one class (the Class step, decision 6): the teacher or
// librarian assigns a target from the class path with a title, instructions,
// a due date, and whether the finished paper (the production) is required.

interface AssignmentRow {
  id: string;
  title: string;
  targetNodeId: string;
  dueAt?: string | null;
  required: boolean;
  requiresProduction: boolean;
  closedAt?: string | null;
}

export default function AssignmentsPanel({
  classId,
  path,
  token,
}: {
  classId: string;
  path: { id: string; slug?: string; title: string }[];
  token: string | null;
}) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [targetSlug, setTargetSlug] = useState(path[path.length - 1]?.slug ?? "");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [requiresProduction, setRequiresProduction] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback((): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/research-os/assignments?class=${encodeURIComponent(classId)}`, { headers: headers(), cache: "no-store" });
      if (!res.ok) {
        // Returning here left the panel showing the assignments it had,
        // or none at all, for a read that never finished. This route
        // answers class_read_failed now, so the failure has a name.
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : "Assignments could not be read.");
        return;
      }
      setError(null);
      const j = (await res.json()) as { assignments: AssignmentRow[]; roles: string[] };
      setRows(j.assignments);
      setCanAssign(j.roles.some((r) => r === "teacher" || r === "librarian"));
    } catch {
      setError(OUTAGE_COPY.body);
    }
  }, [classId, token, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/assignments", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers() },
        body: JSON.stringify({ classId, ...body }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.error ?? `failed (${res.status})`));
      } else if (body.action === "create") {
        setTitle("");
        setInstructions("");
        setDueAt("");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const nodeTitle = (id: string) => path.find((n) => n.id === id)?.title ?? id.slice(0, 8);
  const open = rows.filter((r) => !r.closedAt);

  return (
    <div className="mb-4">
      <div className="text-[10px] small-caps tracking-[0.18em] text-[color:var(--aegean-deep)] mb-1">assignments</div>
      {open.length === 0 ? (
        <p className="text-[12px] text-[color:var(--basalt-3)]">No open assignment.</p>
      ) : (
        <ul className="grid gap-1 text-[12px]">
          {open.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <b>{a.title}</b>
              <span className="text-[color:var(--basalt-3)]">→ {nodeTitle(a.targetNodeId)}</span>
              {a.dueAt && <span className="text-[color:var(--basalt-3)]">due {a.dueAt.slice(0, 10)}</span>}
              <span className="text-[color:var(--basalt-3)]">{a.requiresProduction ? "paper required" : "workspace only"}</span>
              {canAssign && (
                <button type="button" disabled={busy} onClick={() => void post({ action: "close", assignmentId: a.id })} className="underline">
                  close
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAssign && (
        <div className="mt-3 grid gap-2 max-w-xl text-[12px]">
          <div className="flex flex-wrap gap-2">
            <select value={targetSlug} onChange={(e) => setTargetSlug(e.target.value)} className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1">
              {path.map((n) => (
                <option key={n.id} value={n.slug ?? ""}>
                  {n.title}
                </option>
              ))}
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="assignment title" className="flex-1 min-w-[12rem] bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1" />
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1" />
          </div>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="instructions, optional" className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1 min-h-[48px]" />
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={requiresProduction} onChange={(e) => setRequiresProduction(e.target.checked)} />
            the finished paper (a production on the target) is required
          </label>
          <div>
            <button
              type="button"
              disabled={busy || !title.trim() || !targetSlug}
              onClick={() => void post({ action: "create", targetSlug, title, instructions, dueAt: dueAt ? new Date(dueAt + "T23:59:59Z").toISOString() : undefined, requiresProduction })}
              className="px-3 py-1.5 rounded border border-[color:var(--gold)] small-caps text-[10px] tracking-[0.14em] hover:bg-[color:var(--gold)] hover:text-[color:var(--basalt)] disabled:opacity-50"
            >
              assign to the class
            </button>
          </div>
          {error && <p className="text-[color:var(--crimson)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
