"use client";

import { useState, type FormEvent } from "react";
import { appAuth, signInError } from "@/lib/app/auth";
import styles from "./app.module.css";
import { Button, Field, FlagBand, Input, Sheet, StreakFlame } from "@/ui";

type SignInCopy = { label: string; title: string; intro: string };

const LEARN: SignInCopy = {
  label: "Polingual on the web",
  title: "Sign in to learn",
  intro: "Use the email from the Polingual app. Your languages, reviews and streak come with you.",
};

export default function SignIn({ onSignedIn, copy = LEARN, flame = true }: { onSignedIn: () => void; copy?: SignInCopy; flame?: boolean }) {
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
    <Sheet className={styles.card} data-testid="sign-in">
      {flame ? <StreakFlame days={100} caption="Day streak" size={36} /> : null}
      <p className={styles.label}>{copy.label}</p>
      <h1 className={styles.title}>{step === "email" ? copy.title : "Check your email"}</h1>
      {step === "email" ? (
        <form onSubmit={send} className={styles.form}>
          <p className={styles.body}>{copy.intro}</p>
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="email" />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending" : "Email me a code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className={styles.form}>
          <p className={styles.body}>We sent a code to {email}. Enter it here.</p>
          <Field label="Code">
            <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code} onChange={(e) => setCode(e.target.value)} data-testid="code" />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? "Checking" : "Sign in"}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
            Use a different email
          </Button>
        </form>
      )}
      {error ? <p role="alert" className={styles.error} data-testid="sign-in-error">{error}</p> : null}
    <FlagBand className={styles.sheetBand} />
    </Sheet>
  );
}
