"use client";

import { useState } from "react";

const INPUT = "w-full border border-[color:var(--hairline)] bg-[color:var(--bone)] p-2 text-[14px]";
const LABEL = "grid gap-1 text-[13px] text-[color:var(--basalt-2)]";

export default function RemoveAdvisorForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("busy");
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(["openalexId", "orcid", "contact", "reason", "website"].map((k) => [k, String(form.get(k) ?? "")]));
    try {
      const res = await fetch("/api/research-os/advisors/optout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof out.message === "string" ? out.message : `Request failed (${res.status}).`);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="mt-6 border-t border-[color:var(--basalt)] pt-4 text-[14px] text-[color:var(--basalt)]">
        Received. The profile is hidden now, and a maintainer will write to you.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 border-t border-[color:var(--basalt)] pt-4">
      <label className={LABEL}>
        OpenAlex author id or URL
        <input name="openalexId" className={INPUT} placeholder="A5000000000" autoComplete="off" />
      </label>
      <label className={LABEL}>
        ORCID
        <input name="orcid" className={INPUT} placeholder="0000-0000-0000-0000" autoComplete="off" />
      </label>
      <label className={LABEL}>
        How to reach you
        <input name="contact" required minLength={3} maxLength={320} className={INPUT} placeholder="email or institutional page" />
      </label>
      <label className={LABEL}>
        Anything we should know
        <textarea name="reason" maxLength={1000} rows={3} className={INPUT} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && <p role="alert" className="text-[13px] text-[color:var(--gold-deep)]">{error}</p>}
      <button type="submit" disabled={state === "busy"} className="justify-self-start border border-[color:var(--basalt)] px-4 py-2 text-[14px] text-[color:var(--basalt)] disabled:opacity-40">
        {state === "busy" ? "Sending" : "Hide this profile"}
      </button>
    </form>
  );
}
