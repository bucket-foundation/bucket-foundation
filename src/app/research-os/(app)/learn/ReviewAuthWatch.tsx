"use client";

import { useEffect } from "react";
import { reviewSync } from "@/lib/academy/progress-store";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";

export default function ReviewAuthWatch(): null {
  useEffect(() => {
    if (!supabaseConfigured()) return;
    let alive = true;
    try {
      const sb = getBrowserSupabase();
      void sb.auth.getSession().then(({ data }) => {
        if (alive) reviewSync.setUser(data.session?.user.id ?? null);
      });
      const { data } = sb.auth.onAuthStateChange((_event, session) => reviewSync.setUser(session?.user.id ?? null));
      return () => {
        alive = false;
        data.subscription.unsubscribe();
      };
    } catch (e) {
      console.error("academy review outbox auth watch", e);
    }
  }, []);
  return null;
}
