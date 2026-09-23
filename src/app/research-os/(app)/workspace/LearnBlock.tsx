"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { learnTargetFor, recallFor, type RecallSummary } from "@/lib/research-os/learn-link";
import { MASTERED_THRESHOLD } from "@/lib/academy/mastery";

export default function LearnBlock({
  node,
  token,
}: {
  node: { branch?: string; provenance?: Record<string, unknown> | null };
  token: string | null;
}) {
  const target = learnTargetFor(node);
  const [recall, setRecall] = useState<RecallSummary | null>(null);

  useEffect(() => {
    setRecall(null);
    if (!token || !target?.atomId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/academy/progress", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { branches?: Record<string, { data: unknown }> };
        const branch = j.branches?.[target.branchFile] ?? j.branches?.[`${target.branchFile}.json`];
        if (!cancelled) setRecall(recallFor(branch?.data ?? null, target.atomId as string));
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, target?.atomId, target?.branchFile]);

  if (!target) return null;

  const pct = (v: number | null) => (v === null ? null : Math.round(v * 100));
  const mastered = recall?.mastery !== null && recall?.mastery !== undefined && recall.mastery >= MASTERED_THRESHOLD;
  const due =
    recall?.dueInDays === null || recall?.dueInDays === undefined
      ? null
      : recall.dueInDays < 0
        ? "due now"
        : recall.dueInDays < 1
          ? "due today"
          : `due in ${Math.round(recall.dueInDays)} d`;

  return (
    <div className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[12px] text-[color:var(--basalt-2)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">learn</span>
        <Link href={target.href} className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]">
          {target.atomId ? "open the lesson" : `open the ${target.branchFile.replace(/^\d+-/, "")} lessons`} →
        </Link>
        {recall && recall.seen && (
          <span className="text-[color:var(--basalt-3)]">
            recall {pct(recall.retrievability)}% · mastery {pct(recall.mastery)}%{mastered ? " · mastered" : ""}
            {due ? ` · ${due}` : ""}
          </span>
        )}
        {recall && !recall.seen && <span className="text-[color:var(--basalt-3)]">unseen in the Academy</span>}
        {!token && target.atomId && <span className="text-[color:var(--basalt-3)]">sign in to see your recall</span>}
      </div>
    </div>
  );
}
