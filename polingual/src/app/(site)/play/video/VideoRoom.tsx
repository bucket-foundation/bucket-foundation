"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Pill, ProgressRing } from "@/ui";
import { learnEntry, learnHref } from "@/lib/lobby/learn-index";
import { cleanTitle, clock, licenseLabel, toggleLang, words, type SavedWord, type Video } from "@/lib/video";
import { FlagSquare } from "../LearnWord";
import { langName } from "../langs";
import { useLearnIndex } from "../useLearn";
import { useYouTube } from "./useYouTube";
import { browserStore, storedConsent } from "@/lib/app/embed-consent";
import { StopYouTube, YouTubeConsent } from "../../YouTubeConsent";
import { useSavedWords, useVideoData, useVideoProgress } from "./useVideoState";
import s from "./video.module.css";

type OnWord = (lang: string, word: string) => void;

function Line({ text, lang, saved, onWord }: { text: string; lang: string; saved: Set<string>; onWord: OnWord }) {
  return (
    <span lang={lang}>
      {words(text, lang).map((w, i) =>
        w.word ? (
          <Button
            key={i}
            bare
            className={s.word}
            data-saved={saved.has(`${lang}:${w.text.toLowerCase()}`) || undefined}
            data-testid="cue-word"
            onClick={(e) => {
              e.stopPropagation();
              onWord(lang, w.text);
            }}
          >
            {w.text}
          </Button>
        ) : (
          <span key={i}>{w.text}</span>
        ),
      )}
    </span>
  );
}

function SavedStrip({ mine }: { mine: SavedWord[] }) {
  const index = useLearnIndex();
  if (!mine.length) return <p className={s.hint}>Tap any word in the transcript to save it. Tap a line to jump there.</p>;
  return (
    <div className={s.saved} data-testid="saved-words">
      <span className={s.label}>Saved {mine.length}</span>
      <ul>
        {mine.slice(0, 24).map((w) => (
          <li key={`${w.lang}:${w.word}`}>
            <a href={learnHref(learnEntry(index, w.lang, w.word.toLowerCase()))} lang={w.lang}>
              <FlagSquare lang={w.lang} size={14} />
              {w.word}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type TranscriptProps = { video: Video | null; failed: boolean; langs: string[]; setLangs: (f: (c: string[]) => string[]) => void; active: number; seek: (t: number) => void; saved: Set<string>; onWord: OnWord };

function Transcript({ video, failed, langs, setLangs, active, seek, saved, onWord }: TranscriptProps) {
  const [stacked, setStacked] = useState(false);
  const [follow, setFollow] = useState(true);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>(`[data-cue="${active}"]`);
    if (follow && box && row) box.scrollTo({ top: row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2, behavior: "smooth" });
  }, [active, follow]);
  useEffect(() => setStacked(window.matchMedia?.("(max-width: 600px)").matches ?? false), []);
  const cols = { ["--n" as string]: langs.length };
  return (
    <section className={s.transcript} aria-label="Transcript">
      <div className={s.tools}>
        <div className={s.picker} role="group" aria-label="Transcript languages">
          {video?.langs.map((l) => (
            <Pill key={l} size="sm" active={langs.includes(l)} aria-pressed={langs.includes(l)} onClick={() => setLangs((c) => toggleLang(c, l))} data-testid={`lang-${l}`}>
              <FlagSquare lang={l} size={14} /> {langName(l)}
            </Pill>
          ))}
        </div>
        <div className={s.toggles}>
          <Button size="sm" variant="quiet" onClick={() => setStacked((v) => !v)} data-testid="layout-toggle">{stacked ? "Columns" : "Stacked"}</Button>
          <Button size="sm" variant={follow ? "secondary" : "quiet"} onClick={() => setFollow((v) => !v)} aria-pressed={follow}>Follow</Button>
        </div>
      </div>
      {failed ? <p className={s.hint}>This video could not load.</p> : null}
      <div className={s.heads} data-stacked={stacked} style={cols}>
        {langs.map((l) => <span key={l} className={s.label}>{langName(l)}</span>)}
      </div>
      <ol ref={list} className={s.cues} data-stacked={stacked} style={cols} data-testid="cues">
        {video?.cues.map((c, i) => (
          <li key={i} data-cue={i} data-active={i === active || undefined} data-testid="cue" onClick={() => seek(c.start)}>
            <span className={s.time}>{clock(c.start)}</span>
            {langs.map((l) => (
              <p key={l} className={s.text} data-lang={l}>
                {stacked ? <FlagSquare lang={l} size={12} /> : null}
                <Line text={c.text[l] ?? ""} lang={l} saved={saved} onWord={onWord} />
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function VideoRoom({ id }: { id: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [asked, setAsked] = useState(false);
  useEffect(() => setAllowed(storedConsent(browserStore())), []);
  const { time, seek, ready, failed: playerFailed } = useYouTube(host, id, allowed);
  const { video, failed, langs, setLangs } = useVideoData(id);
  const { active, pct, addWord } = useVideoProgress(id, video, time);
  const { mine, keys, save } = useSavedWords(id, addWord);
  const title = video ? cleanTitle(video.title) : "Loading video";
  const onWord: OnWord = (lang, word) => save(lang, word, video?.cues[Math.max(active, 0)]?.start ?? 0);
  return (
    <div className={s.room} data-testid="video-room">
      <section className={s.stage}>
        <div className={s.player}>
          {allowed ? (
            <div ref={host} className={s.frame} data-testid="yt-player" data-ready={ready} />
          ) : asked ? (
            <p className={s.channel} data-testid="yt-declined">The transcript works without the video.</p>
          ) : (
            <YouTubeConsent onAnswer={(allow) => (allow ? setAllowed(true) : setAsked(true))} declineText="Read the transcript only" />
          )}
        </div>
        {allowed ? <StopYouTube className={s.channel} onStop={() => setAllowed(false)} /> : null}
        <header className={s.meta}>
          <ProgressRing value={pct} size={48} label={`${Math.round(pct * 100)} percent watched`}>{Math.round(pct * 100)}%</ProgressRing>
          <div className={s.metaText}>
            <h1 className={s.title}>{title}</h1>
            <p className={s.channel}>
              {video ? `${video.channel} · ${clock(video.duration)} · ` : null}
              {video ? <a href={video.source_url} target="_blank" rel="noopener noreferrer" data-testid="video-license">{licenseLabel(video.license)}</a> : null}
            </p>
          </div>
        </header>
        <SavedStrip mine={mine} />
      </section>
      <Transcript video={video} failed={failed || playerFailed} langs={langs} setLangs={setLangs} active={active} seek={seek} saved={keys} onWord={onWord} />
    </div>
  );
}
