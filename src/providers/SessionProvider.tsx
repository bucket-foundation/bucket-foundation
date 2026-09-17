"use client";

/**
 * The site session for client components. Seeds from the cookie-backed
 * browser client on mount and follows onAuthStateChange, so the header,
 * the Research OS pages, and the Academy bridge all read one state. The
 * root layout mounts it once; no server call is made here, so static pages
 * stay static.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";

export interface SessionUser {
  id: string;
  email: string | null;
}

interface SessionState {
  /** false once the first getSession has resolved. */
  loading: boolean;
  /** Sign-in is configured on this deployment. */
  enabled: boolean;
  user: SessionUser | null;
  /** The current access token, for callers that still send a Bearer header. */
  accessToken: string | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState>({ loading: true, enabled: false, user: null, accessToken: null, signOut: async () => {} });

function fromSession(s: Session | null): { user: SessionUser | null; accessToken: string | null } {
  if (!s?.user) return { user: null, accessToken: null };
  return { user: { id: s.user.id, email: s.user.email ?? null }, accessToken: s.access_token };
}

export function SessionProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: SessionUser | null }) {
  const enabled = supabaseConfigured();
  const [loading, setLoading] = useState(enabled);
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserSupabase();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const next = fromSession(data.session);
      setUser(next.user);
      setAccessToken(next.accessToken);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = fromSession(session);
      setUser(next.user);
      setAccessToken(next.accessToken);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  const signOut = useCallback(async () => {
    if (!enabled) return;
    await getBrowserSupabase().auth.signOut();
    setUser(null);
    setAccessToken(null);
  }, [enabled]);

  const value = useMemo<SessionState>(() => ({ loading, enabled, user, accessToken, signOut }), [loading, enabled, user, accessToken, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  return useContext(Ctx);
}
