"use client";

import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Quote } from "./types";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";

export type ProduceKind = "production" | "extension" | "replication" | "peer_review";
const KIND_LABEL: Record<ProduceKind, string> = { production: "production", extension: "extension", replication: "replication", peer_review: "peer review" };
const INPUT = "border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 w-full";

/** The one production form: a claim from quotes and sources, a transfer proof, counter-evidence, saved as a draft or submitted for review. */
export default function ProduceForm({
  kind,
  targetId,
  relatedId,
  relatedTitle,
  quotes,
  onDone,
  onCancel,
}: {
  kind: ProduceKind;
  targetId: string;
  relatedId: string | null;
  relatedTitle: string;
  quotes: Quote[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState(quotes.map((q) => (q.quotable_span ? `${q.quotable_span} (${q.citation})` : q.citation)).join("\n"));
  const [sources, setSources] = useState(quotes.map((q) => q.citation).join("\n"));
  const [transfer, setTransfer] = useState("");
  const [counter, setCounter] = useState("");
  const [busy, setBusy] = useState<"draft" | "submitted" | null>(null);
  const [note, setNote] = useState<{ text: string; profile?: boolean } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save(status: "draft" | "submitted", e?: FormEvent) {
    e?.preventDefault();
    if (!claim.trim()) return;
    setBusy(status);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/production", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: savedId ?? undefined,
          kind,
          targetNodeId: targetId,
          relatedNodeId: relatedId,
          claim,
          evidence: evidence.split("\n").map((s) => s.trim()).filter(Boolean),
          sources: sources.split("\n").map((s) => s.trim()).filter(Boolean),
          transferProof: transfer.trim() ? { text: transfer } : {},
          counterEvidence: counter.split("\n").map((s) => s.trim()).filter(Boolean),
          status,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { production?: { id: string; status: string }; error?: string; message?: string; needsProfile?: boolean };
      if (!res.ok) {
        const text = isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.message ?? j.error ?? "Could not save.");
        setNote({ text, profile: Boolean(j.needsProfile) });
        return;
      }
      setSavedId(j.production?.id ?? savedId);
      setNote({ text: status === "submitted" ? "Submitted. It waits on a teacher's review." : "Draft saved." });
      if (status === "submitted") onDone();
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={(e) => void save("draft", e)} className="flex flex-col gap-3 max-w-[70ch]">
      <div className="text-[13px] text-[color:var(--basalt-2)]">
        A {KIND_LABEL[kind]} {kind === "production" ? "on" : "of"} <span className="text-[color:var(--basalt)]">{relatedTitle}</span>.
      </div>
      <label className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">claim</label>
      <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={3} className={INPUT} placeholder={kind === "peer_review" ? "Your assessment of the production, in one claim." : kind === "replication" ? "What you redid, and what you found." : "The claim you are making."} />
      <label className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">evidence, one per line</label>
      <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} className={INPUT} />
      <label className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">sources, one per line</label>
      <textarea value={sources} onChange={(e) => setSources(e.target.value)} rows={2} className={INPUT} />
      <label className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">transfer proof</label>
      <textarea value={transfer} onChange={(e) => setTransfer(e.target.value)} rows={2} className={INPUT} placeholder="Where the claim carries beyond where it was taught." />
      <label className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">counter-evidence, one per line</label>
      <textarea value={counter} onChange={(e) => setCounter(e.target.value)} rows={2} className={INPUT} placeholder="What would show the claim wrong, and whether it does." />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy !== null || !claim.trim()} className={BTN_SECONDARY}>
          {busy === "draft" ? "saving" : "save draft"}
        </button>
        <button type="button" disabled={busy !== null || !claim.trim()} onClick={() => void save("submitted")} className={BTN_PRIMARY}>
          {busy === "submitted" ? "submitting" : "submit for review"}
        </button>
        <button type="button" onClick={onCancel} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
          cancel
        </button>
      </div>
      {note && (
        <p className={"text-[12px] " + (note.profile || /could not|required|block/i.test(note.text) ? "text-[color:var(--crimson)]" : "text-[color:var(--basalt-2)]")}>
          {note.text}{" "}
          {note.profile && <Link href="/research-os/profile" className="underline underline-offset-4">finish your profile</Link>}
        </p>
      )}
    </form>
  );
}
