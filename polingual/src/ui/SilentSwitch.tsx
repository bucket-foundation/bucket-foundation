"use client";

import { useEffect, useState } from "react";
import { isSilent, setSilent, subscribeSilent } from "@/lib/silent";
import { Art } from "./art";
import s from "./nav.module.css";

export function SilentSwitch({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isSilent());
    return subscribeSilent(() => setOn(isSilent()));
  }, []);
  return (
    <button type="button" role="switch" aria-checked={on} className={s.silent} data-dark={onDark || undefined} data-compact={compact || undefined} onClick={() => setSilent(!on)} data-testid="silent-switch" title="Silent mode stops sound effects and automatic audio. Tapping a speaker still plays the word.">
      <span aria-hidden className={s.silentArt}><Art name={on ? "ink-dot" : "bunting"} size={22} /></span>
      <span>{on ? "Silent on" : "Silent off"}</span>
    </button>
  );
}
