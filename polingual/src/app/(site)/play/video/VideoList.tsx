"use client";

import { useEffect, useState } from "react";
import { ProgressRing } from "@/ui";
import { cleanTitle, clock, progressOf, PROGRESS_KEY, readJson, type VideoProgress, type VideoSummary } from "@/lib/video";
import { FlagSquare } from "../LearnWord";
import s from "./video.module.css";

export default function VideoList({ videos }: { videos: VideoSummary[] }) {
  const [progress, setProgress] = useState<Record<string, VideoProgress>>({});
  useEffect(() => setProgress(readJson(PROGRESS_KEY, {})), []);
  return (
    <section data-testid="video-list">
      <h1>Watch</h1>
      <p>Short stories with live captions in up to four languages at once. Tap a word to keep it.</p>
      <ul className={s.list}>
        {videos.map((v) => {
          const p = progress[v.id];
          const pct = progressOf(p, p?.total ?? 0);
          return (
            <li key={v.id}>
              <a className={s.card} href={`/play/video/${v.id}`} data-testid="video-card">
                <img src={v.thumb} alt="" loading="lazy" width={480} height={270} />
                <span className={s.cardBody}>
                  <ProgressRing value={pct} size={40} label={`${Math.round(pct * 100)} percent watched`} />
                  <span>
                    <b>{cleanTitle(v.title)}</b>
                    <span className={s.channel}> {clock(v.duration)}</span>
                    <span className={s.flags}>
                      {v.langs.map((l) => (
                        <FlagSquare key={l} lang={l} size={14} />
                      ))}
                    </span>
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
