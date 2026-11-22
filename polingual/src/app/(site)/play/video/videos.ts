import { readFileSync } from "node:fs";
import path from "node:path";
import type { VideoSummary } from "@/lib/video";

export function videoIndex(): VideoSummary[] {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "public/videos/index.json"), "utf8")) as VideoSummary[];
  } catch {
    return [];
  }
}
