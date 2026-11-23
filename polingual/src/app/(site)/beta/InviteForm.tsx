"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/ui";
import styles from "./beta.module.css";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export default function InviteForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const r = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), kind: "testflight" }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setState(r.ok ? { kind: "done" } : { kind: "error", message: j.error || "Something went wrong. Try again." });
    } catch {
      setState({ kind: "error", message: "Could not reach Polingual. Try again." });
    }
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
      <Button type="submit" variant="accent" size="lg" block disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending" : "Email me the beta"}
      </Button>
      {state.kind === "error" ? <p className={styles.error} role="alert">{state.message}</p> : null}
    </form>
  );
}
