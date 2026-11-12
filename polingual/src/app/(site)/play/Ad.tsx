"use client";

import { useEffect } from "react";
import { ADS, adLive, pubId, type AdPlacement, type AdSize } from "@/lib/lobby/ads";
import { useAdsVisible } from "./AdsContext";
import styles from "./play.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ID = "polingual-adsense";
const CMP_ID = "polingual-cmp";

function script(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = src;
  document.head.appendChild(s);
}

function signalCmpPresent() {
  if (document.querySelector("iframe[name=googlefcPresent]")) return;
  const frame = document.createElement("iframe");
  frame.name = "googlefcPresent";
  frame.style.display = "none";
  document.body.appendChild(frame);
}

export function loadAdSense(client: string) {
  const pub = pubId(client);
  if (pub) {
    script(CMP_ID, `https://fundingchoicesmessages.google.com/i/${pub}?ers=1`);
    signalCmpPresent();
  }
  script(SCRIPT_ID, `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`);
}

export default function Ad({ placement, size, testId }: { placement: AdPlacement; size?: AdSize; testId?: string }) {
  const visible = useAdsVisible();
  const live = visible && adLive(ADS, placement);

  useEffect(() => {
    if (!live || !ADS.client) return;
    loadAdSense(ADS.client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("adsbygoogle push failed", placement, err);
    }
  }, [live, placement]);

  if (!visible) return null;
  const id = testId ?? `ad-${placement}`;
  const box = size ? { width: size.width, height: size.height } : undefined;
  if (!live) {
    return (
      <aside className={size ? styles.adFixed : styles.ad} style={box} data-testid={id} data-ad-size={size ? `${size.width}x${size.height}` : "auto"} aria-label="Advertisement">
        Ad{size ? ` ${size.width}×${size.height}` : ""}
      </aside>
    );
  }
  return (
    <aside className={size ? styles.adFixed : styles.adLive} style={box} data-testid={id} data-ad-size={size ? `${size.width}x${size.height}` : "auto"} aria-label="Advertisement">
      {size ? (
        <ins className="adsbygoogle" style={{ display: "inline-block", ...box }} data-ad-client={ADS.client ?? undefined} data-ad-slot={ADS.slots[placement] ?? undefined} data-adtest={ADS.mode === "adsense-test" ? "on" : undefined} />
      ) : (
        <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={ADS.client ?? undefined} data-ad-slot={ADS.slots[placement] ?? undefined} data-ad-format="auto" data-full-width-responsive="true" data-adtest={ADS.mode === "adsense-test" ? "on" : undefined} />
      )}
    </aside>
  );
}
