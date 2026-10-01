"use client";

import { useState, type FormEvent } from "react";
import DraftList, { type Draft } from "./DraftList";

const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";

export default function DraftsAdmin() {
  const [key, setKey] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/whats-new/entries?state=draft", { headers: { authorization: `Bearer ${key}` }, cache: "no-store" });
      if (res.status === 404) {
        setDrafts(null);
        setError("That key does not open the drafts. It needs an admin key.");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { entries?: Draft[]; error?: string };
      if (!res.ok || !Array.isArray(body.entries)) {
        setDrafts(null);
        setError(body.error ?? `The drafts did not load (HTTP ${res.status}).`);
        return;
      }
      setDrafts(body.entries);
    } catch {
      setDrafts(null);
      setError("The drafts did not load. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={load} className="flex flex-col gap-3 md:flex-row md:items-end max-w-[640px]">
        <label className="flex-1 text-sm text-[color:var(--basalt-2)]">
          Admin key
          <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} className={INPUT} />
        </label>
        <button type="submit" disabled={busy || !key} className={BUTTON}>
          {busy ? "Loading" : "Show drafts"}
        </button>
      </form>
      <p className="mt-2 text-xs text-[color:var(--parchment-dim)]">The key stays in this tab and is gone when the tab closes or reloads.</p>
      {error && <p role="alert" className="mt-4 text-sm text-[color:var(--basalt)]">{error}</p>}
      {drafts && <DraftList drafts={drafts} />}
    </div>
  );
}
