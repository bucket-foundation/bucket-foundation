"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emitReward } from "@/lib/reward";
import { activeCue, defaultLangs, markSeen, progressOf, PROGRESS_KEY, readJson, WORDS_KEY, writeJson, type SavedWord, type Video, type VideoProgress } from "@/lib/video";

function storeProgress(id: string, p: VideoProgress): void {
  writeJson(PROGRESS_KEY, { ...readJson<Record<string, VideoProgress>>(PROGRESS_KEY, {}), [id]: p });
}

export function useVideoData(id: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [failed, setFailed] = useState(false);
  const [langs, setLangs] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/videos/${id}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Video>) : Promise.reject(new Error(String(r.status)))))
      .then((v) => {
        setVideo(v);
        setLangs(defaultLangs(v));
      })
      .catch(() => setFailed(true));
  }, [id]);
  return { video, failed, langs, setLangs };
}

export function useVideoProgress(id: string, video: Video | null, time: number) {
  const [progress, setProgress] = useState<VideoProgress | undefined>(undefined);
  const finished = useRef(false);
  const active = video ? activeCue(video.cues, time) : -1;

  useEffect(() => setProgress(readJson<Record<string, VideoProgress>>(PROGRESS_KEY, {})[id]), [id]);

  useEffect(() => {
    if (active < 0 || !video) return;
    const seen = markSeen(progress, active);
    if (seen === progress) return;
    const next = { ...seen, total: video.cues.length };
    storeProgress(id, next);
    setProgress(next);
    if (!finished.current && progressOf(next, video.cues.length) >= 0.9) {
      finished.current = true;
      emitReward("round-end");
    }
  }, [active, id, progress, video]);

  const addWord = useCallback(() => {
    const next = { ...(progress ?? { seen: [], words: 0 }), words: (progress?.words ?? 0) + 1 };
    storeProgress(id, next);
    setProgress(next);
  }, [id, progress]);

  return { active, pct: video ? progressOf(progress, video.cues.length) : 0, addWord };
}

export function useSavedWords(id: string, onSaved: () => void) {
  const [saved, setSaved] = useState<SavedWord[]>([]);
  useEffect(() => setSaved(readJson<SavedWord[]>(WORDS_KEY, [])), []);
  const mine = useMemo(() => saved.filter((w) => w.video === id), [saved, id]);
  const keys = useMemo(() => new Set(mine.map((w) => `${w.lang}:${w.word.toLowerCase()}`)), [mine]);
  const save = useCallback(
    (lang: string, word: string, start: number) => {
      if (keys.has(`${lang}:${word.toLowerCase()}`)) return;
      const next = [{ video: id, lang, word, start }, ...saved].slice(0, 200);
      setSaved(next);
      writeJson(WORDS_KEY, next);
      onSaved();
      emitReward("save");
    },
    [id, keys, onSaved, saved],
  );
  return { mine, keys, save };
}
