"use client";

/**
 * /research-os/edges, the LLM-proposed prerequisite edge review queue
 * (bkt-ros ros-13, task item 3). Lists every pending graph.edge_proposals
 * row (GET /api/research-os/edges) queued by
 * scripts/research-os/ingest/infer-edges-llm.ts, and lets a signed-in
 * reviewer approve or reject each one (POST /api/research-os/edges). See
 * src/app/api/research-os/edges/route.ts for the full decision rules.
 *
 * Auth reuses the same Supabase email-OTP flow as
 * src/app/research-os/review/page.tsx and workspace/page.tsx. Being
 * signed in is necessary but NOT sufficient: the API gates on
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS
 * allowlist, so a signed-in non-reviewer sees a 403 here instead of the
 * queue.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import SignInGate from "@/components/auth/SignInGate";

interface EdgeProposal {
  id: string;
  fromSlug: string;
  fromTitle: string;
  toSlug: string;
  toTitle: string;
  branch: string;
  confidence: number;
  confidenceSource: string;
  agreement: boolean;
  justification: string;
  secondaryJustification: string | null;
  model: string;
  promptHash: string;
  createdAt: string;
}

export default function ResearchOsEdgesPage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [proposals, setProposals] = useState<EdgeProposal[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: { data: { session: { access_token: string } | null } }) => {
      if (data.session) setToken(data.session.access_token);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { access_token: string } | null) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const authHeaders = useCallback((): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {}), [token]);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    setQueueError(null);
    try {
      const res = await fetch("/api/research-os/edges", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setQueueError(res.status === 403 ? "forbidden" : data.error || "load_failed");
        setProposals(null);
        return;
      }
      setProposals(data.proposals);
    } catch {
      setQueueError("network_error");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);


  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setProposals(null);
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    const reason = (reasons[id] || "").trim();
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/edges", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id, decision, reason: reason || undefined }),
      });
      const data = await res.json();
      setNotice(res.ok ? `${decision === "approved" ? "Approved" : "Rejected"}.` : data.error || "decision_failed");
      if (res.ok) loadQueue();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      <div className="max-w-[900px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / edges, LLM-proposed prerequisite review · "}
          <Link href="/research-os/review" className="underline decoration-[color:var(--gold)] underline-offset-4">
            teacher review queue
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          edge review queue
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Candidate prerequisite edges an LLM proposed from two independently-phrased prompts, waiting on a
          reviewer&rsquo;s approve or reject. A row where the two prompts disagreed carries a low confidence and its own
          same-section-conflation risk (learning/research-os/PLAN-REVISION-2.md section 2c): read the justification
          before approving. Approving writes the edge at confidence 0.95, source &ldquo;teacher.&rdquo; Gated to the
          RESEARCH_OS_REVIEWER_EMAILS allowlist.
        </p>

        <SignInGate signedIn={Boolean(token)} />

        {notice && <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{notice}</p>}

        {queueError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account is not on the reviewer allowlist. Ask an admin to add your email to
            RESEARCH_OS_REVIEWER_EMAILS (see src/lib/research-os/reviewer.ts).
          </p>
        )}
        {queueError && queueError !== "forbidden" && <p className="mt-6 text-[13px] text-red-700">Could not load the queue ({queueError}).</p>}

        {proposals && (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              pending proposals ({proposals.length})
            </h2>
            {proposals.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            {proposals.map((p) => (
              <div key={p.id} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[13px] text-[color:var(--basalt)]">
                  <strong>{p.fromTitle}</strong> &rarr; <strong>{p.toTitle}</strong> &middot; {p.branch}
                </div>
                <div className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                  confidence {p.confidence.toFixed(2)} ({p.confidenceSource})
                  {!p.agreement && <span className="text-red-700"> &middot; prompts disagreed, needs closer review</span>}
                  {" · "}
                  {p.model} &middot; prompt {p.promptHash.slice(0, 8)}
                </div>
                <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">{p.justification}</p>
                {p.secondaryJustification && (
                  <p className="mt-1 text-[12px] text-[color:var(--basalt-2)] italic">second phrasing: {p.secondaryJustification}</p>
                )}
                <input
                  value={reasons[p.id] || ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                  placeholder="optional note"
                  className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                />
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => decide(p.id, "approved")}
                    disabled={busyId === p.id}
                    className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                  >
                    approve
                  </button>
                  <button
                    onClick={() => decide(p.id, "rejected")}
                    disabled={busyId === p.id}
                    className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
