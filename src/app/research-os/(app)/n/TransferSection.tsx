"use client";

import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import Section from "./Section";
import type { NodeData } from "./types";
import { BTN_PRIMARY } from "@/components/ui";

/** Internalization, in place: carry the node somewhere it was not taught. Held for a teacher's decision. */
export default function TransferSection({ data, onChanged }: { data: NodeData; onChanged: () => void }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; profile?: boolean } | null>(null);
  const stage = data.standing.stage;
  const ready = stage === "understanding" || stage === "internalization" || stage === "production";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "transfer_item", nodeId: data.node.id, itemId: data.transfer.itemId, answer }) });
      const j = (await res.json().catch(() => ({}))) as { stage?: string; event?: { held?: boolean }; error?: string; message?: string; needsProfile?: boolean };
      if (!res.ok) {
        const text = isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.message ?? j.error ?? "Could not record the transfer.");
        setError({ text, profile: Boolean(j.needsProfile) });
        return;
      }
      setDone(j.event?.held ? "Recorded and held for your teacher's decision." : `Recorded. Standing: ${j.stage ?? stage}.`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section id="transfer" level="internalization" title="transfer" meta={stage === "internalization" || stage === "production" ? "held" : ready ? "open" : "after understanding"}>
      {!data.signedIn ? (
        <p className="text-[12px] text-[color:var(--basalt-3)]">Sign in to answer a transfer prompt.</p>
      ) : !ready ? (
        <p className="text-[13px] text-[color:var(--basalt-3)]">Reach Understanding on this node first: master its lesson or check an explanation.</p>
      ) : done ? (
        <p className="text-[13px] text-[color:var(--basalt-2)]">{done}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 max-w-[68ch]">
          <p className="text-[14px] leading-[1.6] text-[color:var(--basalt)]">{data.transfer.prompt}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className="border border-[color:var(--hairline)] px-3 py-2 text-[14px] leading-[1.6] bg-white/60" placeholder="Your answer, in your own words." />
          <button type="submit" disabled={busy || !answer.trim()} className={BTN_PRIMARY + " self-start"}>
            {busy ? "recording" : "record the transfer"}
          </button>
          {error && (
            <p className="text-[12px] text-[color:var(--crimson)]">
              {error.text}{" "}
              {error.profile && <Link href="/research-os/profile" className="underline underline-offset-4">finish your profile</Link>}
            </p>
          )}
        </form>
      )}
    </Section>
  );
}
