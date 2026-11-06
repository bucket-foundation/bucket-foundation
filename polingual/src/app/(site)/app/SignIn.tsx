"use client";

import { useState, type FormEvent } from "react";
import { appAuth, signInError } from "@/lib/app/auth";
import styles from "./app.module.css";

export default function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await appAuth().mobile.sendCode(email.trim());
    setBusy(false);
    if (r.ok) setStep("code");
    else setError(signInError(r.error));
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await appAuth().mobile.verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (r.ok) onSignedIn();
    else setError(signInError(r.error));
  }

  return (
    <section className={styles.card} data-testid="sign-in">
      <p className={styles.label}>Polingual on the web</p>
      <h1 className={styles.title}>{step === "email" ? "Sign in to learn" : "Check your email"}</h1>
      {step === "email" ? (
        <form onSubmit={send} className={styles.form}>
          <p className={styles.body}>Use the email from the Polingual app. Your languages, reviews and streak come with you.</p>
          <label className={styles.field}>
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="email" />
          </label>
          <button type="submit" className={styles.cta} disabled={busy}>
            {busy ? "Sending" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className={styles.form}>
          <p className={styles.body}>We sent a code to {email}. Enter it here.</p>
          <label className={styles.field}>
            <span>Code</span>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code} onChange={(e) => setCode(e.target.value)} data-testid="code" />
          </label>
          <button type="submit" className={styles.cta} disabled={busy}>
            {busy ? "Checking" : "Sign in"}
          </button>
          <button type="button" className={styles.link} onClick={() => { setStep("email"); setCode(""); setError(null); }}>
            Use a different email
          </button>
        </form>
      )}
      {error ? <p role="alert" className={styles.error} data-testid="sign-in-error">{error}</p> : null}
    </section>
  );
}
