"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink, Card, Input, Pill } from "@/ui";
import { ANDROID_STEPS, platformFromUA, type BetaPlatform } from "@/lib/beta-platform";
import { track } from "@/lib/funnel";
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
  const [platform, setPlatform] = useState<BetaPlatform>("ios");

  useEffect(() => {
    setPlatform(platformFromUA(navigator.userAgent));
  }, []);

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
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), kind: "testflight", platform, turnstile: typeof turnstile === "string" ? turnstile : undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) {
        track("beta_signup", undefined, platform);
        return setState({ kind: "done" });
      }
      setState({ kind: "error", message: j.error || "Something went wrong. Try again." });
    } catch {
      setState({ kind: "error", message: "Could not reach Polingual. Try again." });
    }
    resetTurnstile();
  }

  if (state.kind === "done" && platform === "android") return <AndroidSteps />;
  if (state.kind === "done") {
    return (
      <p className={styles.done} role="status" data-testid="invite-sent">
        Check your inbox on your iPhone.
      </p>
    );
  }
  return (
    <form className={styles.invite} onSubmit={submit} noValidate data-testid="invite-form">
      <PlatformPicker value={platform} onChange={setPlatform} />
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

function PlatformPicker({ value, onChange }: { value: BetaPlatform; onChange: (p: BetaPlatform) => void }) {
  return (
    <div className={styles.platforms} role="group" aria-label="Your phone">
      <Pill active={value === "ios"} aria-pressed={value === "ios"} onClick={() => onChange("ios")}>iPhone</Pill>
      <Pill active={value === "android"} aria-pressed={value === "android"} onClick={() => onChange("android")}>Android</Pill>
    </div>
  );
}

function AndroidSteps() {
  return (
    <div className={styles.invite} role="status" data-testid="invite-sent">
      <p className={styles.done}>Check your inbox. Then do these two steps with the same Google account.</p>
      {ANDROID_STEPS.map((s, i) => (
        <Card key={s.href}>
          <p className={styles.done}>{`${i + 1}. ${s.title}`}</p>
          <p>{s.body}</p>
          <ButtonLink href={s.href} rel="noopener" variant="accent" block>{s.cta}</ButtonLink>
        </Card>
      ))}
    </div>
  );
}
