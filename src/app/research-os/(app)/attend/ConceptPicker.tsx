"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";

type Hit = { slug: string; title: string; branch: string };

export default function ConceptPicker({ ids, q, cone }: { ids: string[]; q: string; cone: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!text.trim()) {
      setHits([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      const res = await fetch(`/api/research-os/search?q=${encodeURIComponent(text)}&limit=8`, { cache: "no-store" });
      if (res.ok) {
        setNote(null);
        setHits(((await res.json()) as { results: Hit[] }).results);
      } else {
        setNote(isTransientOutage(res.status, await readErrorCode(res)) ? OUTAGE_COPY.body : null);
        setHits([]);
      }
    }, 180);
  }, [text]);

  function add(slug: string) {
    const next = Array.from(new Set(ids.concat(slug))).slice(0, 8);
    const sp = new URLSearchParams({ ids: next.join(",") });
    if (q) sp.set("q", q);
    if (cone === "hide") sp.set("cone", "hide");
    setText("");
    setHits([]);
    router.push(`/research-os/attend?${sp.toString()}`);
  }

  return (
    <div className="relative">
      <label className="block text-[12px] text-[color:var(--basalt-3)]">
        Add a concept
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search the graph"
          className="mt-1 block w-full border border-[color:var(--hairline)] bg-transparent px-2 py-1.5 text-[14px] text-[color:var(--basalt)]"
        />
      </label>
      {note && <p className="mt-1 text-[12px] text-[color:var(--gold-deep)]">{note}</p>}
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full border border-[color:var(--hairline)] bg-[color:var(--bone)]">
          {hits.map((h) => (
            <li key={h.slug}>
              <button type="button" onClick={() => add(h.slug)} className="w-full px-2 py-1.5 text-left text-[13px] hover:bg-[color:var(--hairline)]">
                {h.title}
                <span className="ml-2 text-[11px] text-[color:var(--basalt-3)]">{h.branch}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
