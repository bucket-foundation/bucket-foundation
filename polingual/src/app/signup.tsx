"use client";

import { useState } from "react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

const field =
  "w-full rounded-lg bg-white px-4 py-3 text-base outline-none ring-1 focus:ring-2 font-sans";

export default function Signup() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setState({ kind: "sending" });
    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || `Signup failed with status ${r.status}.`);
      setState({ kind: "done" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Signup failed." });
    }
  }

  if (state.kind === "done") {
    return (
      <p className="rounded-xl bg-white px-5 py-4 font-sans text-[15px]" style={{ border: "1px solid var(--hairline)", color: "var(--ink-2)" }}>
        You are on the list. We will write when the learner tools open.
      </p>
    );
  }

  const ring = { color: "var(--ink)", "--tw-ring-color": "var(--blue-soft)" } as React.CSSProperties;

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ink-dim)" }}>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={`${field} mt-1`} style={ring} />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ink-dim)" }}>Languages you speak</span>
        <input name="speaks" required maxLength={160} placeholder="English, Spanish" className={`${field} mt-1`} style={ring} />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ink-dim)" }}>Languages you are learning</span>
        <input name="learning" maxLength={160} placeholder="Japanese" className={`${field} mt-1`} style={ring} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="w-full rounded-lg px-4 py-3 font-sans text-base text-white transition disabled:opacity-60"
        style={{ background: "var(--blue)" }}
      >
        {state.kind === "sending" ? "Sending" : "Join the learner list"}
      </button>
      {state.kind === "error" && (
        <p role="alert" className="font-sans text-sm" style={{ color: "var(--burgundy)" }}>{state.message}</p>
      )}
    </form>
  );
}
