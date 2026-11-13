"use client";

import { useEffect, useState } from "react";
import { ADS, adLayout, adShows, BANNER, railSize, showsAds, type AdLayout } from "@/lib/lobby/ads";
import { AccountProvider, useEntitlement } from "./Account";
import app from "../app/app.module.css";
import Ad from "./Ad";
import { AdsProvider } from "./AdsContext";
import Consent from "./Consent";
import styles from "./play.module.css";

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

export default function PlayFrame({ header, consentRequired, children }: { header: React.ReactNode; consentRequired: boolean; children: React.ReactNode }) {
  const layout = useAdLayout();
  const entitlement = useEntitlement();
  const visible = showsAds(ADS, entitlement) && layout !== null;
  const rail = visible && layout && adShows(ADS, "rail") ? railSize(layout) : null;
  const banner = visible && layout === "phone" && adShows(ADS, "banner");

  return (
    <AccountProvider entitlement={entitlement}>
    <AdsProvider value={visible}>
      <div className={banner ? `${app.shell} ${styles.withBanner}` : app.shell} data-testid="play-frame" data-ads={visible ? layout : "off"}>
        {header}
        <div className={styles.frame} data-rails={rail ? layout : undefined} data-testid="play-scroll">
          {rail ? (
            <div className={styles.rail}>
              <Ad key={`l${rail.width}`} placement="rail" size={rail} testId="ad-rail-left" />
            </div>
          ) : null}
          <main className={styles.center}>
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
    </AccountProvider>
  );
}
