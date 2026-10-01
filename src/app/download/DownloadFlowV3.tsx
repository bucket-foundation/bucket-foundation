"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import InstallBlocksV3 from "@/components/download/InstallBlocksV3";
import { DOWNLOAD_PLATFORMS, osOfPlatform, type DownloadPlatform } from "@/lib/download/core";
import type { Os } from "@/lib/download/release";
import type { InstallerV2 } from "@/lib/download/release-v2";
import { NAME_MAX, RESEARCH_MAX, WAITLIST_ROLES } from "@/lib/waitlist/core";

const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]";
const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const CHECK = "text-[13px] text-[color:var(--basalt-2)] flex items-start gap-3";

const PLATFORM_LABEL: Record<DownloadPlatform, string> = {
  "linux-x64": "Linux",
  "linux-arm64": "Linux ARM",
  "macos-arm64": "macOS",
  "windows-x64": "Windows",
};

const PLATFORM_OF: Record<Os, DownloadPlatform> = {
  linux: "linux-x64",
  macos: "macos-arm64",
  windows: "windows-x64",
};

export default function DownloadFlowV3({ detected, installers }: { detected: Os | null; installers: InstallerV2[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [research, setResearch] = useState("");
  const [platform, setPlatform] = useState<string>(detected ? PLATFORM_OF[detected] : "");
  const [releaseNotes, setReleaseNotes] = useState(false);
  const [dailyNew, setDailyNew] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ outcome: string; os: Os } | null>(null);

  const signedUp = /.+@.+\..+/.test(email.trim()) && name.trim() !== "";
  const platformChosen = (DOWNLOAD_PLATFORMS as readonly string[]).includes(platform);
  const complete = signedUp && platformChosen && consent;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          research,
          platform,
          release_notes: releaseNotes,
          whats_new_daily: dailyNew,
          consent,
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; email?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Not saved. Try again.");
        return;
      }
      setDone({ outcome: data.email ?? "off", os: osOfPlatform(platform as DownloadPlatform) });
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 flex flex-col gap-4" data-download-unlocked>
        {done.outcome !== "off" && <p role="status" className="text-[13px] text-[color:var(--basalt-2)]">Link emailed.</p>}
        <InstallBlocksV3 os={done.os} installers={installers} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
      <label htmlFor="flow-email" className={LABEL}>Email</label>
      <input id="flow-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      <label htmlFor="flow-name" className={LABEL}>Name</label>
      <input id="flow-name" type="text" autoComplete="name" required maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
      <label htmlFor="flow-platform" className={LABEL}>Computer</label>
      <select id="flow-platform" required value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT}>
        <option value="">Choose</option>
        {DOWNLOAD_PLATFORMS.map((p) => (
          <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
        ))}
      </select>
      <label htmlFor="flow-role" className={LABEL}>Role</label>
      <select id="flow-role" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
        <option value="">Skip</option>
        {WAITLIST_ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <label htmlFor="flow-research" className={LABEL}>What do you research?</label>
      <input id="flow-research" type="text" maxLength={RESEARCH_MAX} value={research} onChange={(e) => setResearch(e.target.value)} className={INPUT} />

      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label htmlFor="flow-website">website</label>
        <input id="flow-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <label className={CHECK + " mt-2"}>
        <input type="checkbox" checked={releaseNotes} onChange={(e) => setReleaseNotes(e.target.checked)} className="mt-1" />
        <span>Release notes</span>
      </label>
      <label className={CHECK}>
        <input type="checkbox" checked={dailyNew} onChange={(e) => setDailyNew(e.target.checked)} className="mt-1" />
        <span>Daily digest</span>
      </label>
      <label className={CHECK}>
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" aria-label="Agree to the privacy terms" />
        <span>I agree to the <Link href="/privacy" className="underline">privacy terms</Link>.</span>
      </label>

      <button type="submit" disabled={!complete || busy} className={BUTTON + " mt-2"} data-download-button>
        {busy ? "Saving" : "Download"}
      </button>
      {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
    </form>
  );
}
