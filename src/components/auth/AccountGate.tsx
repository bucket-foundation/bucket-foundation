"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/providers/SessionProvider";
import SignInForm from "@/app/sign-in/SignInForm";
import InverseOmega from "@/components/InverseOmega";
import { mergeGuestProgress } from "@/lib/academy/guest-merge";
import { AccountGateContext, type GatedAction } from "@/lib/academy/account-gate-context";

export { useAccountGate } from "@/lib/academy/account-gate-context";

export function AccountGateProvider({ allowNewAccounts, children }: { allowNewAccounts: boolean; children: ReactNode }) {
  const { user, enabled, loading } = useSession();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const pending = useRef<GatedAction | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const requireAccount = useCallback((action?: GatedAction) => {
    if (userRef.current) {
      action?.();
      return;
    }
    pending.current = action ?? null;
    setOpen(true);
  }, []);

  const openSignIn = useCallback(() => requireAccount(), [requireAccount]);

  const close = useCallback(() => {
    pending.current = null;
    setOpen(false);
  }, []);

  const signedIn = useCallback(async () => {
    await mergeGuestProgress();
    const action = pending.current;
    pending.current = null;
    setOpen(false);
    action?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const guest = enabled && !loading && !user;
  const value = useMemo(() => ({ guest, requireAccount, openSignIn }), [guest, requireAccount, openSignIn]);
  const next = pathname === "/" ? "/research-os/learn" : pathname;

  return (
    <AccountGateContext.Provider value={value}>
      {children}
      {open && (
        <div data-sign-in-modal className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[color:var(--basalt)]/30 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="sign-in-modal-title" className="relative w-full max-w-[400px] bg-[color:var(--bone)] border border-[color:var(--hairline)] rounded-md shadow-[0_12px_40px_rgba(31,28,22,0.25)] px-6 pt-8 pb-6">
            <button type="button" onClick={close} aria-label="Close" className="absolute top-2 right-2 w-11 h-11 inline-flex items-center justify-center text-[20px] text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">
              ×
            </button>
            <div className="flex flex-col items-center text-center">
              <InverseOmega size={44} variant="carved" />
              <h2 id="sign-in-modal-title" className="mt-4 font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
                Enter your email
              </h2>
              <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">Sign in or make an account to keep going. Your progress comes with you.</p>
            </div>
            <SignInForm next={next} allowNewAccounts={allowNewAccounts} onSignedIn={signedIn} />
          </div>
        </div>
      )}
    </AccountGateContext.Provider>
  );
}
