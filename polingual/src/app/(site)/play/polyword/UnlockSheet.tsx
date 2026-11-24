"use client";

import type { RefObject } from "react";
import { ADS } from "@/lib/lobby/ads";
import type { archiveOffer } from "@/lib/polyword/policy";
import app from "../../app/app.module.css";
import styles from "./polyword.module.css";
import type { Unlock } from "./hooks";
import { shortDate } from "./parts";
import { Button, ButtonLink } from "@/ui";

type Offer = ReturnType<typeof archiveOffer>;

function Offers({ unlock, offer, onWatch }: { unlock: NonNullable<Unlock>; offer: Offer; onWatch: () => void }) {
  return (
    <>
      <p className={app.small}>
        {unlock.state === "nofill" ? "No ad is ready right now. Try again in a minute, or go Pro." : unlock.state === "dismissed" ? "The ad closed early, so the puzzle stays locked." : "Past puzzles open with a short ad, or all at once with Pro."}
      </p>
      <div className={styles.sheetActions}>
        {!offer.pro && offer.rewarded ? (
          <Button onClick={onWatch} data-testid="pw-watch">
            Watch an ad
          </Button>
        ) : null}
        <ButtonLink href="/app?from=polyword-archive" variant={!offer.pro && offer.rewarded ? "ghost" : "primary"} size={!offer.pro && offer.rewarded ? "md" : "lg"} data-testid="pw-pro">
          Go Pro
        </ButtonLink>
      </div>
    </>
  );
}

export default function UnlockSheet({ unlock, offer, sheet, onWatch, onClose }: { unlock: NonNullable<Unlock>; offer: Offer; sheet: RefObject<HTMLDivElement | null>; onWatch: () => void; onClose: () => void }) {
  return (
    <div className={styles.sheetBack} role="dialog" aria-modal="true" aria-labelledby="pw-unlock" data-testid="pw-unlock">
      <div className={styles.sheet} ref={sheet}>
        <h2 id="pw-unlock" className={styles.h2}>
          Puzzle #{unlock.day}, {shortDate(unlock.day)}
        </h2>
        {unlock.state === "watching" ? (
          <div className={styles.adBox} data-testid="pw-ad-reward" aria-label="Advertisement">
            {ADS.mode === "placeholder" ? "Ad · your puzzle opens in a few seconds" : "Loading ad"}
          </div>
        ) : (
          <Offers unlock={unlock} offer={offer} onWatch={onWatch} />
        )}
        {unlock.state !== "watching" || ADS.mode !== "placeholder" ? (
          <Button variant="quiet" size="sm" onClick={onClose} data-testid="pw-unlock-close">
            Not now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
