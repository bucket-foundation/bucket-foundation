"use client";

import { useEffect, useState } from "react";
import { ADS, adLayout, adShows, BANNER, railSize, showsAds, type AdLayout } from "@/lib/lobby/ads";
import { AccountProvider, useEntitlement } from "./Account";
import app from "../app/app.module.css";
import Ad from "./Ad";
import { AdsPauseProvider, AdsProvider } from "./AdsContext";
import Consent from "./Consent";
import RewardLayer from "./RewardLayer";
import { SpeechGuard } from "@/ui";
import { unlockSound } from "@/lib/lobby/sound";
import { installAudioUnlock } from "@/lib/lobby/unlock";
import { unlockSpeech } from "@/lib/speak";
import styles from "./play.module.css";
import { SheetPeek, StageStickers } from "./Stickers";
import { artDataUrl } from "@/ui/art";

const BAND = { "--play-band": `url("${artDataUrl("flag-band")}")` } as React.CSSProperties;

function useAdLayout(): AdLayout | null {
  const [layout, setLayout] = useState<AdLayout | null>(null);
  useEffect(() => {
    const update = () => setLayout(adLayout(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return layout;
}

function useAudioUnlock() {
  useEffect(() => installAudioUnlock(window, () => {
    unlockSpeech();
    return unlockSound();
  }), []);
}

const NO_KEYBOARD = new Set(["checkbox", "radio", "range", "button", "submit", "color", "file"]);

function typing(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NO_KEYBOARD.has(el.type);
}

function useKeyboardReveal() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !window.matchMedia?.("(pointer: coarse)").matches) return;
    const reveal = () => {
      const el = document.activeElement;
      if (!typing(el)) return;
      const box = el.getBoundingClientRect();
      const top = vv.offsetTop;
      const bottom = top + vv.height;
      if (box.top >= top && box.bottom <= bottom) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    vv.addEventListener("resize", reveal);
    return () => vv.removeEventListener("resize", reveal);
  }, []);
}

export default function PlayFrame({ header, consentRequired, children }: { header: React.ReactNode; consentRequired: boolean; children: React.ReactNode }) {
  const layout = useAdLayout();
  useAudioUnlock();
  useKeyboardReveal();
  const entitlement = useEntitlement();
  const [paused, setPaused] = useState(false);
  const visible = showsAds(ADS, entitlement) && layout !== null && !paused;
  const rail = visible && layout && adShows(ADS, "rail") ? railSize(layout) : null;
  const banner = visible && layout === "phone" && adShows(ADS, "banner");

  return (
    <AccountProvider entitlement={entitlement}>
    <AdsPauseProvider value={setPaused}>
    <AdsProvider value={visible}>
      <div className={banner ? `${app.shell} ${styles.playStage} ${styles.withBanner}` : `${app.shell} ${styles.playStage}`} data-testid="play-frame" data-ads={visible ? layout : "off"} style={BAND}>
        <StageStickers />
        {header}
        <SpeechGuard />
        <RewardLayer />
        <div className={styles.frame} data-rails={rail ? layout : undefined} data-testid="play-scroll">
          {rail ? (
            <div className={styles.rail}>
              <Ad key={`l${rail.width}`} placement="rail" size={rail} testId="ad-rail-left" />
            </div>
          ) : null}
          <main className={styles.center}>
            <SheetPeek />
            {visible ? <Consent required={consentRequired} /> : null}
            {children}
          </main>
          {rail ? (
            <div className={styles.rail}>
              <Ad key={`r${rail.width}`} placement="rail" size={rail} testId="ad-rail-right" />
            </div>
          ) : null}
        </div>
        {banner ? (
          <div className={styles.bannerStrip}>
            <Ad placement="banner" size={BANNER} />
          </div>
        ) : null}
      </div>
    </AdsProvider>
    </AdsPauseProvider>
    </AccountProvider>
  );
}
