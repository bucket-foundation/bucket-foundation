"use client";

import { useState, type FormEvent } from "react";
import { checkHandle } from "@/lib/auth/handle";

const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-2.5 text-[14px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";

const ERRORS: Record<string, string> = {
  invalid_handle: "Handles are 3 to 24 characters: lowercase letters, digits, single hyphens.",
  reserved_handle: "That handle is reserved.",
  handle_taken: "That handle is taken.",
  unavailable: "Account storage is unavailable right now.",
  write_failed: "Could not save. Try again.",
};

export default function AccountForm({ initialHandle, initialDisplayName, available }: { initialHandle: string; initialDisplayName: string; available: boolean }) {
  const [handle, setHandle] = useState(initialHandle);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    setError(null);
    if (handle.trim()) {
      const c = checkHandle(handle);
      if (!c.ok) {
        setError(c.reason === "reserved" ? ERRORS.reserved_handle : ERRORS.invalid_handle);
        return;
      }
    }
    setBusy(true);
    const body: Record<string, string> = { displayName };
    if (handle.trim()) body.handle = handle;
    const res = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(ERRORS[j.error ?? ""] ?? "Could not save.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="p-5 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] grid gap-4">
      <div>
        <label htmlFor="account-handle" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">handle</label>
        <input id="account-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="your-handle" className={INPUT + " mt-1"} disabled={!available} />
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">Public, on your mastery profile and your productions.</p>
      </div>
      <div>
        <label htmlFor="account-name" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">display name</label>
        <input id="account-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How teachers and peers see you" className={INPUT + " mt-1"} disabled={!available} maxLength={80} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !available} className="px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]">
          {busy ? "saving" : "save"}
        </button>
        {saved && <span className="text-[12px] text-[color:var(--laurel-deep)]">Saved.</span>}
        {error && <span role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</span>}
        {!available && <span className="text-[12px] text-[color:var(--basalt-3)]">{ERRORS.unavailable}</span>}
      </div>
    </form>
  );
}
