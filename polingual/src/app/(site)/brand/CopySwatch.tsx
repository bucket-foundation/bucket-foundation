"use client";

import { useState } from "react";
import { Button } from "@/ui";
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

  const light = ink !== "#231F20";
  return (
    <div className={styles.swatch} style={{ background: hex, color: ink }}>
      <span className={styles.swName}>{name}</span>
      <span className={styles.swRole}>{role}</span>
      <span className={styles.swHex}>{hex}</span>
      <Button variant="ghost" size="sm" onDark={light} onClick={copy} aria-label={`Copy ${name} ${hex}`} style={{ marginTop: 10, alignSelf: "flex-start" }}>
        <span aria-live="polite">{copied ? "Copied" : "Copy HEX"}</span>
      </Button>
    </div>
  );
}
