"use client";

import { useState } from "react";
import styles from "./brand.module.css";

export default function CopySwatch({ name, hex, ink, role }: { name: string; hex: string; ink: string; role: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className={styles.swatch} style={{ background: hex, color: ink }} aria-label={`Copy ${name} ${hex}`}>
      <span className={styles.swName}>{name}</span>
      <span className={styles.swRole}>{role}</span>
      <span className={styles.swHex} aria-live="polite">{copied ? "copied" : hex}</span>
    </button>
  );
}
