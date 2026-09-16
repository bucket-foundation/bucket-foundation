"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";
import { safeNextPath } from "@/lib/auth/paths";
import { useSession } from "@/providers/SessionProvider";

type Step = "email" | "code" | "done";

const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON = "w-full px-4 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";

export default function SignInForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const destination = safeNextPath(next);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const enabled = supabaseConfigured();

  // Already signed in: go where the person was headed.
  useEffect(() => {
    if (!loading && user && step !== "done") {
      setStep("done");
      router.replace(destination);
      router.refresh();
    }
  }, [loading, user, step, destination, router]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getBrowserSupabase().auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) {
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
    setStep("done");
    router.replace(destination);
    router.refresh();
  }

  if (!enabled) {
    return (
      <p role="alert" className="mt-8 text-[13px] text-[color:var(--crimson)]">
        Sign-in is not available right now.
      </p>
    );
  }

  if (step === "done") {
    return <p className="mt-8 text-[13px] text-[color:var(--basalt-2)]">Signed in. Taking you there.</p>;
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="mt-8 flex flex-col gap-3">
        <label htmlFor="sign-in-code" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
          enter the code sent to {email.trim()}
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
      <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">
        No password. We email you a one-time code. A new address creates an account.
      </p>
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
