"use client";

import { useState, type FormEvent } from "react";
import { NAME_MAX, WAITLIST_ROLES } from "@/lib/waitlist/core";

const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON = "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";
const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";

/** The launch-list form shown at /sign-in until Research OS opens. */
export default function WaitlistForm({ wanted }: { wanted: string | null }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address, name, role, wanted, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Your signup did not save. Try again in a minute.");
        return;
      }
      setJoined(address);
    } catch {
      setError("No connection. Check your network and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <div role="status" aria-live="polite" className="mt-8 border-l-2 border-[color:var(--gold)] pl-4 py-1">
        <p className="text-[15px] text-[color:var(--basalt)]">You are on the list.</p>
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">
          We will email <span className="break-all">{joined}</span> the day Research OS opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
      <label htmlFor="waitlist-email" className={LABEL}>
        email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@school.example"
        className={INPUT}
      />

      <label htmlFor="waitlist-name" className={LABEL + " mt-2"}>
        name <span className="normal-case tracking-normal">(optional)</span>
      </label>
      <input
        id="waitlist-name"
        type="text"
        autoComplete="name"
        maxLength={NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={INPUT}
      />

      <label htmlFor="waitlist-role" className={LABEL + " mt-2"}>
        I am a <span className="normal-case tracking-normal">(optional)</span>
      </label>
      <select id="waitlist-role" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
        <option value="">choose one</option>
        {WAITLIST_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Hidden from people and from assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label htmlFor="waitlist-website">website</label>
        <input id="waitlist-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <button type="submit" disabled={busy || !email.trim()} className={BUTTON + " mt-3"}>
        {busy ? "saving" : "notify me"}
      </button>
      {error && (
        <p role="alert" className="text-[12px] text-[color:var(--crimson)]">
          {error}
        </p>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--basalt-3)]">
        One email when Research OS opens. Reply to it and we take you off the list. Under 13? Ask a parent or teacher to sign up for you.
      </p>
    </form>
  );
}
