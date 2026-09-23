"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { STAGE_LABEL } from "@/components/ui";

interface Hit {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  branch: string;
  summary: string | null;
  stage: string | null;
}

/** One search, everywhere: Ctrl or Cmd K opens it; Enter opens the node. */
export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setHits([]);
      setSel(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (timer.current) window.clearTimeout(timer.current);
    if (!q.trim()) {
      setHits([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/research-os/search?q=${encodeURIComponent(q)}&limit=12`, { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as { results: Hit[] };
          setNote(null);
          setHits(j.results);
          setSel(0);
        } else {
          // No hits and a failed read rendered the same empty list.
          setNote(isTransientOutage(res.status, await readErrorCode(res)) ? OUTAGE_COPY.body : null);
          setHits([]);
        }
      } finally {
        setBusy(false);
      }
    }, 180);
  }, [q, open]);

  if (!open) return null;

  function go(h: Hit) {
    onClose();
    router.push(`/research-os/n/${encodeURIComponent(h.slug)}`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Search the graph" className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[color:var(--basalt)]/40" />
      <div className="relative w-full max-w-[640px] bg-[color:var(--bone)] shadow-[0_12px_40px_-8px_rgba(31,28,22,0.45)] rounded-sm" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(hits.length - 1, s + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            }
            if (e.key === "Enter" && hits[sel]) go(hits[sel]);
          }}
          placeholder="search the graph"
          className="w-full px-4 py-3.5 text-[16px] bg-transparent border-b border-[color:var(--hairline)] text-[color:var(--basalt)] focus:outline-none"
          autoComplete="off"
        />
        <ul className="max-h-[50vh] overflow-y-auto" role="listbox">
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === sel}>
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => go(h)} className={"w-full text-left px-4 py-2.5 flex items-baseline justify-between gap-3 " + (i === sel ? "bg-[color:var(--bone-2)]" : "")}>
                <span className="min-w-0">
                  <span className="text-[14px] text-[color:var(--basalt)]">{h.title}</span>
                  <span className="ml-2 text-[11px] text-[color:var(--basalt-3)]">
                    {h.kind.replace("_", " ")} · {h.branch.replace(/^\d+-/, "")}
                  </span>
                </span>
                {h.stage && <span className="shrink-0 small-caps text-[10px] tracking-[0.14em] text-[color:var(--gold-deep)]">{STAGE_LABEL[h.stage] ?? h.stage}</span>}
              </button>
            </li>
          ))}
          {note && <li role="alert" className="px-4 py-3 text-[13px] text-[color:var(--gold-deep)]">{note}</li>}
          {!busy && !note && q.trim() && hits.length === 0 && <li className="px-4 py-3 text-[13px] text-[color:var(--basalt-3)]">Nothing on the graph matches.</li>}
        </ul>
        <div className="px-4 py-2 border-t border-[color:var(--hairline)] text-[11px] text-[color:var(--basalt-3)] flex justify-between">
          <span>↑ ↓ to move · Enter to open · Esc to close</span>
          <span>{busy ? "searching" : `${hits.length} result${hits.length === 1 ? "" : "s"}`}</span>
        </div>
      </div>
    </div>
  );
}
