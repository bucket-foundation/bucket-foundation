"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { BIRTH_YEAR_BUCKET_LABELS, ROLE_LABELS } from "@/lib/research-os/profile";
import type { BirthYearBucket, ConsentStatus, LearnerRole } from "@/lib/research-os/consent";
import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import AccessMine from "./AccessMine";
import GameSection from "./GameSection";
import ConsentPayeeSection from "./ConsentPayeeSection";
import SignInGate from "@/components/auth/SignInGate";

const ROLE_OPTIONS: LearnerRole[] = ["student", "teacher", "independent"];
const BUCKET_OPTIONS: BirthYearBucket[] = ["under13", "13to17", "18plus"];

interface ProfileResponse {
  role: LearnerRole;
  birthYearBucket: BirthYearBucket | null;
  consentStatus: ConsentStatus;
  updatedAt: string;
}

export default function ResearchOsProfilePage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [role, setRole] = useState<LearnerRole | "">("");
  const [bucket, setBucket] = useState<BirthYearBucket | "">("");
  const [existing, setExisting] = useState<ProfileResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    if (!token) return;
    setLoadError(null);
    (async () => {
      try {
        const res = await fetch("/api/research-os/profile", { headers: { authorization: `Bearer ${token}` } });
        const data = (await res.json().catch(() => ({}))) as { profile?: ProfileResponse | null; error?: string };
        if (!res.ok) {
          setLoadError(isTransientOutage(res.status, data.error ?? null) ? "transient" : data.error || "load_failed");
          return;
        }
        if (data.profile) {
          setExisting(data.profile);
          setRole(data.profile.role);
          setBucket(data.profile.birthYearBucket ?? "");
        }
      } catch {
        setLoadError("transient");
      }
    })();
  }, [token]);


  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setExisting(null);
  }

  async function saveProfile() {
    if (!token || !role || !bucket) return;
    setSaveBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/research-os/profile", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, birthYearBucket: bucket }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; profile?: ProfileResponse | null };
      if (!res.ok) {
        setSaveError(isTransientOutage(res.status, data.error ?? null) ? OUTAGE_COPY.body : data.error || "save_failed");
        return;
      }
      setExisting(data.profile ?? null);
      setSaved(true);
    } catch {
      setSaveError("network_error");
    } finally {
      setSaveBusy(false);
    }
  }

  const isMinorBucket = bucket === "under13" || bucket === "13to17";
  const consentOnFile = existing?.consentStatus && existing.consentStatus !== "none";

  return (
    <main>
      <div className="max-w-[640px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / profile"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.4rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          your profile
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          Two questions, nothing else. No birthdate, no name. This tells us if a parent or your school needs to say
          yes before you can use the AI tools.
        </p>

        <SignInGate signedIn={Boolean(token)} />

        {loadError === "transient" && <p className="mt-4 text-[13px] text-red-700">{OUTAGE_COPY.body}</p>}
        {loadError && loadError !== "transient" && <p className="mt-4 text-[13px] text-red-700">Could not load your profile ({loadError}).</p>}

        {token && (
          <div className="mt-6 p-4 bg-[color:var(--bone)] flex flex-col gap-5">
            <div>
              <div className="text-[11px] small-caps text-[color:var(--aegean-deep)] mb-2">who are you</div>
              <div className="flex flex-col gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-[13px] text-[color:var(--basalt)]">
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] small-caps text-[color:var(--aegean-deep)] mb-2">how old are you</div>
              <div className="flex flex-col gap-2">
                {BUCKET_OPTIONS.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-[13px] text-[color:var(--basalt)]">
                    <input type="radio" name="bucket" value={b} checked={bucket === b} onChange={() => setBucket(b)} />
                    {BIRTH_YEAR_BUCKET_LABELS[b]}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saveBusy || !role || !bucket}
              className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 self-start"
            >
              {saveBusy ? "saving…" : "save profile"}
            </button>

            {saveError && <p className="text-[12px] text-red-700 break-words">{saveError}</p>}

            {saved && (
              <div className="text-[13px] text-[color:var(--basalt-2)] leading-[1.6]">
                {isMinorBucket && !consentOnFile ? (
                  <p>
                    Profile saved. If you are under 18, a parent or your school still needs to say yes before you
                    can use the AI tools. Ask them to do that, then come back to the{" "}
                    <Link href="/research-os/workspace" className="underline decoration-[color:var(--gold)] underline-offset-4">
                      workspace
                    </Link>
                    .
                  </p>
                ) : (
                  <p>
                    Profile saved. Head to the{" "}
                    <Link href="/research-os/workspace" className="underline decoration-[color:var(--gold)] underline-offset-4">
                      workspace
                    </Link>{" "}
                    to start.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <ConsentPayeeSection token={token} />
        <GameSection token={token} />
        <AccessMine token={token} />
      </div>
    </main>
  );
}
