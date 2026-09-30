"use client";

import { useEffect, useState, type FormEvent } from "react";
import InstallBlocks from "@/components/download/InstallBlocks";
import { DOWNLOAD_PLATFORMS, RETENTION_MONTHS, osOfPlatform, sentMessage, type DownloadPlatform } from "@/lib/download/core";
import { OS_LABEL, type Os } from "@/lib/download/release";
import type { Arch, InstallerV2 } from "@/lib/download/release-v2";
import { NAME_MAX, RESEARCH_MAX, WAITLIST_ROLES } from "@/lib/waitlist/core";

const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]";
const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const WHY = "text-[13px] leading-relaxed text-[color:var(--basalt-2)]";
const STEP_TITLE = "small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]";

const PLATFORM_OF: Record<Os, DownloadPlatform> = {
  linux: "linux-x64",
  macos: "macos-arm64",
  windows: "windows-x64",
};

export default function DownloadFlowV2({ detected, installers }: { detected: Os | null; installers: InstallerV2[] }) {
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
  const [arch, setArch] = useState<Arch | null>(null);
  const [done, setDone] = useState<{ address: string; outcome: string; os: Os } | null>(null);

  useEffect(() => {
    const hints = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (keys: string[]) => Promise<{ architecture?: string }> } }).userAgentData;
    hints?.getHighEntropyValues?.(["architecture"]).then((v) => {
      if (v.architecture === "arm") setArch("arm64");
      else if (v.architecture === "x86") setArch("x64");
    }).catch(() => setArch(null));
  }, []);

  const signedUp = email.trim() !== "" && /.+@.+\..+/.test(email.trim()) && name.trim() !== "";
  const platformChosen = (DOWNLOAD_PLATFORMS as readonly string[]).includes(platform);
  const complete = signedUp && platformChosen && consent;
  const missing = [
    !signedUp && "email and name",
    !platformChosen && "your computer",
    !consent && "the data consent",
  ].filter(Boolean) as string[];

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
          optins: { release_notes: releaseNotes, daily_whats_new: dailyNew },
          consent,
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; email?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Your request did not save. Try again in a minute.");
        return;
      }
      setDone({ address: email.trim(), outcome: data.email ?? "off", os: osOfPlatform(platform as DownloadPlatform) });
    } catch {
      setError("No connection. Check your network and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 flex flex-col gap-6" data-download-unlocked>
        <div role="status" className="border-l-2 border-[color:var(--gold)] pl-4 py-1">
          <p className="text-[15px] text-[color:var(--basalt)]">You are in. Your {OS_LABEL[done.os]} install command is first.</p>
          <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">
            {sentMessage(done.outcome)} <span className="break-all">{done.address}</span>
          </p>
        </div>
        <InstallBlocks os={done.os} arch={arch} installers={installers} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-8" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className={STEP_TITLE}>1. sign up</legend>
        <p className={WHY}>We need your email to send the download link and to tell you when a release ships. We ask for your name to greet you in those emails.</p>
        <label htmlFor="flow-email" className={LABEL}>email address, required</label>
        <input id="flow-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        <label htmlFor="flow-name" className={LABEL + " mt-2"}>name, required</label>
        <input id="flow-name" type="text" autoComplete="name" required maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={STEP_TITLE}>2. about you</legend>
        <p className={WHY}>Your computer picks which install command we show first. Your role and research are optional; they tell us what to build next and we use them for nothing else.</p>
        <label htmlFor="flow-platform" className={LABEL}>your computer, required</label>
        <select id="flow-platform" required value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT}>
          <option value="">choose one</option>
          {DOWNLOAD_PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <label htmlFor="flow-role" className={LABEL + " mt-2"}>your role, optional</label>
        <select id="flow-role" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
          <option value="">skip</option>
          {WAITLIST_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <label htmlFor="flow-research" className={LABEL + " mt-2"}>what you research or study, optional</label>
        <input id="flow-research" type="text" maxLength={RESEARCH_MAX} value={research} onChange={(e) => setResearch(e.target.value)} className={INPUT} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={STEP_TITLE}>3. updates and consent</legend>
        <p className={WHY}>Both update emails are off until you tick them. Each one has an unsubscribe link, and you can ask us to delete your data at any time.</p>
        <label className={WHY + " flex items-start gap-3"}>
          <input type="checkbox" checked={releaseNotes} onChange={(e) => setReleaseNotes(e.target.checked)} className="mt-1" />
          <span>Email me release notes when a new version ships. Optional.</span>
        </label>
        <label className={WHY + " flex items-start gap-3"}>
          <input type="checkbox" checked={dailyNew} onChange={(e) => setDailyNew(e.target.checked)} className="mt-1" />
          <span>Email me the daily What&apos;s New digest. Optional.</span>
        </label>
        <label className={WHY + " flex items-start gap-3"}>
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            Required: store my email, name and answers so Bucket Foundation can send the download link and handle my requests. Delete them after {RETENTION_MONTHS} months without a new request, or sooner when I ask.
          </span>
        </label>
      </fieldset>

      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label htmlFor="flow-website">website</label>
        <input id="flow-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={!complete || busy} className={BUTTON} data-download-button>
          {busy ? "saving" : "get the installer"}
        </button>
        {!complete && <p className={WHY} data-download-missing>Still needed: {missing.join(", ")}.</p>}
        {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
      </div>
    </form>
  );
}
