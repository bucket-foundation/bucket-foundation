"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayerProvider, usePlayer } from "@/lib/listen/player";
import { langName } from "@academy/lang-systems";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { fetchAccess, type Access } from "@/lib/app/plans";
import Paywall from "./Paywall";
import SignIn from "./SignIn";
import styles from "./app.module.css";
import { AppNav, Button, SpeechGuard, Stage, type NavItem } from "@/ui";
import { Art } from "@/ui/art";

type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; userId: string };

const SessionContext = createContext<{ userId: string; signOut: () => void }>({ userId: "", signOut: () => {} });

export function useSession() {
  return useContext(SessionContext);
}

const OPEN = ["/app/listen", "/app/translate"];

function navItems(path: string): NavItem[] {
  const at = (p: string, exact = false) => (exact ? path === p : path === p || path.startsWith(`${p}/`));
  return [
    { href: "/app", label: "Home", art: "azulejo", active: at("/app", true) || at("/app/new"), testId: "nav-home" },
    { href: "/app/learn", label: "Learn", art: "ticket", active: at("/app/learn") || /\/app\/[^/]+\/(study|place)/.test(path), testId: "nav-learn" },
    { href: "/app/listen", label: "Listen", art: "bunting", active: at("/app/listen"), testId: "nav-listen" },
    { href: "/app/translate", label: "Translate", art: "torn-label", active: at("/app/translate"), testId: "nav-translate" },
    { href: "/app/account", label: "Account", art: "seal", active: at("/app/account"), testId: "nav-account" },
  ];
}

function MiniPlayer() {
  const p = usePlayer();
  const path = usePathname();
  if (!p.station || path === "/app/listen") return null;
  return (
    <div className={styles.mini} data-testid="mini-player">
      <Art name="ticket" size={44} />
      <Link href="/app/listen" className={styles.miniName}>{p.station.name}<span>{p.lang ? langName(p.lang) : ""}</span></Link>
      <Button size="sm" variant={p.playing ? "secondary" : "primary"} onClick={p.toggle} data-testid="mini-toggle">{p.playing ? "Pause" : "Play"}</Button>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <Shell>{children}</Shell>
    </PlayerProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/app";
  const open = OPEN.some((p) => path.startsWith(p));
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
        <AppNav items={navItems(path)} />
        {auth.status === "signed-in" ? (
          <Button variant="quiet" size="sm" onClick={signOut} data-testid="sign-out">
            Sign out
          </Button>
        ) : null}
      </header>
      <main className={styles.main}>
        {open && auth.status !== "loading" ? <SessionContext.Provider value={{ userId: auth.status === "signed-in" ? auth.userId : "", signOut }}>{children}</SessionContext.Provider> : null}
        {!open && auth.status === "loading" ? <p className={styles.muted} aria-busy="true">Loading</p> : null}
        {!open && auth.status === "signed-out" ? <Stage testId="sign-in-stage"><SignIn onSignedIn={refresh} /></Stage> : null}
        {!open && auth.status === "signed-in" && access.status === "checking" ? <p className={styles.muted} aria-busy="true">Checking your subscription</p> : null}
        {!open && auth.status === "signed-in" && (access.status === "locked" || access.status === "unknown") ? <Paywall access={access} retry={check} /> : null}
        {!open && auth.status === "signed-in" && access.status === "open" ? <SessionContext.Provider value={{ userId: auth.userId, signOut }}>{children}</SessionContext.Provider> : null}
      </main>
      <MiniPlayer />
      <SpeechGuard />
    </div>
  );
}
