"use client";

import { useCallback, useEffect, useState } from "react";
import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";

// Consent and the payee on the profile (ros-32): where the learner's
// consent comes from (adult, the school exception, a verified vendor, a
// recorded parent consent), the path still needed, a way to start it, and
// for anyone under 18 the guardian or custodial payee with visibility on.

interface ConsentView {
  profile: { birthYearBucket: string | null; consentStatus: string } | null;
  effective: { status: string; source: string | null; path: string };
  pathNeeded: "none_needed" | "school" | "vendor" | "ask_age";
  requests: { id: string; vendor: string; status: string; createdAt: string }[];
}
interface PayeeView {
  payeeType: "self" | "guardian" | "custodial" | null;
  hasGuardianContact: boolean;
  visibility: boolean;
  decision: { ok: true; payee: string } | { ok: false; reason: string };
}

const PATH_COPY: Record<string, string> = {
  adult: "no consent needed",
  profile: "consent on file",
  school: "covered by your class's school consent",
  vendor: "verified parental consent",
  none: "no consent on file",
};
const NEEDED_COPY: Record<ConsentView["pathNeeded"], string> = {
  none_needed: "",
  school: "your class covers you under the school exception",
  vendor: "a parent or guardian needs to say yes",
  ask_age: "answer the age question above first",
};
const REASON_COPY: Record<string, string> = {
  age_unknown: "answer the age question first",
  guardian_required: "under 18: choose a guardian or a custodial account",
  guardian_contact_required: "add a guardian contact so they can see every payment",
};

export default function ConsentPayeeSection({ token }: { token: string | null }) {
  const [consent, setConsent] = useState<ConsentView | null>(null);
  const [payee, setPayee] = useState<PayeeView | null>(null);
  const [vendor, setVendor] = useState<"manual" | "privo" | "kid">("manual");
  const [contact, setContact] = useState("");
  const [payeeType, setPayeeType] = useState<"self" | "guardian" | "custodial">("guardian");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  const headers = useCallback((): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, p] = await Promise.all([
        fetch("/api/research-os/consent", { headers: headers(), cache: "no-store" }),
        fetch("/api/research-os/payee", { headers: headers(), cache: "no-store" }),
      ]);
      if (c.ok) {
        setConsent((await c.json()) as ConsentView);
        setLoadNote(null);
      } else {
        // A failed read left `consent` null, and the early return below
        // renders null when it is, so the whole consent section vanished
        // and the learner was told nothing at all. A minor reads that as
        // a screen with no consent on it.
        setLoadNote(isTransientOutage(c.status, await readErrorCode(c)) ? OUTAGE_COPY.body : UNCONFIGURED_COPY.body);
      }
      if (p.ok) {
        const pv = (await p.json()) as PayeeView;
        setPayee(pv);
        if (pv.payeeType) setPayeeType(pv.payeeType);
      }
    } catch {
      // A fetch that rejects never reached the server, which a retry may
      // clear. Swallowing it was the same vanishing section.
      setLoadNote(OUTAGE_COPY.body);
    }
  }, [token, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestConsent() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/consent", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers() },
        body: JSON.stringify({ action: "request", vendor, guardianContact: contact }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; url?: string | null };
      if (!res.ok)
        setNote(
          isTransientOutage(res.status, j.error ?? null)
            ? OUTAGE_COPY.body
            : j.error === "vendor_not_configured"
              ? "That vendor is not connected yet; ask your teacher to record consent, or pick the manual path."
              : (j.error ?? "failed"),
        );
      else setNote(j.url ? `Consent started. A parent completes it at ${j.url}` : "Consent requested. Your teacher or librarian records it once a parent has said yes.");
      setContact("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function savePayee() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/payee", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers() },
        body: JSON.stringify({ payeeType, guardianContact: contact || undefined, visibility: true }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setNote(j.error ?? "failed");
      } else {
        setContact("");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;
  // The note renders above this return. Leaving it below meant a failed
  // read rendered nothing, which is the whole point of setting it.
  if (!consent)
    return loadNote ? (
      <p role="alert" className="mt-10 text-[13px] text-[color:var(--gold-deep)]">
        {loadNote}
      </p>
    ) : null;
  const minor = consent.profile?.birthYearBucket === "under13" || consent.profile?.birthYearBucket === "13to17";

  return (
    <section className="mt-10 grid gap-6">
      {loadNote && (
        <p role="alert" className="text-[13px] text-[color:var(--gold-deep)]">
          {loadNote}
        </p>
      )}
      <div>
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-2">§ consent</div>
        <p className="text-[14px]">
          {PATH_COPY[consent.effective.path] ?? consent.effective.path}
          {consent.effective.source && <span className="text-[color:var(--basalt-3)]"> · {consent.effective.source}</span>}
        </p>
        {consent.effective.status === "none" && consent.pathNeeded !== "none_needed" && (
          <p className="text-[13px] text-[color:var(--basalt-3)] mt-1">{NEEDED_COPY[consent.pathNeeded]}</p>
        )}
        {consent.effective.status === "none" && consent.pathNeeded === "vendor" && (
          <div className="mt-3 grid gap-2 max-w-md text-[13px]">
            <div className="flex flex-wrap gap-2">
              <select value={vendor} onChange={(e) => setVendor(e.target.value as typeof vendor)} className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1">
                <option value="manual">a parent tells my teacher or librarian</option>
                <option value="privo">PRIVO</option>
                <option value="kid">k-ID</option>
              </select>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="parent or guardian email, kept hashed" className="flex-1 min-w-[12rem] bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1" />
            </div>
            <div>
              <button type="button" disabled={busy} onClick={() => void requestConsent()} className="px-3 py-1.5 rounded border border-[color:var(--gold)] small-caps text-[10px] tracking-[0.14em] hover:bg-[color:var(--gold)] hover:text-[color:var(--basalt)]">
                ask for consent
              </button>
            </div>
          </div>
        )}
        {consent.requests.length > 0 && (
          <ul className="mt-2 text-[12px] text-[color:var(--basalt-3)] grid gap-0.5">
            {consent.requests.map((r) => (
              <li key={r.id}>
                {r.vendor} · {r.status} · {r.createdAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {payee && (
        <div>
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-2">§ payments</div>
          <p className="text-[14px]">
            {payee.decision.ok ? (
              <>
                citation payments go to <b>{payee.decision.payee === "self" ? "you" : payee.decision.payee === "guardian" ? "your guardian" : "a custodial account"}</b>
                {minor && " · your guardian can see every payment"}
              </>
            ) : (
              <span className="text-[color:var(--basalt-3)]">payments off: {REASON_COPY[payee.decision.reason] ?? payee.decision.reason}</span>
            )}
          </p>
          {minor && (
            <div className="mt-3 grid gap-2 max-w-md text-[13px]">
              <div className="flex flex-wrap gap-2">
                <select value={payeeType} onChange={(e) => setPayeeType(e.target.value as typeof payeeType)} className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1">
                  <option value="guardian">a parent or guardian is paid</option>
                  <option value="custodial">a custodial account is paid</option>
                </select>
                {payeeType === "guardian" && (
                  <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={payee.hasGuardianContact ? "guardian contact on file; replace" : "guardian email, kept hashed"} className="flex-1 min-w-[12rem] bg-transparent border border-[color:var(--hairline)] rounded px-2 py-1" />
                )}
              </div>
              <div>
                <button type="button" disabled={busy} onClick={() => void savePayee()} className="px-3 py-1.5 rounded border border-[color:var(--gold)] small-caps text-[10px] tracking-[0.14em] hover:bg-[color:var(--gold)] hover:text-[color:var(--basalt)]">
                  save payee
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {note && <p className="text-[12px] text-[color:var(--aegean-deep)]">{note}</p>}
    </section>
  );
}
