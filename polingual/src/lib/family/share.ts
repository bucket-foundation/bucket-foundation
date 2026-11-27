import { PROMPT_GAMES } from "@academy/lobbies";

export type ChallengeGame = (typeof PROMPT_GAMES)[number];

export function challengeGame(game: string | null | undefined): ChallengeGame {
  return (PROMPT_GAMES as readonly string[]).includes(game ?? "") ? (game as ChallengeGame) : "daily";
}

export interface Challenge {
  game: ChallengeGame;
  seed: string;
  root: string;
  targets: string[];
  rounds: number;
  score: number;
  mixed?: boolean;
}

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
export const CHALLENGE_PATH = "/play/challenge";

export function challengeQuery(c: Challenge): string {
  return new URLSearchParams({ g: c.game, s: c.seed, r: c.root, t: c.targets.join("."), n: String(c.rounds), b: String(c.score), ...(c.mixed ? { x: "1" } : {}) }).toString();
}

export function challengeHref(c: Challenge, origin = ""): string {
  return `${origin}${CHALLENGE_PATH}?${challengeQuery(c)}`;
}

export function parseChallenge(q: URLSearchParams): Challenge | null {
  const seed = q.get("s") ?? "";
  const root = q.get("r") ?? "";
  const targets = (q.get("t") ?? "").split(".").filter(Boolean);
  const rounds = Number(q.get("n"));
  const score = Number(q.get("b") ?? 0);
  if (!/^[0-9]{1,20}$/.test(seed) || !LANG_RE.test(root)) return null;
  if (targets.length < 1 || targets.length > 8 || !targets.every((t) => LANG_RE.test(t))) return null;
  if (!Number.isInteger(rounds) || rounds < 3 || rounds > 20) return null;
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) return null;
  return { game: challengeGame(q.get("g")), seed, root, targets, rounds, score, ...(q.get("x") === "1" ? { mixed: true } : {}) };
}

export function shareMessage(word: string | null, score: number, url: string): string {
  return `${word ? `Our word of the night: ${word}. ` : ""}Beat ${score} points on Polingual: ${url}`;
}

export interface CardArt {
  podium: { name: string; score: number }[];
  langs: string[];
  word: { word: string; meaning: string } | null;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function cardSvg(art: CardArt, colors: { bg: string; ink: string; accent: string }): string {
  const rows = art.podium.map((p, i) => `<text x="80" y="${300 + i * 90}" font-size="54" fill="${colors.ink}">${["🥇", "🥈", "🥉"][i]} ${esc(p.name)} · ${p.score}</text>`).join("");
  const word = art.word ? `<text x="80" y="640" font-size="40" fill="${colors.ink}">Word of the night</text><text x="80" y="720" font-size="72" font-weight="700" fill="${colors.accent}">${esc(art.word.word)}</text><text x="80" y="780" font-size="36" fill="${colors.ink}">${esc(art.word.meaning)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${colors.bg}"/><text x="80" y="160" font-size="64" font-weight="700" fill="${colors.accent}">Polingual family night</text>${rows}${word}<text x="80" y="960" font-size="36" fill="${colors.ink}">${esc(art.langs.join(" · "))}</text></svg>`;
}
