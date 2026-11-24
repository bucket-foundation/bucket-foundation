import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, pageMeta } from "./meta";

const ROOM_CODE = /^[A-Z0-9]{4,8}$/;

export function roomCode(raw: string): string | null {
  const code = decodeURIComponent(raw).trim().toUpperCase();
  return ROOM_CODE.test(code) ? code : null;
}

export function roomMeta(kind: "play" | "join", raw: string): Metadata {
  const code = roomCode(raw);
  const path = code ? `/${kind}/${code}` : `/${kind}`;
  const live = kind === "join";
  const title = code ? (live ? `Join live quiz ${code} on Polingual` : `Join my Polingual room ${code}`) : live ? "Join a live Polingual quiz" : "Play Polingual with friends";
  const description = live
    ? "Enter on your phone and answer along with the board. Free, no account needed."
    : "Tap to join the room and play the same round together in several languages. Free, no account needed.";
  return pageMeta({
    path,
    title,
    documentTitle: `${title} · Polingual`,
    description,
    noindex: true,
    image: { ...DEFAULT_OG_IMAGE, alt: code ? `Polingual room ${code}` : DEFAULT_OG_IMAGE.alt },
  });
}
