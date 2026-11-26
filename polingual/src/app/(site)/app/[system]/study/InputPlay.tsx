"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addSeen, EMPTY_VIEWING, reveal, toggleTap, type StageChoice, type Viewing } from "@academy/input-stage";
import { Button } from "@/ui";
import styles from "../../app.module.css";
import own from "./InputStage.module.css";

export const TICK_MS = 1000;

function useViewing(): { v: Viewing; set: (f: (v: Viewing) => Viewing) => void; watch: (id: string) => (el: HTMLElement | null) => void; ref: React.MutableRefObject<Viewing> } {
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
      if (document.visibilityState === "visible") set((x) => addSeen(x, Array.from(visible.current), TICK_MS));
    }, TICK_MS);
    return () => {
      observer.current?.disconnect();
      window.clearInterval(timer);
    };
  }, [set]);
  const watch = useCallback((id: string) => (el: HTMLElement | null) => {
    if (!el) return;
    el.dataset.item = id;
    observer.current?.observe(el);
  }, []);
  return { v, set, watch, ref };
}

function Video({ choice }: { choice: StageChoice }) {
  const [load, setLoad] = useState(false);
  const v = choice.items[0]?.media;
  if (!v) return null;
  const end = Math.ceil(choice.items[choice.items.length - 1].media?.end ?? v.end);
  const watchUrl = "https://www.youtube.com/watch?v=" + encodeURIComponent(v.videoId) + "&t=" + Math.floor(v.start);
  const src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.videoId) + "?start=" + Math.floor(v.start) + "&end=" + end + "&autoplay=1&rel=0";
  return (
    <div className={own.videoBox}>
      {load ? (
        <iframe className={own.video} title={choice.items[0].text} src={src} allow="autoplay; encrypted-media" data-testid="input-video" />
      ) : (
        <button type="button" className={own.poster} onClick={() => setLoad(true)} data-testid="input-video-poster">
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
  const { v, set, watch, ref } = useViewing();
  useEffect(() => {
    const leave = () => onExit(ref.current);
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [onExit, ref]);
  return (
    <>
      <Video choice={choice} />
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
            {item.translation && v.revealed.has(item.id) ? <span className={own.translation} data-testid="input-translation">{item.translation}</span> : null}
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
