"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";

/**
 * The framed Academy app with the site session bridged in. The app keeps
 * its own Supabase client (learning/app/js/auth.js); on load, on request
 * from the frame, and on every auth change here, the current session is
 * posted into the frame so a person signed in on the site is signed in
 * there too. Same origin only.
 */
export default function AcademyFrame({ src }: { src: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = getBrowserSupabase();
    const origin = window.location.origin;

    const post = async () => {
      const win = ref.current?.contentWindow;
      if (!win) return;
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      win.postMessage(
        { type: "bucket:session", session: s ? { access_token: s.access_token, refresh_token: s.refresh_token } : null },
        origin
      );
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== ref.current?.contentWindow) return;
      if (e.data && e.data.type === "bucket:session-request") void post();
    };
    window.addEventListener("message", onMessage);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void post();
    });
    const frame = ref.current;
    frame?.addEventListener("load", post);
    return () => {
      window.removeEventListener("message", onMessage);
      sub.subscription.unsubscribe();
      frame?.removeEventListener("load", post);
    };
  }, []);

  return (
    <iframe
      ref={ref}
      src={src}
      title="Bucket Academy"
      loading="eager"
      style={{ width: "100%", height: "calc(100dvh - 58px - 41px)", border: 0, display: "block" }}
    />
  );
}
