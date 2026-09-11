"use client";

/**
 * /research-os/roster, the OneRoster 1.2 CSV roster sync upload page
 * (bkt-ros, ros-06 follow-on). Reads the four CSV files POST
 * /api/research-os/roster accepts, runs a dry-run diff by default, and
 * shows what a reviewer's own "apply" click would create, update, or
 * skip. All parsing and diffing happens server-side in that route; this
 * page only renders the JSON it returns, matching /research-os/class's
 * own "the client never queries graph.* directly" posture.
 *
 * Auth reuses the same Supabase email-OTP flow as
 * src/app/research-os/class/page.tsx and src/app/research-os/review/
 * page.tsx. Being signed in is necessary but NOT sufficient: the API
 * gates on src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS
 * allowlist, so a signed-in non-reviewer sees a 403 here instead of a
 * diff.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";

interface RosterDiffCounts {
  orgsParsed: number;
  usersParsed: number;
  classesParsed: number;
  enrollmentsParsed: number;
  classesToCreate: number;
  classesToUpdate: number;
  classesUnresolved: number;
  classMembersToCreate: number;
  classMembersAlreadyPresent: number;
  classMembersSkipped: number;
  reviewerCandidatesToCreate: number;
  reviewerCandidatesToUpdate: number;
  learnerProfilesToCreate: number;
  learnerProfilesToUpdate: number;
  learnerProfilesSkipped: number;
}
interface RosterDiff {
  sourceSystem: string;
  counts: RosterDiffCounts;
  warnings: string[];
}
interface RosterResponse {
  diff: RosterDiff;
  applied: boolean;
  result?: { classesWritten: number; classMembersWritten: number; reviewerCandidatesWritten: number; learnerProfilesWritten: number };
}

const FIELDS = ["orgs", "users", "classes", "enrollments"] as const;
type Field = (typeof FIELDS)[number];

const COUNT_ROWS: Array<{ key: keyof RosterDiffCounts; label: string }> = [
  { key: "classesToCreate", label: "classes to create" },
  { key: "classesToUpdate", label: "classes to update" },
  { key: "classesUnresolved", label: "classes unresolved, no teacher" },
  { key: "classMembersToCreate", label: "class members to add" },
  { key: "classMembersAlreadyPresent", label: "class members already present" },
  { key: "classMembersSkipped", label: "class members skipped" },
  { key: "reviewerCandidatesToCreate", label: "reviewer candidates to create" },
  { key: "reviewerCandidatesToUpdate", label: "reviewer candidates to update" },
  { key: "learnerProfilesToCreate", label: "learner profiles to create" },
  { key: "learnerProfilesToUpdate", label: "learner profiles to update" },
  { key: "learnerProfilesSkipped", label: "learner profiles skipped" },
];

export default function ResearchOsRosterPage() {
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

  const [files, setFiles] = useState<Partial<Record<Field, File>>>({});
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setResponse(null);
  }

  async function runSync(apply: boolean) {
    if (!token) return;
    const missing = FIELDS.filter((f) => !files[f]);
    if (missing.length > 0) {
      setError(`missing file(s): ${missing.join(", ")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of FIELDS) form.set(f, files[f] as File);
      form.set("apply", apply ? "true" : "false");
      const res = await fetch("/api/research-os/roster", { method: "POST", headers: authHeaders(), body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(res.status === 403 ? "forbidden" : body.error || "sync_failed");
        return;
      }
      setResponse(body as RosterResponse);
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stone-bone relative grain min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / roster sync, OneRoster 1.2 CSV · "}
          <Link href="/research-os/class" className="underline decoration-[color:var(--gold)] underline-offset-4">
            class view
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          roster sync
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Upload the four files a standard OneRoster 1.2 bulk export carries: orgs.csv, users.csv,
          classes.csv, enrollments.csv. A dry run shows what would change; nothing is written until
          you choose apply. See <code>learning/research-os/ROSTER.md</code> for the field mapping.
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
                {authBusy ? "checking…" : "verify"}
              </button>
            </div>
          )}
          {authError && <p className="mt-2 text-[12px] text-red-700">{authError}</p>}
        </div>

        {token && (
          <div className="mt-6 p-4 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <label key={f} className="flex flex-col gap-1 text-[12px] small-caps text-[color:var(--basalt-2)]">
                  {f}.csv
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFiles((prev) => ({ ...prev, [f]: e.target.files?.[0] }))}
                    className="text-[12px]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => runSync(false)}
                disabled={busy}
                className="px-4 py-2 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
              >
                {busy ? "working…" : "dry run"}
              </button>
              <button
                onClick={() => runSync(true)}
                disabled={busy}
                className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {busy ? "working…" : "apply"}
              </button>
            </div>
            {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}
          </div>
        )}

        {response && (
          <div className="mt-6 p-4 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] overflow-x-auto">
            <p className="text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt)] mb-2">
              {response.applied ? "applied" : "dry run"} · source {response.diff.sourceSystem} · {response.diff.counts.orgsParsed} orgs,{" "}
              {response.diff.counts.usersParsed} users, {response.diff.counts.classesParsed} classes,{" "}
              {response.diff.counts.enrollmentsParsed} enrollments parsed
            </p>
            <table className="text-[12px] w-full">
              <tbody>
                {COUNT_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-[color:var(--hairline)]">
                    <td className="py-1 pr-4 text-[color:var(--basalt-2)]">{row.label}</td>
                    <td className="py-1 text-right font-mono">{response.diff.counts[row.key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {response.diff.warnings.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] small-caps text-[color:var(--basalt)]">warnings</p>
                <ul className="mt-1 text-[12px] text-[color:var(--basalt-2)] list-disc pl-4">
                  {response.diff.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
