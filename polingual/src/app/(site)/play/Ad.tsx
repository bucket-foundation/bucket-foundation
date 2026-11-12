"use client";

import { useEffect, useRef } from "react";
import { ADS, adShows, type AdPlacement } from "@/lib/lobby/ads";
import styles from "./play.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ID = "polingual-adsense";

export default function Ad({ placement }: { placement: AdPlacement }) {
  const ref = useRef<HTMLModElement>(null);
  const live = ADS.mode === "adsense" || ADS.mode === "adsense-test";

  useEffect(() => {
    if (!live || !adShows(ADS, placement) || !ADS.client) return;
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
    }
  }, [live, placement]);

  if (!adShows(ADS, placement)) return null;
  if (!live) {
    return (
      <aside className={styles.ad} data-testid={`ad-${placement}`} aria-label="Advertisement">
        Ad
      </aside>
    );
  }
  return (
    <aside className={styles.adLive} data-testid={`ad-${placement}`} aria-label="Advertisement">
      <ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={ADS.client ?? undefined} data-ad-slot={ADS.slots[placement] ?? undefined} data-ad-format="auto" data-full-width-responsive="true" data-adtest={ADS.mode === "adsense-test" ? "on" : undefined} />
    </aside>
  );
}
