"use client";

import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import { useState, type FormEvent } from "react";
import Section from "./Section";
import type { NodeData } from "./types";
import { BTN_PRIMARY, STAGE_LABEL } from "@/components/ui";
import ReviewOnNode from "./ReviewOnNode";

export default function ClassSection({ data, onChanged }: { data: NodeData; onChanged: () => void }) {
  const staffClasses = data.classes.filter((c) => c.role === "teacher" || c.role === "librarian");
  const [classId, setClassId] = useState(staffClasses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [paper, setPaper] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function assign(e: FormEvent) {
    e.preventDefault();
    if (!classId) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", classId, targetSlug: data.node.slug, title: title.trim() || data.node.title, dueAt: due ? new Date(due).toISOString() : undefined, required: true, requiresProduction: paper }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNote(
          isTransientOutage(res.status, j.error ?? null)
            ? OUTAGE_COPY.body
            : j.error === "forbidden"
              ? "You are not staff in that class."
              : "Could not assign.",
        );
        return;
      }
      setNote("Assigned.");
      setTitle("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!data.signedIn) return null;
  const total = data.holders ? data.holders.reduce((a, h) => a + h.count, 0) : 0;

  return (
    <Section id="class" title="class" meta={data.classes.length ? `${data.classes.length} class${data.classes.length === 1 ? "" : "es"}` : "no class yet"}>
      <div className="flex flex-col gap-4">
        {data.assignments.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {data.assignments.map((a) => (
              <li key={a.id} className="py-1.5 text-[13px]">
                <span className="text-[color:var(--basalt)]">{a.title}</span>
                <span className="text-[color:var(--basalt-3)]">
                  {" "}· {a.className}
                  {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                  {a.requiresProduction ? " · paper required" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-[color:var(--basalt-3)]">No assignment targets this node in your classes.</p>
        )}

        {data.holders && (
          <div>
            <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">your learners on this node</h3>
            <div className="flex flex-wrap gap-2">
              {data.holders.map((h) => (
                <span key={h.stage} className={"text-[12px] px-2 py-1 border rounded-sm " + (h.count ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]")}>
                  {h.count} {h.stage === "unopened" ? "unopened" : STAGE_LABEL[h.stage] ?? h.stage}
                </span>
              ))}
              <span className="text-[12px] text-[color:var(--basalt-3)] self-center">of {total}</span>
            </div>
          </div>
        )}

        {staffClasses.length > 0 && (
          <div>
            <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">waiting on you</h3>
            <ReviewOnNode nodeId={data.node.id} onChanged={onChanged} />
          </div>
        )}

        {staffClasses.length > 0 && (
          <form onSubmit={assign} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[10px] small-caps tracking-[0.18em] text-[color:var(--basalt-3)]">
              class
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60">
                {staffClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] small-caps tracking-[0.18em] text-[color:var(--basalt-3)] min-w-[200px] flex-1">
              title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={data.node.title} className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] small-caps tracking-[0.18em] text-[color:var(--basalt-3)]">
              due
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60" />
            </label>
            <label className="inline-flex items-center gap-1 text-[12px] text-[color:var(--basalt-2)] pb-2">
              <input type="checkbox" checked={paper} onChange={(e) => setPaper(e.target.checked)} /> paper required
            </label>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy ? "assigning" : "assign to the class"}
            </button>
            {note && <span className="text-[12px] text-[color:var(--basalt-2)] pb-2">{note}</span>}
          </form>
        )}
      </div>
    </Section>
  );
}
