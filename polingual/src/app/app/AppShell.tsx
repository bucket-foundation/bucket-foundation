"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { fetchAccess, type Access } from "@/lib/app/plans";
import Paywall from "./Paywall";
import SignIn from "./SignIn";
import styles from "./app.module.css";

type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; userId: string };

const SessionContext = createContext<{ userId: string; signOut: () => void }>({ userId: "", signOut: () => {} });

export function useSession() {
  return useContext(SessionContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const id = await appAuth().userId();
    setAuth(id ? { status: "signed-in", userId: id } : { status: "signed-out" });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [access, setAccess] = useState<Access>({ status: "checking" });
  const signedIn = auth.status === "signed-in";
  const check = useCallback(() => {
    setAccess({ status: "checking" });
    void fetchAccess().then(setAccess);
  }, []);
  useEffect(() => {
    if (signedIn) check();
  }, [signedIn, check]);

  const signOut = useCallback(() => {
    void appAuth().mobile.logout().then(refresh);
  }, [refresh]);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href="/app" className={styles.brand} aria-label="Polingual home">
          <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
          <span>polingual</span>
        </Link>
        {auth.status === "signed-in" ? (
          <button type="button" className={styles.link} onClick={signOut} data-testid="sign-out">
            Sign out
          </button>
        ) : null}
      </header>
      <main className={styles.main}>
        {auth.status === "loading" ? <p className={styles.muted} aria-busy="true">Loading</p> : null}
        {auth.status === "signed-out" ? <SignIn onSignedIn={refresh} /> : null}
        {auth.status === "signed-in" && access.status === "checking" ? <p className={styles.muted} aria-busy="true">Checking your subscription</p> : null}
        {auth.status === "signed-in" && (access.status === "locked" || access.status === "unknown") ? <Paywall access={access} retry={check} /> : null}
        {auth.status === "signed-in" && access.status === "open" ? <SessionContext.Provider value={{ userId: auth.userId, signOut }}>{children}</SessionContext.Provider> : null}
      </main>
    </div>
  );
}
