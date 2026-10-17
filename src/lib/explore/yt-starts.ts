import data from "../../data/yt-starts.json";
import type { YtStarts } from "./yt-start";

const starts = data as YtStarts;

export function excerptStart(file: string): number {
  return starts.excerpts[file] ?? 0;
}

export function sourceStart(id: string): number {
  return starts.sources[id] ?? 0;
}
