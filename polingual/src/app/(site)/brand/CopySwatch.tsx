"use client";

import { useState } from "react";
import { Button, tokens, type ColorToken } from "@/ui";
import styles from "./brand.module.css";

function luminance(value: string) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }
  return 1;
}

export default function CopySwatch({ name, role }: { name: ColorToken; role?: string }) {
  const value = tokens.color[name];
  const [copied, setCopied] = useState("");
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };
  const dark = luminance(value) < 0.55;
  return (
    <div className={styles.swatch} data-dark={dark || undefined}>
      <div className={styles.swChip} style={{ background: `var(--pl-${name})` }} />
      <div className={styles.swBody}>
        <span className={styles.swName}>{name}</span>
        {role ? <span className={styles.swRole}>{role}</span> : null}
        <Button bare className={styles.swCopy} onClick={() => copy(value)} aria-label={`Copy ${name} value ${value}`}>
          {value}
        </Button>
        <Button bare className={styles.swCopy} onClick={() => copy(`var(--pl-${name})`)} aria-label={`Copy ${name} CSS variable`}>
          --pl-{name}
        </Button>
        <span className={styles.swCopied} aria-live="polite">{copied ? "Copied" : ""}</span>
      </div>
    </div>
  );
}
