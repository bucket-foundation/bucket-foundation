"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";
import { InlineMath } from "@/components/math/InlineMath";
import { DONE_EVENT, START_EVENT } from "@/lib/research-os/work-quiz/trigger";
import { resourceForQuestion } from "@/lib/research-os/work-quiz/resources";
import { TYPE_LABEL } from "@/lib/research-os/work-quiz/types";
import type { QuizStats } from "@/lib/research-os/work-quiz/db";
import type { SourceStatus } from "@/lib/research-os/work-quiz/sources-server";
import LanguagePicker from "./LanguagePicker";

interface StatsBody {
  stats: QuizStats;
  sources: SourceStatus;
  counts: { beads: number; prs: number; notes: number };
  languages: string[];
}

const API = "/api/research-os/work-quiz";

export async function saveLanguages(languages: string[]): Promise<string[]> {
  const res = await fetch(API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ languages }) });
  if (!res.ok) throw new Error(`languages_${res.status}`);
  return ((await res.json()) as { languages: string[] }).languages;
}

const CARD = "border border-[color:var(--hairline)] rounded-sm p-4 bg-[color:var(--bone)]/70";

export default function QuizPanel() {
  const [body, setBody] = useState<StatsBody | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}?view=stats`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Stats are unavailable (${res.status}).`);
        return;
      }
      setBody((await res.json()) as StatsBody);
      setError(null);
    } catch {
      setError("Stats could not reach the server.");
    }
  }, []);

  useEffect(() => {
    void load();
    const onDone = () => void load();
    window.addEventListener(DONE_EVENT, onDone);
    return () => window.removeEventListener(DONE_EVENT, onDone);
  }, [load]);

  const start = (mode: "manual" | "review") => window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { mode } }));

  const s = body?.stats;
  const accuracy = s && s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => start("manual")} className={BTN_PRIMARY}>take one now</button>
        <button type="button" onClick={() => start("review")} disabled={!s || s.due === 0} className={BTN_SECONDARY}>
          review due{s ? ` · ${s.due}` : ""}
        </button>
      </div>

      {error && <p role="alert" className="text-[13px] text-[color:var(--basalt)]">{error}</p>}

      {s && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["answered", String(s.answered)],
            ["right", accuracy === null ? "none yet" : `${s.correct} · ${accuracy}%`],
            ["in review", String(s.cards)],
            ["next due", s.due > 0 ? "now" : s.nextDueAt ? new Date(s.nextDueAt).toLocaleDateString() : "none"],
          ].map(([k, v]) => (
            <div key={k} className={CARD}>
              <dt className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{k}</dt>
              <dd className="mt-1 text-[18px] text-[color:var(--basalt)]">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {body && <LanguagePicker languages={body.languages ?? []} save={saveLanguages} onSaved={(languages) => setBody((b) => (b ? { ...b, languages } : b))} />}

      {body && (
        <section className={CARD}>
          <h2 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">sources on this machine</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13px] text-[color:var(--basalt-2)]">
            <li>beads: {body.counts.beads} · {body.sources.beads}</li>
            <li>merged PRs: {body.counts.prs} · {body.sources.prs}</li>
            <li>idea and research notes: {body.counts.notes} · {body.sources.notes}</li>
          </ul>
        </section>
      )}

      {s && s.recent.length > 0 && (
        <section>
          <h2 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">recent</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {s.recent.map((r) => {
              const resource = !r.correct && !r.skipped ? resourceForQuestion(r.question) : null;
              return (
              <li key={r.id} className={`${CARD} flex flex-col gap-1`}>
                <div className="flex flex-wrap items-center gap-2 text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
                  <span>{TYPE_LABEL[r.question.type]}</span>
                  <span>{r.skipped ? "skipped" : r.timed_out ? "out of time" : r.correct ? "right" : "missed"}</span>
                  <span className="ml-auto">{r.answered_at ? new Date(r.answered_at).toLocaleString() : ""}</span>
                </div>
                <p className="text-[13px] text-[color:var(--basalt)]"><InlineMath text={r.question.prompt} /></p>
                <p className="text-[12px] text-[color:var(--basalt-3)]"><InlineMath text={r.question.explain} /></p>
                {resource && (
                  <Link href={resource.href} className="text-[12px] underline underline-offset-4 text-[color:var(--aegean-deep)]">
                    {resource.label}
                  </Link>
                )}
              </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
