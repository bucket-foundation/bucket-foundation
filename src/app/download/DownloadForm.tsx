"use client";

import { useState, type FormEvent } from "react";
import { DOWNLOAD_PLATFORMS, RETENTION_MONTHS } from "@/lib/download/core";
import { NAME_MAX } from "@/lib/waitlist/core";

const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";
const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";

export default function DownloadForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || !consent || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address, name, platform, consent, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Your request did not save. Try again in a minute.");
        return;
      }
      setSent(address);
    } catch {
      setError("No connection. Check your network and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="mt-8 border-l-2 border-[color:var(--gold)] pl-4 py-1">
        <p className="text-[15px] text-[color:var(--basalt)]">Request received.</p>
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">
          We will send the download link to <span className="break-all">{sent}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
      <label htmlFor="download-email" className={LABEL}>email address</label>
      <input id="download-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />

      <label htmlFor="download-name" className={LABEL + " mt-2"}>name, optional</label>
      <input id="download-name" type="text" autoComplete="name" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />

      <label htmlFor="download-platform" className={LABEL + " mt-2"}>computer</label>
      <select id="download-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT}>
        <option value="">choose one</option>
        {DOWNLOAD_PLATFORMS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label htmlFor="download-website">website</label>
        <input id="download-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <label className="mt-3 flex items-start gap-3 text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>
          Store my email so Bucket Foundation can send the download link and release notices. Delete it after {RETENTION_MONTHS} months without a new request, or sooner when I ask.
        </span>
      </label>

      <button type="submit" disabled={busy || !email.trim() || !consent} className={BUTTON + " mt-3"}>
        {busy ? "saving" : "send me the link"}
      </button>
      {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
    </form>
  );
}
