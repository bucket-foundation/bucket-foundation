"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { idle, installedVoices, playAll, playable, snapshot, stop, subscribe, toggle, type SpeakItem } from "@/lib/speak";
import { shrinkPx } from "@/lib/tile-fit";
import styles from "@/app/site.module.css";

function usePlayer() {
  return useSyncExternalStore(subscribe, snapshot, idle);
}

function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoices([]);
      return;
    }
    const load = () => setVoices(installedVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M3 9v6h4l5 4V5L7 9H3z" />
      <path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function PlayTile({ item, label }: { item: SpeakItem; label: string }) {
  const voices = useVoices();
  const player = usePlayer();
  const show = item.src ? true : voices !== null && playable(item, voices);
  if (!show) return null;
  const on = player.id === item.id;
  return (
    <button type="button" className={styles.play} data-playing={on || undefined} aria-pressed={on} aria-label={label} onClick={() => toggle(item, on)}>
    </button>
  );
}

export function HearAll({ items, label, stopLabel }: { items: SpeakItem[]; label: string; stopLabel: string }) {
  const voices = useVoices();
  const player = usePlayer();
  const ready = items.filter((i) => (i.src ? true : voices !== null && playable(i, voices)));
  if (ready.length < 2) return null;
  return (
    <button type="button" className={styles.hearAll} data-playing={player.all || undefined} onClick={() => (player.all ? stop() : void playAll(ready))}>
      {player.all ? <StopIcon /> : <SpeakerIcon />}
      <span>{player.all ? stopLabel : label}</span>
    </button>
  );
}

export function fitWords(root: ParentNode) {
  for (const el of root.querySelectorAll<HTMLElement>("b[data-fit]")) {
    el.style.fontSize = "";
    const px = parseFloat(getComputedStyle(el).fontSize);
    const next = shrinkPx(px, el.scrollWidth, el.clientWidth);
    if (next !== px) el.style.fontSize = `${next}px`;
  }
}

export function FitWords() {
  useLayoutEffect(() => {
    const run = () => fitWords(document);
    run();
    void document.fonts?.ready.then(run);
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);
  return null;
}
