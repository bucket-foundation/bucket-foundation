import { createHash } from "node:crypto";

export const NORMALIZATION = "nfc-lf/1";

export function normalizeText(raw: string): string {
  const noBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return noBom.replace(/\r\n?/g, "\n").normalize("NFC");
}

export function sha256Hex(input: string | Uint8Array): string {
  const h = createHash("sha256");
  if (typeof input === "string") h.update(input, "utf8");
  else h.update(input);
  return h.digest("hex");
}

export function utf8(text: string): Buffer {
  return Buffer.from(text, "utf8");
}

export function byteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function onBoundary(bytes: Uint8Array, offset: number): boolean {
  if (!Number.isInteger(offset) || offset < 0 || offset > bytes.length) return false;
  if (offset === bytes.length) return true;
  return (bytes[offset] & 0xc0) !== 0x80;
}

export class OffsetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OffsetError";
    Object.setPrototypeOf(this, OffsetError.prototype);
  }
}

export function byteSlice(text: string, start: number, end: number): string {
  const bytes = utf8(text);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > bytes.length || start > end) {
    throw new OffsetError(`span [${start}, ${end}) is outside a text of ${bytes.length} bytes`);
  }
  if (!onBoundary(bytes, start)) throw new OffsetError(`start ${start} falls inside a multibyte character`);
  if (!onBoundary(bytes, end)) throw new OffsetError(`end ${end} falls inside a multibyte character`);
  return bytes.subarray(start, end).toString("utf8");
}

