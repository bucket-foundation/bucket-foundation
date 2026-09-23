"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import SignInGate from "@/components/auth/SignInGate";

interface PendingRecord {
  id: string;
  title: string;
  doi: string | null;
  canonScore: number;
  tier: "canon" | "outcome";
  path: string;
  provenanceSignoff: string | null;
  status: string;
}

export default function CanonSignoffPage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [records, setRecords] = useState<PendingRecord[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
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

  const loadRecords = useCallback(async () => {
    if (!token) return;
    setListError(null);
    try {
      const res = await fetch("/api/canon/signoff", { headers: authHeaders() });
      const data = (await res.json().catch(() => ({}))) as { error?: string; records?: PendingRecord[] };
      if (!res.ok) {
        setListError(res.status === 403 ? "forbidden" : data.error || "load_failed");
        setRecords(null);
        return;
      }
      setRecords(data.records ?? null);
    } catch {
      setListError("network_error");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);


  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setRecords(null);
  }

  async function decide(record: PendingRecord, action: "approve" | "reject") {
    const reason = (reasons[record.id] || "").trim();
    if (action === "reject" && !reason) {
      setNotice("A one-line reason is required to reject a record.");
      return;
    }
    setBusyId(record.id);
    setNotice(null);
    try {
      const res = await fetch("/api/canon/signoff", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, record: `${record.path}#${record.id}`, reason: reason || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setNotice(res.ok ? `${action === "approve" ? "Approved" : "Rejected"} ${record.id}.` : data.error || "signoff_failed");
      if (res.ok) loadRecords();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="stone-bone relative grain min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/" className="underline decoration-[color:var(--gold)] underline-offset-4">
            bucket.foundation
          </Link>
          {" / canon sign-off"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          canon sign-off
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Records `tools/canon-pipeline/intake.py` landed with `provenance_signoff: pending`, waiting on a named
          human decision (GOVERNANCE.md). Gated to CANON_SIGNOFF_APPROVERS, on top of the RESEARCH_OS_REVIEWER_EMAILS
          allowlist. The same decision from the command line: `tools/canon-pipeline/signoff.py`.
        </p>

        <SignInGate signedIn={Boolean(token)} />

        {notice && <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{notice}</p>}

        {listError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account cannot approve canon. Ask the founder to add your email to CANON_SIGNOFF_APPROVERS (see
            src/lib/canon-signoff-approvers.ts); it must also be on RESEARCH_OS_REVIEWER_EMAILS.
          </p>
        )}
        {listError && listError !== "forbidden" && (
          <p className="mt-6 text-[13px] text-red-700">Could not load the queue ({listError}).</p>
        )}

        {records && (
          <section className="mt-8">
            <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-3">
              pending records ({records.length})
            </h2>
            {records.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            <div className="flex flex-col gap-3">
              {records.map((r) => (
                <div key={r.id} className="p-4 bg-[color:var(--bone)]">
                  <div className="text-[13px] text-[color:var(--basalt)]">
                    <strong>{r.title}</strong>
                  </div>
                  <div className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                    {r.tier} &middot; score {r.canonScore} &middot; {r.doi ? `DOI ${r.doi}` : "no DOI"} &middot; {r.path}#{r.id}
                  </div>
                  <input
                    value={reasons[r.id] || ""}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="one-line reason (required to reject)"
                    className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                  />
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => decide(r, "approve")}
                      disabled={busyId === r.id}
                      className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                    >
                      approve
                    </button>
                    <button
                      onClick={() => decide(r, "reject")}
                      disabled={busyId === r.id}
                      className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                    >
                      reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
