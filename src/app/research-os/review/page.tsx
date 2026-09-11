"use client";

/**
 * /research-os/review, the teacher review queue (bkt-ros, Phase 1 item 4).
 * Lists every held transfer-item answer and every submitted Production
 * awaiting a decision (GET /api/research-os/review), and lets a signed-in
 * reviewer approve or return each one (POST /api/research-os/review). See
 * src/app/api/research-os/review/route.ts for the full decision rules.
 *
 * Auth reuses the same Supabase email-OTP flow as
 * src/app/research-os/workspace/page.tsx. Being signed in is necessary but
 * NOT sufficient: the API gates on
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist,
 * so a signed-in non-reviewer sees a 403 here instead of the queue.
 * TODO(Phase 1, review section 4 gap analysis "Role system"): this page has
 * no roster and no class-scoped view -- a reviewer sees every pending item
 * across the whole graph. That is fine at Phase 0/1's single-path scale and
 * stops being fine once a real school's worth of learners and nodes exist.
 * reviewer.ts's own header
 * has the plan to replace the allowlist with a roster-backed role; this
 * page's query (currently "every pending item, no class filter") is the
 * matching TODO on the UI side.
 *
 * Production guard (bkt-ros, production guard bead, task item 5): each
 * queued Production now also shows its guard flags (unverified sources,
 * a duplicate-claim match, missing counter-evidence at the
 * internalization tier, a single-source lateral-reading flag), computed
 * by /api/research-os/production's POST at submit time and read here
 * as-is. Approve is disabled client-side
 * while any source is unverified (the API's own 409 is the enforced
 * gate; this is the same belt-and-suspenders posture the rest of this
 * codebase already keeps between RLS and an application-code check); a
 * "use template" button fills the reason field with
 * production-guard.ts's own unverifiedSourceReturnNote text for a return
 * decision.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";

interface TransferHold {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
  stage: string;
  heldAt: string;
}
interface SourceCheck {
  text: string;
  verified: boolean;
}
interface DuplicateFlag {
  matchId: string;
  matchOrigin: "own_prior" | "class_peer" | "canon";
  score: number;
}
type LateralReadingFlag = "single-source" | null;
interface PendingProduction {
  id: string;
  learnerId: string;
  targetNodeId: string;
  targetTitle: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transferProof: Record<string, unknown>;
  createdAt: string;
  sourceProvenance: SourceCheck[];
  duplicateFlag: DuplicateFlag | null;
  lateralReadingFlag: LateralReadingFlag;
  counterEvidence: Array<{ text: string }>;
  counterEvidenceRequired: boolean;
  guardFlags: { hasUnverifiedSource: boolean; unverifiedCount: number; missingCounterEvidence: boolean };
  unverifiedSourceNoteTemplate: string;
}
interface ReviewQueue {
  transferHolds: TransferHold[];
  productions: PendingProduction[];
}

export default function ResearchOsReviewPage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
      const res = await fetch("/api/research-os/review", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setQueueError(res.status === 403 ? "forbidden" : data.error || "load_failed");
        setQueue(null);
        return;
      }
      setQueue(data);
    } catch {
      setQueueError("network_error");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function sendOtp() {
    if (!supabase || !email.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setAuthBusy(false);
    if (error) setAuthError(error.message);
    else setOtpSent(true);
  }

  async function verifyOtp() {
    if (!supabase || !otpCode.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: "email" });
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.session) setToken(data.session.access_token);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setQueue(null);
  }

  async function decide(
    key: string,
    decision: "approved" | "returned",
    payload: { kind: "transfer_item"; learnerId: string; nodeId: string } | { kind: "production"; productionId: string },
  ) {
    const reason = (reasons[key] || "").trim();
    if (decision === "returned" && !reason) {
      setNotice("A one-line reason is required to return an item.");
      return;
    }
    setBusyKey(key);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/review", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...payload, decision, reason: reason || undefined }),
      });
      const data = await res.json();
      setNotice(res.ok ? `${decision === "approved" ? "Approved" : "Returned"}.` : data.message || data.error || "decision_failed");
      if (res.ok) loadQueue();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="stone-bone relative grain min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / review, Phase 1 reviewer queue · "}
          <Link href="/research-os/class" className="underline decoration-[color:var(--gold)] underline-offset-4">
            class view
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          review queue
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Held transfer-item answers and submitted Productions, waiting on a reviewer&rsquo;s approve or return. Gated
          to the RESEARCH_OS_REVIEWER_EMAILS allowlist; there is no class roster yet (Phase 1 scope).
        </p>

        <div className="mt-6 p-4 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
          {token ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[13px] text-[color:var(--basalt-2)]">Signed in.</span>
              <button onClick={signOut} className="text-[12px] small-caps underline underline-offset-4">
                sign out
              </button>
            </div>
          ) : !otpSent ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reviewer@school.example"
                className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 flex-1 min-w-[200px]"
              />
              <button
                onClick={sendOtp}
                disabled={authBusy || !email.trim()}
                className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {authBusy ? "sending…" : "send code"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 w-[160px]"
              />
              <button
                onClick={verifyOtp}
                disabled={authBusy || !otpCode.trim()}
                className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {authBusy ? "verifying…" : "verify"}
              </button>
            </div>
          )}
          {authError && <p className="mt-2 text-[12px] text-red-700">{authError}</p>}
        </div>

        {notice && <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{notice}</p>}

        {queueError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account is not on the reviewer allowlist. Ask an admin to add your email to
            RESEARCH_OS_REVIEWER_EMAILS (see src/lib/research-os/reviewer.ts).
          </p>
        )}
        {queueError && queueError !== "forbidden" && <p className="mt-6 text-[13px] text-red-700">Could not load the queue ({queueError}).</p>}

        {queue && (
          <div className="mt-8 flex flex-col gap-10">
            <section>
              <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-3">
                held transfer items ({queue.transferHolds.length})
              </h2>
              {queue.transferHolds.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
              <div className="flex flex-col gap-3">
                {queue.transferHolds.map((h) => {
                  const key = `t:${h.learnerId}:${h.nodeId}`;
                  return (
                    <div key={key} className="p-4 bg-[color:var(--bone)]">
                      <div className="text-[13px] text-[color:var(--basalt)]">
                        <strong>{h.nodeTitle}</strong> &middot; learner {h.learnerId.slice(0, 8)}&hellip; &middot; held {new Date(h.heldAt).toLocaleString()}
                      </div>
                      <input
                        value={reasons[key] || ""}
                        onChange={(e) => setReasons((r) => ({ ...r, [key]: e.target.value }))}
                        placeholder="one-line reason (required to return)"
                        className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                      />
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => decide(key, "approved", { kind: "transfer_item", learnerId: h.learnerId, nodeId: h.nodeId })}
                          disabled={busyKey === key}
                          className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                        >
                          approve
                        </button>
                        <button
                          onClick={() => decide(key, "returned", { kind: "transfer_item", learnerId: h.learnerId, nodeId: h.nodeId })}
                          disabled={busyKey === key}
                          className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                        >
                          return
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-3">
                submitted productions ({queue.productions.length})
              </h2>
              {queue.productions.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
              <div className="flex flex-col gap-3">
                {queue.productions.map((p) => {
                  const key = `p:${p.id}`;
                  const approveBlocked = p.guardFlags.hasUnverifiedSource;
                  return (
                    <div key={key} className="p-4 bg-[color:var(--bone)]">
                      <div className="text-[13px] text-[color:var(--basalt)]">
                        <strong>{p.targetTitle}</strong> &middot; learner {p.learnerId.slice(0, 8)}&hellip; &middot; submitted{" "}
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                      {p.claim && <p className="mt-1 text-[12px] text-[color:var(--basalt-2)]">claim: {p.claim}</p>}

                      {/* Production guard flags (task item 5): unverified
                          sources, a duplicate-claim match, missing
                          counter-evidence at the internalization tier. */}
                      {(approveBlocked || p.duplicateFlag || p.lateralReadingFlag || p.guardFlags.missingCounterEvidence) && (
                        <div className="mt-2 flex flex-col gap-1">
                          {approveBlocked && (
                            <p className="text-[12px] text-red-700">
                              {p.guardFlags.unverifiedCount} unverified source{p.guardFlags.unverifiedCount === 1 ? "" : "s"}: no Quote call
                              matched{" "}
                              {p.sourceProvenance
                                .filter((s) => !s.verified)
                                .map((s) => `"${s.text}"`)
                                .join(", ")}
                              . Approve is blocked until this is returned and resubmitted.
                            </p>
                          )}
                          {p.duplicateFlag && (
                            <p className="text-[12px] text-[color:var(--aegean-deep)]">
                              possible duplicate: {Math.round(p.duplicateFlag.score * 100)}% token overlap with a {p.duplicateFlag.matchOrigin.replace("_", " ")}{" "}
                              claim ({p.duplicateFlag.matchId.slice(0, 8)}&hellip;)
                            </p>
                          )}
                          {p.guardFlags.missingCounterEvidence && (
                            <p className="text-[12px] text-red-700">missing counter-evidence, required at the internalization tier (Osborne 2010)</p>
                          )}
                          {p.lateralReadingFlag === "single-source" && (
                            <p className="text-[12px] text-[color:var(--aegean-deep)]">
                              single source: no independent second source on file for this claim (lateral reading)
                            </p>
                          )}
                        </div>
                      )}

                      <input
                        value={reasons[key] || ""}
                        onChange={(e) => setReasons((r) => ({ ...r, [key]: e.target.value }))}
                        placeholder="one-line reason (required to return)"
                        className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                      />
                      {approveBlocked && p.unverifiedSourceNoteTemplate && (
                        <button
                          onClick={() => setReasons((r) => ({ ...r, [key]: p.unverifiedSourceNoteTemplate }))}
                          className="mt-1 text-[11px] small-caps underline underline-offset-4"
                        >
                          use unverified-source template
                        </button>
                      )}
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => decide(key, "approved", { kind: "production", productionId: p.id })}
                          disabled={busyKey === key || approveBlocked}
                          title={approveBlocked ? "Blocked: this production has an unverified source." : undefined}
                          className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                        >
                          approve
                        </button>
                        <button
                          onClick={() => decide(key, "returned", { kind: "production", productionId: p.id })}
                          disabled={busyKey === key}
                          className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                        >
                          return
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
