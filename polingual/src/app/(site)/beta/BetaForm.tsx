"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/ui";
import styles from "./beta.module.css";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

const TURNSTILE_JS = "https://challenges.cloudflare.com/turnstile/v0/api.js";

async function request(form: HTMLFormElement): Promise<State> {
  const data = new FormData(form);
  const turnstile = data.get("cf-turnstile-response");
  try {
    const r = await fetch("/api/testflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), website: data.get("website"), turnstile: typeof turnstile === "string" ? turnstile : undefined }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return { kind: "error", message: j.error || "Something went wrong. Try again." };
    return { kind: "done" };
  } catch {
    return { kind: "error", message: "Could not reach the signup service." };
  }
}

export default function BetaForm({ siteKey }: { siteKey: string | null }) {
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
    const form = e.currentTarget;
    setState({ kind: "sending" });
    const next = await request(form);
    setState(next);
    if (next.kind === "error") {
      try {
        (window as { turnstile?: { reset: () => void } }).turnstile?.reset();
      } catch {}
    }
  }

  if (state.kind === "done") {
    return (
      <p className={styles.done} role="status" data-testid="testflight-sent">
        Check your email on your iPhone for the TestFlight invite from Apple.
      </p>
    );
  }
  return (
    <form className={styles.form} onSubmit={submit} noValidate data-testid="testflight-form">
      <Field label="Email">
        <Input type="email" name="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <input className={styles.hp} tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
      {siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} /> : null}
      <Button type="submit" variant="accent" size="md" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending" : "Send my invite"}
      </Button>
      {state.kind === "error" ? <p className={styles.error} role="alert">{state.message}</p> : null}
    </form>
  );
}
