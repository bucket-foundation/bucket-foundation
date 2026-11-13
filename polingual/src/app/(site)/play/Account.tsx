"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { fetchAccess } from "@/lib/app/plans";
import { accountCta, entitlementOf, type Entitlement } from "@/lib/lobby/ads";
import SignIn from "../app/SignIn";
import app from "../app/app.module.css";
import styles from "./play.module.css";

type AccountState = { entitlement: Entitlement | "checking"; openSignIn: () => void };

const AccountContext = createContext<AccountState>({ entitlement: "checking", openSignIn: () => {} });

export function useAccount(): AccountState {
  return useContext(AccountContext);
}

const GAMES_COPY = {
  label: "Polingual games",
  title: "Sign in to save your games",
  intro: "Use the email from the Polingual app. Your guest scores, streak and nickname come with you.",
};

export function useEntitlement(): Entitlement | "checking" {
  const [state, setState] = useState<Entitlement | "checking">("checking");
  useEffect(() => {
    let stop = false;
    void (async () => {
      const userId = await appAuth()
        .userId()
        .catch(() => null);
      const access = userId ? await fetchAccess() : null;
      if (!stop) setState(entitlementOf(!!userId, access));
    })();
    return () => {
      stop = true;
    };
  }, []);
  return state;
}

export function AccountProvider({ entitlement, children }: { entitlement: Entitlement | "checking"; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AccountContext.Provider value={{ entitlement, openSignIn: () => setOpen(true) }}>
      {children}
      {open ? (
        <div className={styles.sheetBack} role="dialog" aria-modal="true" aria-label="Sign in" data-testid="sign-in-sheet" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={styles.sheet}>
            <button type="button" className={styles.sheetClose} onClick={() => setOpen(false)} aria-label="Close">×</button>
            <SignIn copy={GAMES_COPY} onSignedIn={() => window.location.reload()} />
          </div>
        </div>
      ) : null}
    </AccountContext.Provider>
  );
}

export function AccountCta() {
  const { entitlement, openSignIn } = useAccount();
  const cta = accountCta(entitlement);
  return (
    <div className={styles.accountCta} data-testid="account-cta" data-state={entitlement}>
      {cta.signIn ? (
        <button type="button" className={app.link} onClick={openSignIn} data-testid="sign-in">Sign in</button>
      ) : null}
      {cta.learn ? (
        <a href={cta.learn.href} className={styles.ctaPill} data-testid="start-learning">{cta.learn.label}</a>
      ) : null}
    </div>
  );
}
