import { nameAllowed } from "./groups-names";
import type { MemberRow } from "./groups";

export type ShareKind = "url" | "text" | "image";

export interface SharedItemRow {
  id: string;
  group_id: string;
  sender_id: string;
  recipient_id: string | null;
  kind: ShareKind;
  url: string | null;
  body: string | null;
  image_path: string | null;
  created_at: string;
  removed_at: string | null;
}

export interface SharedItem {
  id: string;
  groupId: string;
  from: string;
  fromName: string;
  to: string | null;
  kind: ShareKind;
  url: string | null;
  text: string | null;
  imageUrl: string | null;
  at: string;
  mine: boolean;
}

export interface ShareInput {
  kind: ShareKind;
  url: string | null;
  body: string | null;
  image: Uint8Array | null;
}

export type ShareError = "bad_request" | "text_not_allowed" | "image_too_large";

export const SHARE_PER_MINUTE = 10;
export const MAX_SHARE_TEXT = 1000;
export const MAX_SHARE_URL = 2048;
export const MAX_SHARE_IMAGE = 1_572_864;
export const SHARE_BUCKET = "group-shares";
export const SHARE_ITEM_COLS = "id,group_id,sender_id,recipient_id,kind,url,body,image_path,created_at,removed_at";

function cleanText(input: unknown): string | null | undefined {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") return undefined;
  const t = input.replace(/\u0000/g, "").trim();
  if (t.length === 0) return null;
  return t.length <= MAX_SHARE_TEXT ? t : undefined;
}

function cleanUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length > MAX_SHARE_URL) return null;
  try {
    const u = new URL(input.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function decodeJpeg(input: unknown): Uint8Array | null | "too_large" {
  if (typeof input !== "string" || !/^[A-Za-z0-9+/=\s]+$/.test(input)) return null;
  if (input.length > Math.ceil((MAX_SHARE_IMAGE * 4) / 3) + 8) return "too_large";
  const bytes = Uint8Array.from(Buffer.from(input, "base64"));
  if (bytes.length > MAX_SHARE_IMAGE) return "too_large";
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? bytes : null;
}

export function normalizeShare(body: Record<string, unknown> | null, allowed: (text: string) => boolean = nameAllowed): ShareInput | ShareError {
  if (!body) return "bad_request";
  const text = cleanText(body.text);
  if (text === undefined) return "bad_request";
  let share: ShareInput;
  switch (body.kind) {
    case "url": {
      const url = cleanUrl(body.url);
      if (!url) return "bad_request";
      share = { kind: "url", url, body: text, image: null };
      break;
    }
    case "text":
      if (!text) return "bad_request";
      share = { kind: "text", url: null, body: text, image: null };
      break;
    case "image": {
      const image = decodeJpeg(body.image);
      if (image === "too_large") return "image_too_large";
      if (!image) return "bad_request";
      share = { kind: "image", url: null, body: text, image };
      break;
    }
    default:
      return "bad_request";
  }
  if ((share.body && !allowed(share.body)) || (share.url && !allowed(decodeURIComponentSafe(share.url)))) return "text_not_allowed";
  return share;
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function imagePath(groupId: string, itemKey: string): string {
  return `${groupId}/${itemKey}.jpg`;
}

export function visibleItems(rows: readonly SharedItemRow[], me: string, hidden: ReadonlySet<string>, reported: ReadonlySet<string>): SharedItemRow[] {
  return rows.filter((r) => !r.removed_at && !hidden.has(r.sender_id) && !reported.has(r.id) && (r.recipient_id === null || r.recipient_id === me || r.sender_id === me));
}

export function toSharedItem(row: SharedItemRow, members: readonly MemberRow[], me: string, imageUrl: string | null = null): SharedItem {
  return {
    id: row.id,
    groupId: row.group_id,
    from: row.sender_id,
    fromName: members.find((m) => m.user_id === row.sender_id)?.display_name ?? "",
    to: row.recipient_id,
    kind: row.kind,
    url: row.url,
    text: row.body,
    imageUrl,
    at: row.created_at,
    mine: row.sender_id === me,
  };
}

export function shareRpcError(message: string | undefined): { error: string; status: number } | null {
  const m = message || "";
  if (m.includes("share_limit")) return { error: "share_limit", status: 429 };
  if (m.includes("not_member") || m.includes("not_found")) return { error: "not_found", status: 404 };
  if (m.includes("self")) return { error: "bad_request", status: 400 };
  return null;
}
