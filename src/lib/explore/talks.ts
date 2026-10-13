import fs from "fs";
import path from "path";

export interface Talk {
  id: string;
  title: string;
}

const SOURCE_LINE = /\*\*Source\*\*:\s*\[(.+)\]\((https?:\/\/[^)\s]+)\)/;
const VIDEO_ID = /[?&]v=([A-Za-z0-9_-]{6,})/;

const cache = new Map<string, Talk | null>();

export function parseTalk(markdown: string): Talk | null {
  const m = SOURCE_LINE.exec(markdown);
  if (!m) return null;
  const id = VIDEO_ID.exec(m[2])?.[1];
  return id ? { id, title: m[1].trim() } : null;
}

export function talkFor(file: string, root = process.cwd()): Talk | null {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  let talk: Talk | null = null;
  try {
    talk = parseTalk(fs.readFileSync(path.join(root, file), "utf8").slice(0, 2000));
  } catch {
    talk = null;
  }
  cache.set(file, talk);
  return talk;
}
