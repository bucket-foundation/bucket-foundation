export const IMPORT_BUCKET = "research-os-imports";

export const MAX_IMPORT_BYTES = 52_428_800;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MEDIA_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

export type StoragePathError =
  | "owner_not_a_uuid"
  | "sha256_not_hex"
  | "bytes_out_of_range"
  | "media_type_malformed";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: StoragePathError };

export function isSha256Hex(value: string): boolean {
  return SHA256_HEX.test(value);
}

export function isMediaType(value: string): boolean {
  return MEDIA_TYPE.test(value);
}

export function storagePathFor(ownerId: string, sha256: string): Validated<string> {
  if (!UUID.test(ownerId)) return { ok: false, error: "owner_not_a_uuid" };
  if (!SHA256_HEX.test(sha256)) return { ok: false, error: "sha256_not_hex" };
  return { ok: true, value: `${ownerId}/${sha256}` };
}

export function parseStoragePath(path: string): { ownerId: string; sha256: string } | null {
  const parts = path.split("/");
  if (parts.length !== 2) return null;
  const [ownerId, sha256] = parts;
  if (!UUID.test(ownerId) || !SHA256_HEX.test(sha256)) return null;
  return { ownerId, sha256 };
}

export interface ImportFileInput {
  ownerId: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  filename?: string | null;
}

export interface ImportFileRecord extends ImportFileInput {
  storagePath: string;
}

export function validateImportFile(input: ImportFileInput): Validated<ImportFileRecord> {
  const path = storagePathFor(input.ownerId, input.sha256);
  if (!path.ok) return path;
  if (!Number.isInteger(input.bytes) || input.bytes <= 0 || input.bytes > MAX_IMPORT_BYTES) {
    return { ok: false, error: "bytes_out_of_range" };
  }
  if (!MEDIA_TYPE.test(input.mediaType)) return { ok: false, error: "media_type_malformed" };
  return { ok: true, value: { ...input, filename: input.filename ?? null, storagePath: path.value } };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("import-storage: WebCrypto is unavailable; Node 18 or later, or a browser, is required");
  const digest = await subtle.digest("SHA-256", bytes as unknown as ArrayBufferView);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
