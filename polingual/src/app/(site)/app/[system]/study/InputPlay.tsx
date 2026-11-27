"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addSeen, EMPTY_VIEWING, reveal, toggleTap, type StageChoice, type Viewing } from "@academy/input-stage";
import { fromYouTube, IDLE_MS, isActive, youtubePlaying } from "@academy/input-mix";
import { Button } from "@/ui";
import { onAnswer, onPoster, rememberConsent, storedConsent, type VideoGate } from "@/lib/app/embed-consent";
import styles from "../../app.module.css";
import own from "./InputStage.module.css";

export const TICK_MS = 1000;

function useActivity(needsPlayer: boolean, player: React.MutableRefObject<HTMLIFrameElement | null>): React.MutableRefObject<() => boolean> {
  const flags = useRef({ visible: true, focused: true, playing: false, idle: false });
  const lastInput = useRef(Date.now());
  const check = useRef(() => isActive(flags.current, needsPlayer));
  check.current = () => isActive({ ...flags.current, idle: Date.now() - lastInput.current >= IDLE_MS }, needsPlayer);
  useEffect(() => {
    const sync = () => {
      flags.current.visible = document.visibilityState === "visible";
      flags.current.focused = document.hasFocus();
    };
    const onMessage = (e: MessageEvent) => {
      if (!fromYouTube(e.origin) || !player.current || e.source !== player.current.contentWindow) return;
      const p = youtubePlaying(e.data);
      if (p !== null) flags.current.playing = p;
    };
    const touch = () => {
      lastInput.current = Date.now();
    };
    const inputs = ["scroll", "pointerdown", "keydown", "touchstart", "wheel"] as const;
    sync();
    for (const n of inputs) window.addEventListener(n, touch, { passive: true, capture: true });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("message", onMessage);
      for (const n of inputs) window.removeEventListener(n, touch, { capture: true });
    };
  }, [player]);
  return check;
}

function useViewing(active: React.MutableRefObject<() => boolean>): { v: Viewing; set: (f: (v: Viewing) => Viewing) => void; watch: (id: string) => (el: HTMLElement | null) => void; ref: React.MutableRefObject<Viewing> } {
  const [v, setV] = useState<Viewing>(EMPTY_VIEWING);
  const ref = useRef<Viewing>(EMPTY_VIEWING);
  const visible = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);
  const set = useCallback((f: (v: Viewing) => Viewing) => {
    ref.current = f(ref.current);
    setV(ref.current);
  }, []);
  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.item;
        if (id) e.isIntersecting ? visible.current.add(id) : visible.current.delete(id);
      }
    }, { threshold: 0.6 });
    const timer = window.setInterval(() => {
      if (active.current()) set((x) => addSeen(x, Array.from(visible.current), TICK_MS));
    }, TICK_MS);
    return () => {
      observer.current?.disconnect();
      window.clearInterval(timer);
    };
  }, [set, active]);
  const watch = useCallback((id: string) => (el: HTMLElement | null) => {
    if (!el) return;
    el.dataset.item = id;
    observer.current?.observe(el);
  }, []);
  return { v, set, watch, ref };
}

function Video({ choice, player }: { choice: StageChoice; player: React.MutableRefObject<HTMLIFrameElement | null> }) {
  const [gate, setGate] = useState<VideoGate>("poster");
  const store = () => (typeof window === "undefined" ? null : window.localStorage);
  const v = choice.items[0]?.media;
  if (!v) return null;
  const end = Math.ceil(choice.items[choice.items.length - 1].media?.end ?? v.end);
  const watchUrl = "https://www.youtube.com/watch?v=" + encodeURIComponent(v.videoId) + "&t=" + Math.floor(v.start);
  const src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.videoId) + "?start=" + Math.floor(v.start) + "&end=" + end + "&autoplay=1&rel=0&enablejsapi=1";
  return (
    <div className={own.videoBox}>
      {gate === "playing" ? (
        <iframe ref={player} className={own.video} title={choice.items[0].text} src={src} allow="autoplay; encrypted-media" data-testid="input-video" onLoad={(e) => e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*")} />
      ) : gate === "asking" ? (
        <section className={own.consent} role="region" aria-label="YouTube consent" data-testid="input-video-consent">
          <p className={styles.small}>
            This clip plays from YouTube. Loading it sends your address and device details to Google, which may set cookies. <a href="/privacy">Privacy</a>
          </p>
          <div className={styles.row}>
            <Button variant="ghost" size="md" onClick={() => { rememberConsent(store()); setGate(onAnswer(true)); }} data-testid="input-video-allow">
              Allow YouTube videos
            </Button>
            <Button variant="ghost" size="md" onClick={() => setGate(onAnswer(false))} data-testid="input-video-decline">
              Read without video
            </Button>
          </div>
        </section>
      ) : gate === "declined" ? null : (
        <button type="button" className={own.poster} onClick={() => setGate(onPoster(storedConsent(store())))} data-testid="input-video-poster">
          Play the clip
          <span>Loads the video from YouTube</span>
        </button>
      )}
      <p className={styles.small} data-testid="input-video-fallback">
        No video? Read along below, or <a href={watchUrl} target="_blank" rel="noopener noreferrer">open it on YouTube</a>.
      </p>
    </div>
  );
}

export default function InputPlay({ lang, choice, gloss, onFinish, onExit }: { lang: string; choice: StageChoice; gloss: (lemma: string) => string | null; onFinish: (v: Viewing | null) => void; onExit: (v: Viewing) => void }) {
  const player = useRef<HTMLIFrameElement | null>(null);
  const active = useActivity(!!choice.items[0]?.media, player);
  const { v, set, watch, ref } = useViewing(active);
  useEffect(() => {
    const leave = () => onExit(ref.current);
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [onExit, ref]);
  return (
    <>
      <Video choice={choice} player={player} />
      <ol className={own.lines} data-testid="input-lines">
        {choice.items.map((item) => (
          <li key={item.id} lang={lang} ref={watch(item.id)} data-testid="input-line">
            {item.tokens.map((t, k) => {
              const on = (v.taps.taps[item.id] ?? []).includes(t.lemma);
              return (
                <button key={k} type="button" className={on ? `${own.token} ${own.tapped}` : own.token} aria-pressed={on} title={on ? gloss(t.lemma) ?? t.lemma : undefined} onClick={() => set((x) => ({ ...x, taps: toggleTap(x.taps, item.id, t.lemma) }))} data-testid="input-token">
                  {t.surface}
                </button>
              );
            })}
            {item.translation && v.revealed.has(item.id) ? (
              <span className={own.translation} data-testid="input-translation">
                {item.translation}
                {item.translationSource === "machine" ? <em className={own.machine} data-testid="input-machine-label"> machine translation</em> : null}
              </span>
            ) : null}
            {item.translation && !v.revealed.has(item.id) ? (
              <button type="button" className={own.reveal} onClick={() => set((x) => reveal(x, item.id))} data-testid="input-reveal">
                Show meaning
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      <div className={own.actions} data-testid="input-actions">
        <p className={styles.small}>Tap a word you do not know.</p>
        <div className={styles.row}>
          <Button onClick={() => onFinish(ref.current)} data-testid="input-done">
            Done
          </Button>
          <Button variant="quiet" size="sm" onClick={() => onFinish(null)} data-testid="input-skip">
            Skip
          </Button>
        </div>
      </div>
    </>
  );
}
