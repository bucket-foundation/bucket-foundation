export const INPUT_TARGET_TO_A2 = 0.7;
export const INPUT_TARGET_PAST_A2 = 0.6;
export const A2_TOP_TIER = 6;
export const CARD_SECONDS = 12;
export const SECONDS_PER_TOKEN = 1.5;

export function inputTarget(tier: number): number {
  return tier <= A2_TOP_TIER ? INPUT_TARGET_TO_A2 : INPUT_TARGET_PAST_A2;
}

export function inputShare(tier: number, eligibleSeconds: number, sessionSeconds: number): number {
  if (!(sessionSeconds > 0) || !(eligibleSeconds > 0)) return 0;
  return Math.min(inputTarget(tier), eligibleSeconds / sessionSeconds);
}

export function unitSeconds(tokens: number): number {
  return Math.max(0, tokens) * SECONDS_PER_TOKEN;
}

export interface InputMix {
  target: number;
  share: number;
  units: number;
  positions: number[];
  plannedShare: number;
}

export function planInputMix(tier: number, cards: number, eligibleUnitSeconds: readonly number[]): InputMix {
  const target = inputTarget(tier);
  const cardTime = Math.max(0, cards) * CARD_SECONDS;
  const pool = eligibleUnitSeconds.filter((s) => s > 0);
  const avg = pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : 0;
  const eligible = pool.reduce((a, b) => a + b, 0);
  const maxUnits = pool.length;
  if (!avg || !maxUnits) return { target, share: 0, units: 0, positions: [], plannedShare: 0 };
  const share = cardTime > 0 ? inputShare(tier, eligible, eligible + cardTime) : target;
  const wantSeconds = cardTime > 0 ? (share * cardTime) / (1 - share) : avg;
  const units = Math.min(maxUnits, Math.max(1, cards), Math.max(1, Math.round(wantSeconds / avg)));
  const positions = Array.from({ length: units }, (_, i) => Math.min(Math.max(0, cards - 1), Math.floor(((i + 1) * cards) / (units + 1))));
  const plannedShare = (units * avg) / (units * avg + cardTime);
  return { target, share, units, positions, plannedShare };
}

export function roundedItems(targetPermille: number, items: number): number {
  return Math.floor((targetPermille * items + 500) / 1000);
}

export function realizedShare(inputSeconds: number, sessionSeconds: number): number {
  return sessionSeconds > 0 ? Math.min(1, Math.max(0, inputSeconds / sessionSeconds)) : 0;
}

export interface ActivityMark {
  at: number;
  visible?: boolean;
  focused?: boolean;
  playing?: boolean;
  idle?: boolean;
}

export const IDLE_MS = 60_000;

export function isActive(f: { visible: boolean; focused: boolean; playing: boolean; idle?: boolean }, needsPlayer: boolean): boolean {
  return f.visible && f.focused && (needsPlayer ? f.playing : !f.idle);
}

const YT_HOST = /(^|\.)youtube(-nocookie)?\.com$/;

export function fromYouTube(origin: string): boolean {
  try {
    return YT_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function youtubePlaying(data: unknown): boolean | null {
  let msg: unknown = data;
  if (typeof data === "string") {
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const m = msg as { event?: string; info?: unknown } | null;
  if (!m || typeof m !== "object") return null;
  if (m.event === "onStateChange" && typeof m.info === "number") return m.info === 1;
  if (m.event === "infoDelivery" && m.info && typeof m.info === "object" && typeof (m.info as { playerState?: unknown }).playerState === "number") return (m.info as { playerState: number }).playerState === 1;
  return null;
}

export function activeMs(marks: readonly ActivityMark[], end: number, needsPlayer: boolean): number {
  const sorted = [...marks].sort((a, b) => a.at - b.at);
  let visible = true;
  let focused = true;
  let playing = false;
  let since: number | null = null;
  let total = 0;
  let idle = false;
  const on = () => isActive({ visible, focused, playing, idle }, needsPlayer);
  for (const m of sorted) {
    if (m.at > end) break;
    if (since !== null && on()) total += m.at - since;
    if (m.visible !== undefined) visible = m.visible;
    if (m.focused !== undefined) focused = m.focused;
    if (m.playing !== undefined) playing = m.playing;
    if (m.idle !== undefined) idle = m.idle;
    since = m.at;
  }
  if (since !== null && on() && end > since) total += end - since;
  return total;
}
