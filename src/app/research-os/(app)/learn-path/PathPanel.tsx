"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Node {
  id: string;
  slug: string;
  title: string;
  tier: number;
  branch: string;
  learnHref: string | null;
}

type Plan =
  | { status: "ready"; target: Node; requiredCount: number; masteredCount: number; studyOrder: Node[]; ready: Node[]; chain: Node[]; mastery: "practice" | "none" }
  | { status: "mastery_conflict"; target: Node; conflicts: Node[] }
  | { status: "cycle" | "missing_node" | "limit"; target: Node }
  | { status: "unavailable" };

type Load = { kind: "loading" } | { kind: "hidden" } | { kind: "error"; message: string } | { kind: "ready"; plan: Plan };

function href(n: Node): string {
  return n.learnHref ?? `/research-os/n/${n.slug}`;
}

export default function PathPanel({ target, compact = false }: { target: string; compact?: boolean }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [all, setAll] = useState(!compact);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/research-os/learning-plan?target=${encodeURIComponent(target)}`, { cache: "no-store" });
        if (!live) return;
        if (!res.ok) return setLoad(compact ? { kind: "hidden" } : { kind: "error", message: res.status === 404 ? "No such concept, or you cannot read it." : `The study path is unavailable (${res.status}).` });
        setLoad({ kind: "ready", plan: (await res.json()) as Plan });
      } catch {
        if (live) setLoad(compact ? { kind: "hidden" } : { kind: "error", message: "The study path could not reach the server." });
      }
    })();
    return () => {
      live = false;
    };
  }, [target, compact]);

  if (load.kind === "hidden" || (load.kind === "loading" && compact)) return null;
  if (load.kind === "loading") return <p className="mt-6 text-[13px] text-[color:var(--basalt-3)]">Loading the study path.</p>;
  if (load.kind === "error") return <p role="alert" className="mt-6 text-[13px] text-[color:var(--basalt)]">{load.message}</p>;
  const p = load.plan;

  return (
    <section aria-label="study path" className={`${compact ? "" : "mt-6 "}border border-[color:var(--hairline)] rounded-sm bg-[color:var(--bone)]/70 p-4 flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">study path</h2>
        {compact && p.status !== "unavailable" && (
          <Link href={`/research-os/learn-path?target=${encodeURIComponent(p.target.slug)}`} className="ml-auto text-[12px] underline underline-offset-4 text-[color:var(--basalt-3)]">
            full path
          </Link>
        )}
      </div>
      {p.status === "ready" ? (
        <>
          <p className="text-[13px] text-[color:var(--basalt-2)]">
            {p.studyOrder.length === 0
              ? "Your practice covers every prerequisite and this concept."
              : `${p.studyOrder.length} of ${p.requiredCount} concepts to go${p.masteredCount ? `, ${p.masteredCount} already known from your practice` : ""}.`}{" "}
            <span className="text-[color:var(--basalt-3)]">{p.mastery === "practice" ? "Based on your practice, uncertified." : "Sign in to drop what you know."}</span>
          </p>
          {p.chain.length > 1 && (
            <p className="text-[12px] text-[color:var(--basalt-3)]">
              shortest chain:{" "}
              {p.chain.map((n, i) => (
                <span key={n.id}>
                  {i > 0 ? " → " : ""}
                  <Link href={href(n)} className="underline underline-offset-4">{n.title}</Link>
                </span>
              ))}
            </p>
          )}
          {p.studyOrder.length > 0 && (
            <ol className="flex flex-col gap-1 list-decimal pl-5 text-[13px] text-[color:var(--basalt)]">
              {(all ? p.studyOrder : p.studyOrder.slice(0, 6)).map((n) => (
                <li key={n.id}>
                  <Link href={href(n)} className="underline underline-offset-4">{n.title}</Link>
                  {p.ready.some((r) => r.id === n.id) && <span className="ml-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--aegean-deep)]">ready</span>}
                </li>
              ))}
            </ol>
          )}
          {!all && p.studyOrder.length > 6 && (
            <button type="button" onClick={() => setAll(true)} className="self-start text-[12px] underline underline-offset-4 text-[color:var(--basalt-3)] min-h-[44px]">
              show all {p.studyOrder.length}
            </button>
          )}
        </>
      ) : p.status === "mastery_conflict" ? (
        <div className="text-[13px] text-[color:var(--basalt-2)]">
          Your practice marks these as known while a prerequisite under them is not. Check them first:
          <ul className="mt-1 list-disc pl-5">
            {p.conflicts.map((n) => (
              <li key={n.id}>
                <Link href={href(n)} className="underline underline-offset-4">{n.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[13px] text-[color:var(--basalt-2)]">
          {p.status === "cycle"
            ? "The prerequisites of this concept loop back on themselves, so no order exists yet."
            : p.status === "limit"
              ? "This concept rests on more prerequisites than one path can show."
              : "A study path is unavailable for this concept."}
        </p>
      )}
    </section>
  );
}
