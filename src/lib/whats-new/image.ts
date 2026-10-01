import sharp, { type OutputInfo } from "sharp";
import { IMAGE_MAX_PIXELS, IMAGE_TYPES } from "./schema";
import { readEntry, type DocStore } from "./store";

export const WEBP_MAX_BYTES = 400 * 1024;
export const IMAGE_ROUTE = "/api/whats-new/image/";
export const ENCODE_STEPS: readonly { edge: number; quality: number }[] = [
  { edge: 2400, quality: 82 },
  { edge: 2400, quality: 72 },
  { edge: 2400, quality: 62 },
  { edge: 2400, quality: 50 },
  { edge: 1600, quality: 62 },
  { edge: 1600, quality: 45 },
  { edge: 1200, quality: 45 },
  { edge: 800, quality: 40 },
];

export type ImageType = (typeof IMAGE_TYPES)[number];

export type Encoded = { ok: true; webp: Buffer; width: number; height: number; quality: number } | { ok: false; reason: string };

export interface StoredImage {
  filename: string;
  content_type: "image/webp";
  base64: string;
}

export function sniff(bytes: Buffer): ImageType | "svg" | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  const head = bytes.subarray(0, 1024).toString("latin1").replace(/^\xef\xbb\xbf/, "").trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!doctype svg") || head.includes("<svg")) return "svg";
  return null;
}

export async function toWebp(bytes: Buffer, declared: string, steps: readonly { edge: number; quality: number }[] = ENCODE_STEPS, maxBytes: number = WEBP_MAX_BYTES): Promise<Encoded> {
  const kind = sniff(bytes);
  if (kind === "svg") return { ok: false, reason: "must not be an SVG" };
  if (kind === null || kind !== declared) return { ok: false, reason: "must be a PNG, JPEG or WebP that matches image.content_type" };
  try {
    let edge = 0;
    let data: Buffer = Buffer.alloc(0);
    let info: OutputInfo | null = null;
    for (const step of steps) {
      if (info === null || edge !== step.edge) {
        const decoded: { data: Buffer; info: OutputInfo } = await sharp(bytes, { limitInputPixels: IMAGE_MAX_PIXELS, animated: false, pages: 1, page: 0, failOn: "warning" })
          .rotate()
          .resize({ width: step.edge, height: step.edge, fit: "inside", withoutEnlargement: true })
          .toColourspace("srgb")
          .raw()
          .toBuffer({ resolveWithObject: true });
        edge = step.edge;
        data = decoded.data;
        info = decoded.info;
      }
      const webp = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).webp({ quality: step.quality, effort: 4 }).toBuffer();
      if (webp.length <= maxBytes) return { ok: true, webp, width: info.width, height: info.height, quality: step.quality };
    }
    return { ok: false, reason: `must fit ${maxBytes} bytes as WebP` };
  } catch {
    return { ok: false, reason: "must decode as a whole PNG, JPEG or WebP of 16 megapixels or fewer" };
  }
}

export function webpName(filename: string): string {
  return `${filename.replace(/\.[A-Za-z0-9]{1,5}$/, "")}.webp`;
}

export interface ImageResult {
  status: number;
  bytes: Buffer | null;
}

const ID = /^[a-z0-9-]{3,80}$/;
const MISSING: ImageResult = { status: 404, bytes: null };

export async function handleImage(id: string, store: DocStore | null): Promise<ImageResult> {
  if (!ID.test(id)) return MISSING;
  if (!store) return { status: 503, bytes: null };
  try {
    const entry = await readEntry(store, id);
    if (!entry || entry.review_state !== "published" || !entry.image) return MISSING;
    const text = await store.read(`entries/${id}.image.json`);
    if (text === null) return MISSING;
    const doc = JSON.parse(text) as Partial<StoredImage>;
    if (doc.content_type !== "image/webp" || typeof doc.base64 !== "string") return MISSING;
    const bytes = Buffer.from(doc.base64, "base64");
    if (sniff(bytes) !== "image/webp") return MISSING;
    return { status: 200, bytes };
  } catch (err) {
    console.error("[whats-new] image read failed:", err instanceof Error ? err.message : err);
    return { status: 503, bytes: null };
  }
}
