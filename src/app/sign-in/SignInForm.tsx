"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";
import { safeNextPath } from "@/lib/auth/paths";
import { useSession } from "@/providers/SessionProvider";

type Step = "email" | "code" | "done";

const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON = "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";

export default function SignInForm({ next, allowNewAccounts = true }: { next: string | null; allowNewAccounts?: boolean }) {
  const { user, loading } = useSession();
  const destination = safeNextPath(next);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const enabled = supabaseConfigured();
  const [slow, setSlow] = useState(false);
  const sent = useRef(false);

  function leave() {
    if (sent.current) return;
    sent.current = true;
    setStep("done");
    window.location.replace(destination);
  }

  useEffect(() => {
    if (!loading && user && step !== "done") leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, step]);

  useEffect(() => {
    if (step !== "done") return;
    const t = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getBrowserSupabase().auth.signInWithOtp({ email: address, options: { shouldCreateUser: allowNewAccounts } });
    setBusy(false);
    const unknownAccount = !allowNewAccounts && Boolean(err?.message.toLowerCase().includes("signups not allowed"));
    if (err && !unknownAccount) {
      setError(friendly(err.message));
      return;
    }
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s+/g, "");
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await getBrowserSupabase().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (err || !data.session) {
      setError(friendly(err?.message ?? "That code did not match. Ask for a new one."));
      return;
    }
    leave();
  }

  if (!enabled) {
    return (
      <p role="alert" className="mt-8 text-[13px] text-[color:var(--crimson)]">
        Sign-in is not available right now.
      </p>
    );
  }

  if (step === "done") {
    return (
      <div className="mt-8 flex flex-col gap-3" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-[13px] text-[color:var(--basalt-2)]">
          <span aria-hidden className="inline-block w-3 h-3 rounded-full border border-[color:var(--gold-deep)] border-t-transparent animate-spin" />
          Signed in. Opening Research OS.
        </div>
        {slow && (
          <a href={destination} className={BUTTON + " text-center"}>
            continue
          </a>
        )}
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="mt-8 flex flex-col gap-3">
        <label htmlFor="sign-in-code" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
          {allowNewAccounts ? `enter the code sent to ${email.trim()}` : `if an account uses ${email.trim()}, a code is on the way`}
        </label>
        <input
          id="sign-in-code"
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          className={INPUT + " tracking-[0.2em]"}
        />
        <button type="submit" disabled={busy || !code.trim()} className={BUTTON}>
          {busy ? "checking" : "sign in"}
        </button>
        {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="self-start text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]"
        >
          use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="mt-8 flex flex-col gap-3">
      <label htmlFor="sign-in-email" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
        email address
      </label>
      <input
        id="sign-in-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@school.example"
        className={INPUT}
      />
      <button type="submit" disabled={busy || !email.trim()} className={BUTTON}>
        {busy ? "sending" : "continue"}
      </button>
      {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
    </form>
  );
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Too many codes requested. Wait a minute and try again.";
  if (m.includes("expired")) return "That code expired. Ask for a new one.";
  if (m.includes("invalid")) return "That code did not match. Check it and try again.";
  return message;
}
