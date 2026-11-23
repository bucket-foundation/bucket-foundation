"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Input } from "@/ui";
import styles from "./beta.module.css";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

const TURNSTILE_JS = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function resetTurnstile() {
  try {
    (window as { turnstile?: { reset: () => void } }).turnstile?.reset();
  } catch {}
}

export default function InviteForm({ siteKey }: { siteKey: string | null }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!siteKey || document.querySelector(`script[src="${TURNSTILE_JS}"]`)) return;
    const s = document.createElement("script");
    s.src = TURNSTILE_JS;
    s.async = true;
    document.head.appendChild(s);
  }, [siteKey]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const turnstile = data.get("cf-turnstile-response");
    setState({ kind: "sending" });
    try {
      const r = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), kind: "testflight", turnstile: typeof turnstile === "string" ? turnstile : undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) return setState({ kind: "done" });
      setState({ kind: "error", message: j.error || "Something went wrong. Try again." });
    } catch {
      setState({ kind: "error", message: "Could not reach Polingual. Try again." });
    }
    resetTurnstile();
  }

  if (state.kind === "done") {
    return (
      <p className={styles.done} role="status" data-testid="invite-sent">
        Check your inbox on your iPhone.
      </p>
    );
  }
  return (
    <form className={styles.invite} onSubmit={submit} noValidate data-testid="invite-form">
      <Input type="email" name="email" autoComplete="email" required placeholder="you@example.com" aria-label="Email" />
      <input className={styles.hp} tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
      {siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} data-testid="turnstile" /> : null}
      <Button type="submit" variant="accent" size="lg" block disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending" : "Email me the beta"}
      </Button>
      {state.kind === "error" ? <p className={styles.error} role="alert">{state.message}</p> : null}
    </form>
  );
}
