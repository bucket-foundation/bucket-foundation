"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// The person's side of the Access level (ros-21): the nodes they own with
// pending request counts, the requests they have made, and an import form
// that creates a private node from a dataset, paper, notes, or corpus.

type Visibility = "public" | "private" | "shared";
interface Mine {
  owned: { id: string; slug: string; title: string; visibility: Visibility; pending: number }[];
  myRequests: { id: string; nodeId: string; purpose: string; status: string; createdAt: string }[];
}

export default function AccessMine({ token }: { token: string | null }) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [listNote, setListNote] = useState<string | null>(null);
  const [kind, setKind] = useState<"dataset" | "paper" | "notes" | "corpus">("notes");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/research-os/access?mine=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) {
        setListNote(null);
        setMine((await res.json()) as Mine);
      } else {
        // A learner with imports read as a learner with none.
        setListNote(isTransientOutage(res.status, await readErrorCode(res)) ? OUTAGE_COPY.body : null);
      }
    } catch {
      setMine(null);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitImport() {
    if (!token || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/access", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "import", kind, title: title.trim(), source: url.trim() ? { url: url.trim() } : {} }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.error ?? `failed (${res.status})`));
      } else {
        setTitle("");
        setUrl("");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <section className="mt-10">
      <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">§ access · your nodes</div>

      {listNote && (
        <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
          {listNote}
        </p>
      )}
      {mine && mine.owned.length > 0 ? (
        <ul className="grid gap-1 text-[14px]">
          {mine.owned.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-2">
              <Link href={`/research-os/workspace?node=${n.slug}`} className="underline decoration-[color:var(--gold)] underline-offset-4">
                {n.title}
              </Link>
              <span className="px-2 py-0.5 rounded-full border border-[color:var(--hairline)] small-caps text-[10px] tracking-[0.14em]">{n.visibility}</span>
              {n.pending > 0 && <span className="text-[12px] text-[color:var(--gold-deep)]">{n.pending} pending</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-[color:var(--basalt-3)]">You own no nodes yet. Import something below, or produce one from the workspace.</p>
      )}

      {mine && mine.myRequests.length > 0 && (
        <div className="mt-4">
          <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-1">your requests</div>
          <ul className="grid gap-1 text-[13px]">
            {mine.myRequests.map((r) => (
              <li key={r.id}>
                {r.purpose} · <span className="text-[color:var(--basalt-3)]">{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-2 max-w-md">
        <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">import</div>
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1 text-[13px]">
            <option value="notes">notes</option>
            <option value="dataset">dataset</option>
            <option value="paper">paper</option>
            <option value="corpus">corpus</option>
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" className="flex-1 bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1 text-[13px]" />
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="source url, optional" className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1 text-[13px]" />
        <div>
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => void submitImport()}
            className="px-3 py-1.5 rounded border border-[color:var(--gold)] small-caps text-[10px] tracking-[0.14em] hover:bg-[color:var(--gold)] hover:text-[color:var(--basalt)] disabled:opacity-50"
          >
            import as a private node
          </button>
        </div>
        {error && <p className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
      </div>
    </section>
  );
}
