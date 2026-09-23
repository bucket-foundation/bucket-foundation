"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import { useCallback, useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, LoadingState } from "@/components/ui";

interface Hold {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
  stage: string;
  heldAt: string;
}
interface QueuedProduction {
  id: string;
  learnerId: string;
  targetNodeId: string;
  relatedNodeId: string | null;
  kind: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  counterEvidence: unknown[];
  guardFlags: { hasUnverifiedSource: boolean; missingCounterEvidence: boolean };
  unverifiedSourceNoteTemplate: string;
}

export default function ReviewOnNode({ nodeId, onChanged }: { nodeId: string; onChanged: () => void }) {
  const [holds, setHolds] = useState<Hold[] | null>(null);
  const [productions, setProductions] = useState<QueuedProduction[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [queueNote, setQueueNote] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/research-os/review", { cache: "no-store" });
      if (!res.ok) {
        setQueueNote(isTransientOutage(res.status, await readErrorCode(res)) ? OUTAGE_COPY.body : null);
        setHolds([]);
        setProductions([]);
        return;
      }
      setQueueNote(null);
      const j = (await res.json()) as { transferHolds: Hold[]; productions: QueuedProduction[] };
      setHolds(j.transferHolds.filter((h) => h.nodeId === nodeId));
      setProductions(j.productions.filter((p) => p.targetNodeId === nodeId || p.relatedNodeId === nodeId));
    } catch {
      setQueueNote(OUTAGE_COPY.body);
      setHolds([]);
      setProductions([]);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setNote(isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.message ?? j.error ?? "Could not record the decision."));
        return;
      }
      setNote("Recorded.");
      await load();
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  if (holds === null || productions === null) return <LoadingState label="Reading the queue" />;
  if (queueNote) {
    return (
      <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
        {queueNote}
      </p>
    );
  }
  if (holds.length === 0 && productions.length === 0) return <p className="text-[12px] text-[color:var(--basalt-3)]">Nothing on this node waits on you.</p>;

  return (
    <div className="flex flex-col gap-4">
      {queueNote && (
        <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
          {queueNote}
        </p>
      )}
      {holds.length > 0 && (
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">transfer holds</h3>
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {holds.map((h) => (
              <li key={h.learnerId} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="text-[color:var(--basalt-2)]">
                  learner {h.learnerId.slice(0, 8)}… · held {new Date(h.heldAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="flex gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void decide({ kind: "transfer_item", learnerId: h.learnerId, nodeId, decision: "approved" }, `h-${h.learnerId}`)} className={BTN_PRIMARY}>
                    internalized
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => void decide({ kind: "transfer_item", learnerId: h.learnerId, nodeId, decision: "returned", reason: "Try the transfer again with a case of your own." }, `hr-${h.learnerId}`)} className={BTN_SECONDARY}>
                    return
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {productions.length > 0 && (
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">productions waiting</h3>
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {productions.map((p) => (
              <li key={p.id} className="py-2 flex flex-col gap-1 text-[13px]">
                <div className="text-[color:var(--basalt)]">{p.claim?.trim() || `Untitled ${p.kind.replace("_", " ")}`}</div>
                <div className="text-[12px] text-[color:var(--basalt-3)]">
                  {p.kind.replace("_", " ")} · learner {p.learnerId.slice(0, 8)}… · {p.evidence.length} evidence · {p.sources.length} sources · {p.counterEvidence.length} counter
                  {p.guardFlags.hasUnverifiedSource ? " · a source could not be matched to a quote" : ""}
                  {p.guardFlags.missingCounterEvidence ? " · counter-evidence missing" : ""}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy !== null || p.guardFlags.hasUnverifiedSource} onClick={() => void decide({ kind: "production", productionId: p.id, decision: "approved" }, `p-${p.id}`)} className={BTN_PRIMARY + " disabled:opacity-50"}>
                    accept
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => void decide({ kind: "production", productionId: p.id, decision: "returned", reason: p.guardFlags.hasUnverifiedSource ? p.unverifiedSourceNoteTemplate : "Returned for another pass." }, `pr-${p.id}`)} className={BTN_SECONDARY}>
                    return
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {note && <p className="text-[12px] text-[color:var(--basalt-2)]">{note}</p>}
    </div>
  );
}
