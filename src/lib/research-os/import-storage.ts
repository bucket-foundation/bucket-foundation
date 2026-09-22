/**
 * Research OS, ros-import 1: where an imported file's bytes live and what
 * names them.
 *
 * learning/research-os/WORKBENCH.md, "What imports owe the workbench",
 * asks for a SHA-256 on every stored file, storage paths keyed by owner
 * and hash so a new upload is a new version and never replaces bytes a
 * run read, the file's size and media type, and Storage policies by owner
 * and grant. The policies are in
 * supabase/migrations/20260922020000_research_os_import_files.sql. The
 * path rule is here, because the client, the route and the workbench all
 * have to agree on it byte for byte.
 *
 * THE RULE: an object lives at `<owner_id>/<sha256>`.
 *
 * Both halves earn their place. The hash second means the bytes decide
 * the name, so writing a file twice writes the same object and writing
 * different bytes can never land on an existing path. That is what lets
 * a run record an input by its hash and read the same bytes back a year
 * later. The owner first means two people who upload the same file keep
 * separate objects, so one person deleting their copy cannot take the
 * other's bytes with it, and the Storage policies can gate on a prefix.
 *
 * Nothing here uploads. This module is the naming and the bounds, and it
 * is pure so both sides of the request can use it.
 */

/** The private bucket the migration creates. */
export const IMPORT_BUCKET = "research-os-imports";

/**
 * 50 MiB, matching the bucket's own `file_size_limit` and the local
 * stack's `[storage] file_size_limit` in supabase/config.toml. The
 * browser path is bounded further by the memory it takes to hash a file
 * before sending it; a table larger than this goes to a runner.
 */
export const MAX_IMPORT_BYTES = 52_428_800;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One `type/subtype`, the shape the migration's check constraint accepts. */
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

/**
 * The object path for a set of bytes, or why the inputs cannot name one.
 *
 * Refusing is the point. The column in graph.import_files is generated
 * from owner and hash, so a path built here that disagrees with them
 * would write an object no reader ever looks for, and the row and the
 * object would drift apart with nothing to say so.
 */
export function storagePathFor(ownerId: string, sha256: string): Validated<string> {
  if (!UUID.test(ownerId)) return { ok: false, error: "owner_not_a_uuid" };
  if (!SHA256_HEX.test(sha256)) return { ok: false, error: "sha256_not_hex" };
  return { ok: true, value: `${ownerId}/${sha256}` };
}

/** The owner and hash a path names, or null when it is not one of ours. */
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

/**
 * Every rule the table enforces, checked before the request is made, so a
 * caller learns which field is wrong rather than reading a constraint
 * name out of a database error.
 */
export function validateImportFile(input: ImportFileInput): Validated<ImportFileRecord> {
  const path = storagePathFor(input.ownerId, input.sha256);
  if (!path.ok) return path;
  if (!Number.isInteger(input.bytes) || input.bytes <= 0 || input.bytes > MAX_IMPORT_BYTES) {
    return { ok: false, error: "bytes_out_of_range" };
  }
  if (!MEDIA_TYPE.test(input.mediaType)) return { ok: false, error: "media_type_malformed" };
  return { ok: true, value: { ...input, filename: input.filename ?? null, storagePath: path.value } };
}

/**
 * The SHA-256 of some bytes, lowercase hex.
 *
 * Uses WebCrypto, which both the browser and Node 18 and later carry, so
 * the hash a client computes before uploading and the hash a route
 * recomputes are the same function.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
