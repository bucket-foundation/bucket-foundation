"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/providers/SessionProvider";
import { BTN_PRIMARY, BTN_SECONDARY, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";
import { BIRTH_YEAR_BUCKET_LABELS } from "@/lib/research-os/profile";
import type { BirthYearBucket } from "@/lib/research-os/consent";

type Band = BirthYearBucket;
type GateState =
  | { kind: "loading" }
  | { kind: "open" }
  | { kind: "ask"; role: string | null }
  | { kind: "band"; band: Band };

const BANDS: Band[] = ["18plus", "13to17", "under13"];

function clearLocalProgress(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("bucket-academy/v1/")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
  }
}

export function AgeBandStep({ role, onSaved }: { role: string | null; onSaved: (band: Band) => void }) {
  const { accessToken } = useSession();
  const [pending, setPending] = useState<Band | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(band: Band) {
    setBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
      const res = await fetch("/api/research-os/profile", {
        method: "POST",
        headers,
        body: JSON.stringify({ role: role ?? (band === "18plus" ? "independent" : "student"), birthYearBucket: band }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.message || "Your age range could not be saved. Try again in a moment.");
        return;
      }
      if (band === "under13") clearLocalProgress();
      onSaved(band);
    } catch {
      setError("Your age range could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Research OS · learn" title="one question first" lede="How old are you? Pick a range. We store the range only, never a birthdate." />
      <Panel title="your age range">
        {pending === "under13" ? (
          <div className="flex flex-col gap-3 text-[14px] leading-[1.6] text-[color:var(--basalt-2)]">
            <p>Bucket is for learners 13 and over. Choosing under 13 deletes the learning data this account holds.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => save("under13")}>
                confirm under 13
              </button>
              <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => setPending(null)}>
                go back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {BANDS.map((b) => (
              <button
                key={b}
                type="button"
                className={b === "18plus" ? BTN_PRIMARY : BTN_SECONDARY}
                disabled={busy}
                onClick={() => (b === "under13" ? setPending(b) : save(b))}
              >
                {BIRTH_YEAR_BUCKET_LABELS[b]}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-[13px] text-[color:var(--basalt-2)]">{error}</p>}
      </Panel>
    </div>
  );
}

export default function AgeGate({ children }: { children: ReactNode }) {
  const { accessToken, loading } = useSession();
  const [state, setState] = useState<GateState>({ kind: "loading" });

  const load = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    try {
      const res = await fetch("/api/research-os/profile", { headers, cache: "no-store" });
      if (!res.ok) {
        setState({ kind: "open" });
        return;
      }
      const data = (await res.json()) as { profile?: { role: string; birthYearBucket: Band | null } | null };
      const band = data.profile?.birthYearBucket ?? null;
      setState(band ? { kind: "band", band } : { kind: "ask", role: data.profile?.role ?? null });
    } catch {
      setState({ kind: "open" });
    }
  }, [accessToken]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  if (state.kind === "loading") return <LoadingState label="Checking your profile" />;
  if (state.kind === "ask") return <AgeBandStep role={state.role} onSaved={(band) => setState({ kind: "band", band })} />;
  if (state.kind === "band" && state.band === "under13") {
    return (
      <ErrorState
        title="Learn is for learners 13 and over"
        body="This account holds no learning data. If the age range is wrong, contact Bucket to change it."
      />
    );
  }
  return (
    <>
      {state.kind === "band" && state.band === "13to17" && (
        <p className="mb-4 border border-[color:var(--hairline)] bg-[color:var(--bone)] px-4 py-3 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
          During launch, learners under 18 can study here, and progress stays on this device.
        </p>
      )}
      {children}
    </>
  );
}
