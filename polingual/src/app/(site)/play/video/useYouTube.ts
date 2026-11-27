"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

interface YTApi {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTApi> | null = null;

function loadApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YTApi>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("YouTube player timed out")), 15000);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      if (window.YT) resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("YouTube player failed to load"));
    };
    document.head.appendChild(tag);
  });
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export function useYouTube(host: RefObject<HTMLDivElement | null>, videoId: string, enabled: boolean) {
  const player = useRef<YTPlayer | null>(null);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let timer = 0;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadApi().then((YT) => {
      if (!live) return;
      player.current = new YT.Player(mount, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0 },
        events: { onReady: () => live && setReady(true) },
      });
      timer = window.setInterval(() => {
        const t = player.current?.getCurrentTime?.();
        if (typeof t === "number") setTime(t);
      }, 200);
    }, () => live && setFailed(true));
    return () => {
      live = false;
      window.clearInterval(timer);
      player.current?.destroy();
      player.current = null;
      mount.remove();
    };
  }, [host, videoId, enabled]);

  const seek = useCallback((t: number) => {
    setTime(t);
    player.current?.seekTo(t, true);
    player.current?.playVideo();
  }, []);

  return { time, seek, ready, failed };
}
