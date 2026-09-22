"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The learner's open assignments across their classes (the Class step):
// each links to the workspace with the assignment's target.

interface LearnerAssignment {
  id: string;
  title: string;
  className: string;
  targetSlug: string;
  targetTitle: string;
  dueAt?: string | null;
  requiresProduction: boolean;
  status: "not_started" | "in_progress" | "produced" | "accepted" | "overdue";
}

const STATUS: Record<LearnerAssignment["status"], string> = {
  not_started: "not started",
  in_progress: "in progress",
  produced: "paper submitted",
  accepted: "done",
  overdue: "overdue",
};

export default function AssignmentsBanner({ token, currentTarget }: { token: string | null; currentTarget: string }) {
  const [rows, setRows] = useState<LearnerAssignment[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/research-os/assignments?mine=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) {
          // The banner hides itself on an empty list, so returning here
          // showed a learner with assignments the screen of a learner
          // with none.
          if (!cancelled) setFailed(true);
          return;
        }
        const j = (await res.json()) as { assignments: LearnerAssignment[] };
        if (!cancelled) {
          setFailed(false);
          setRows(j.assignments);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (failed) {
    return (
      <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
        Your assignments could not be read this minute. Reload to try again.
      </p>
    );
  }
  if (rows.length === 0) return null;
  return (
    <div className="mb-3 p-3 border border-[color:var(--gold)] bg-[color:var(--bone-2)]/70 text-[12px]">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)] mb-1">assigned</div>
      <ul className="grid gap-1">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2">
            <b>{a.title}</b>
            <span className="text-[color:var(--basalt-3)]">{a.className}</span>
            <span className="text-[color:var(--basalt-3)]">· {STATUS[a.status]}</span>
            {a.dueAt && <span className="text-[color:var(--basalt-3)]">· due {a.dueAt.slice(0, 10)}</span>}
            {a.targetSlug && a.targetSlug !== currentTarget ? (
              <Link href={`/research-os/workspace?target=${encodeURIComponent(a.targetSlug)}`} className="underline decoration-[color:var(--gold)] underline-offset-4">
                open {a.targetTitle} →
              </Link>
            ) : (
              <span className="text-[color:var(--basalt-3)]">· this target</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
