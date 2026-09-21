"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The learner's open assignments across their classes (the Class step):
// each links to the workspace with the assignment's target.

// The server type, so a change to what /assignments returns is a compile
// error here rather than a wrong label on the page (Bucket critic C40).
import type { LearnerAssignment } from "@/lib/research-os/class-db";
import { targetIsLinkable } from "@/lib/research-os/assignments";

const STATUS: Record<LearnerAssignment["status"], string> = {
  not_started: "not started",
  in_progress: "in progress",
  produced: "paper submitted",
  accepted: "done",
  overdue: "overdue",
};

export default function AssignmentsBanner({ token, currentTarget }: { token: string | null; currentTarget: string }) {
  const [rows, setRows] = useState<LearnerAssignment[]>([]);
  // An outage is its own state. Leaving the banner absent said the
  // learner has no assignments (Bucket critic C44).
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/research-os/assignments?mine=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setUnavailable(true);
          return;
        }
        const j = (await res.json()) as { assignments: LearnerAssignment[] };
        if (!cancelled) setRows(j.assignments);
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (unavailable) {
    return (
      <div className="mb-3 p-3 border border-[color:var(--hairline)] bg-[color:var(--bone-2)]/70 text-[12px] text-[color:var(--basalt-3)]">
        Assignments could not be read right now.
      </div>
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
            {!targetIsLinkable(a) ? (
              // Labelling a node the learner may not read as "this target"
              // tells them they are already on it (Bucket critic C38).
              <span className="text-[color:var(--basalt-3)]">· target not shared with you</span>
            ) : a.targetSlug && a.targetSlug !== currentTarget ? (
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
