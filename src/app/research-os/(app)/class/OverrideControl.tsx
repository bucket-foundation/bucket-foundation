"use client";

import { useState } from "react";

// Override a learner's level on one node with a recorded reason (the Class
// step): a small inline form on a class grid row. POST /api/research-os/override.

const LEVELS = ["access", "awareness", "understanding", "internalization", "production"] as const;

export default function OverrideControl({
  classId,
  learnerId,
  path,
  token,
  onDone,
}: {
  classId: string;
  learnerId: string;
  path: { id: string; title: string }[];
  token: string | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nodeId, setNodeId] = useState(path[0]?.id ?? "");
  const [toStage, setToStage] = useState<(typeof LEVELS)[number]>("understanding");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/override", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId, learnerId, nodeId, toStage, reason }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `failed (${res.status})`);
        return;
      }
      setOpen(false);
      setReason("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[10px] small-caps tracking-[0.12em] underline text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">
        override
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px]">
      <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="bg-transparent border border-[color:var(--hairline)] rounded px-1 py-0.5 max-w-[10rem]">
        {path.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
      <select value={toStage} onChange={(e) => setToStage(e.target.value as (typeof LEVELS)[number])} className="bg-transparent border border-[color:var(--hairline)] rounded px-1 py-0.5">
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (recorded)" className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-0.5 min-w-[10rem]" />
      <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void submit()} className="underline disabled:opacity-50">
        set
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[color:var(--basalt-3)] underline">
        cancel
      </button>
      {error && <span className="text-[color:var(--crimson)]">{error}</span>}
    </div>
  );
}
