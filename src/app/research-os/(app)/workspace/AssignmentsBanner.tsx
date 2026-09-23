"use client";

import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { LearnerAssignment } from "@/lib/research-os/class-db";
import { assignmentTargetHref, targetIsLinkable } from "@/lib/research-os/assignments";

const STATUS: Record<LearnerAssignment["status"], string> = {
  not_started: "not started",
  in_progress: "in progress",
  produced: "paper submitted",
  accepted: "done",
  overdue: "overdue",
};

export default function AssignmentsBanner({ token, currentTarget }: { token: string | null; currentTarget: string }) {
  const [rows, setRows] = useState<LearnerAssignment[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [transient, setTransient] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/research-os/assignments?mine=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) {
          const transient = isTransientOutage(res.status, await readErrorCode(res));
          if (!cancelled) {
            setUnavailable(true);
            setTransient(transient);
          }
          return;
        }
        const j = (await res.json()) as { assignments: LearnerAssignment[] };
        if (!cancelled) {
          setUnavailable(false);
          setTransient(false);
          setRows(j.assignments);
        }
      } catch {
        if (!cancelled) {
          setUnavailable(true);
          setTransient(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (unavailable) {
    return (
      <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
        {transient ? OUTAGE_COPY.body : UNCONFIGURED_COPY.body}
      </p>
    );
  }

  if (rows.length === 0) return null;
  return (
    <div className="mb-3 p-3 border border-[color:var(--gold)] bg-[color:var(--bone-2)]/70 text-[12px]">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)] mb-1">assigned</div>
      <ul className="grid gap-1">
        {rows.map((a) => {
          const href = assignmentTargetHref(a);
          return (
          <li key={a.id} className="flex flex-wrap items-center gap-2">
            <b>{a.title}</b>
            <span className="text-[color:var(--basalt-3)]">{a.className}</span>
            <span className="text-[color:var(--basalt-3)]">· {STATUS[a.status]}</span>
            {a.dueAt && <span className="text-[color:var(--basalt-3)]">· due {a.dueAt.slice(0, 10)}</span>}
            {!targetIsLinkable(a) ? (
              <span className="text-[color:var(--basalt-3)]">· target not shared with you</span>
            ) : href && a.targetSlug !== currentTarget ? (
              <Link href={href} className="underline decoration-[color:var(--gold)] underline-offset-4">
                open {a.targetTitle} →
              </Link>
            ) : (
              <span className="text-[color:var(--basalt-3)]">· this target</span>
            )}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
