"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isSilent, subscribeSilent } from "@/lib/silent";
import { Art } from "./art";
import { SilentSwitch } from "./SilentSwitch";
import s from "./nav.module.css";

export function useSilent(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isSilent());
    return subscribeSilent(() => setOn(isSilent()));
  }, []);
  return on;
}

export function NeedsSound({ game, children }: { game: string; children: ReactNode }) {
  const silent = useSilent();
  if (!silent) return <>{children}</>;
  return (
    <div className={s.needs} role="status" data-testid="needs-sound">
      <Art name="bunting" size={120} shadow />
      <h2 className={s.needsTitle}>{game} needs sound</h2>
      <p className={s.needsBody}>Silent mode is on. Turn it off to play, or pick a game you can play without sound.</p>
      <SilentSwitch />
    </div>
  );
}
