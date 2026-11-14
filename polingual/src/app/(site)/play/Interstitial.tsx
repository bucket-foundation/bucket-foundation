"use client";

import { Button } from "@/ui";
import Ad from "./Ad";
import styles from "./play.module.css";

export default function Interstitial({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className={styles.interstitial} role="dialog" aria-modal="true" aria-label="Advertisement" data-testid="interstitial">
      <div className={styles.interstitialBox}>
        <Ad placement="interstitial" testId="ad-interstitial" />
        <Button onClick={onClose} data-testid="interstitial-close">Close</Button>
      </div>
    </div>
  );
}
