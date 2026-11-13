"use client";

import { CoinArt } from "@/ui/art/play";
import styles from "./world.module.css";

export { CoinArt };

export function PromptCard({ label, gloss, note }: { label: string; gloss: string; note?: string }) {
  return (
    <div className={styles.promptCard} data-testid="prompt-card">
      <span className={styles.promptLabel}>{label}</span>
      <b className={styles.promptGloss} data-testid="prompt">{gloss}</b>
      {note ? <span className={styles.promptNote}>{note}</span> : null}
    </div>
  );
}
