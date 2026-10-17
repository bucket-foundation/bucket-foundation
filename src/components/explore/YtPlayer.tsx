"use client";

import { useEffect, useRef, useState } from "react";
import type { YtPlay } from "@/lib/explore/search";
import { clock } from "@/lib/explore/yt-start";

interface YtApiPlayer {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YtNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YtApiPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
let apiReady: Promise<YtNamespace> | null = null;

function loadApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiReady ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiReady;
}

const mono = { fontFamily: "var(--font-jetbrains)" };
const btn = "border hairline px-3 py-2 text-sm min-h-[44px] focus-visible:outline focus-visible:outline-2";

export default function YtPlayer({ play, title, autoPlay = false, onNext }: { play: YtPlay; title: string; autoPlay?: boolean; onNext?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YtApiPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => () => {
    player.current?.destroy();
    player.current = null;
  }, []);

  useEffect(() => {
    if (autoPlay) start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (player.current) {
      player.current.playVideo();
      return;
    }
    if (!host.current) return;
    setLoading(true);
    const YT = await loadApi();
    const mount = document.createElement("div");
    host.current.replaceChildren(mount);
    player.current = new YT.Player(mount, {
      host: "https://www.youtube-nocookie.com",
      videoId: play.id,
      width: "100%",
      height: "100%",
      playerVars: { start: play.start, playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1 },
      events: {
        onReady: () => {
          setLoading(false);
          player.current?.playVideo();
        },
        onStateChange: (e) => setPlaying(e.data === PLAYING),
      },
    });
  }

  function toggle() {
    if (playing) player.current?.pauseVideo();
    else start();
  }

  function expand() {
    setExpanded((v) => !v);
    if (!player.current) start();
  }

  return (
    <div data-testid="yt-player" className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="yt-play" className={btn} onClick={toggle} aria-pressed={playing} aria-label={`${playing ? "Pause" : "Play"} ${title} at ${clock(play.start)}`}>
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span> {loading ? "Loading" : playing ? "Pause" : "Listen"}
          <span className="ml-2 text-xs" style={mono}>{clock(play.start)}</span>
        </button>
        <button type="button" data-testid="yt-expand" className={btn} onClick={expand} aria-pressed={expanded} aria-controls={`yt-${play.id}`}>
          {expanded ? "Hide video" : "Expand video"}
        </button>
        {onNext && (
          <button type="button" data-testid="yt-next" className={btn} onClick={onNext}>
            Next
          </button>
        )}
      </div>
      <div
        id={`yt-${play.id}`}
        ref={host}
        data-testid="yt-frame"
        aria-hidden={!expanded}
        className={expanded ? "mt-2 w-full" : ""}
        style={expanded ? { aspectRatio: "16 / 9" } : { position: "absolute", left: -9999, width: 200, height: 200, visibility: "hidden" }}
      />
    </div>
  );
}
