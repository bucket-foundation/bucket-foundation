import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_BUCKET, type ImportFileRecord } from "./import-storage";

const PAGE = 200;

export type VerifyFailure = "object_missing" | "bytes_mismatch" | "hash_mismatch" | "storage_unavailable";

export interface StoredObject {
  bytes: number;
  sha256: string;
}

export type VerifyResult = { ok: true; value: StoredObject } | { ok: false; error: VerifyFailure; detail: string };

export interface ObjectReader {
  download(path: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
}

export function bucketFrom(svc: SupabaseClient): ObjectReader {
  return svc.storage.from(IMPORT_BUCKET) as unknown as ObjectReader;
}

export async function readObject(reader: ObjectReader, path: string): Promise<VerifyResult> {
  let data: Blob | null;
  try {
    const res = await reader.download(path);
    if (res.error || !res.data) return { ok: false, error: "object_missing", detail: res.error?.message ?? "no object at that path" };
    data = res.data;
  } catch (e) {
    return { ok: false, error: "storage_unavailable", detail: e instanceof Error ? e.message : String(e) };
  }
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    const stream = data.stream() as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      hash.update(chunk);
      bytes += chunk.byteLength;
    }
  } catch (e) {
    return { ok: false, error: "storage_unavailable", detail: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true, value: { bytes, sha256: hash.digest("hex") } };
}

export async function verifyUpload(reader: ObjectReader, record: ImportFileRecord): Promise<VerifyResult> {
  const stored = await readObject(reader, record.storagePath);
  if (!stored.ok) return stored;
  if (stored.value.bytes !== record.bytes) {
    return { ok: false, error: "bytes_mismatch", detail: `the object holds ${stored.value.bytes} bytes, the request says ${record.bytes}` };
  }
  if (stored.value.sha256 !== record.sha256) {
    return { ok: false, error: "hash_mismatch", detail: "the object's hash is not the one its path names" };
  }
  return stored;
}

export interface ImportFileRow {
  id: string;
  import_id: string;
  sha256: string;
  bytes: number;
  media_type: string;
  filename: string | null;
  storage_path: string;
  created_at: string;
}

export type RecordResult = { ok: true; value: ImportFileRow; repeat: boolean } | { ok: false; error: "import_not_found" | "write_failed"; detail: string };

export async function ownedImport(svc: SupabaseClient, importId: string, ownerId: string): Promise<{ id: string; nodeId: string | null; nodeSlug: string | null } | null> {
  const { data, error } = await svc.from("imports").select("id, node_id").eq("id", importId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(`reading the import: ${error.message}`);
  const row = data as { id: string; node_id: string | null } | null;
  if (!row) return null;
  if (!row.node_id) return { id: row.id, nodeId: null, nodeSlug: null };
  const node = await svc.from("nodes").select("slug").eq("id", row.node_id).maybeSingle();
  if (node.error) throw new Error(`reading the import's node: ${node.error.message}`);
  return { id: row.id, nodeId: row.node_id, nodeSlug: ((node.data as { slug?: string } | null)?.slug ?? null) };
}

export async function recordImportFile(svc: SupabaseClient, importId: string, record: ImportFileRecord): Promise<RecordResult> {
  const existing = await svc
    .from("import_files")
    .select("id, import_id, sha256, bytes, media_type, filename, storage_path, created_at")
    .eq("import_id", importId)
    .eq("sha256", record.sha256)
    .maybeSingle();
  if (existing.error) return { ok: false, error: "write_failed", detail: existing.error.message };
  if (existing.data) return { ok: true, value: existing.data as ImportFileRow, repeat: true };

  const { data, error } = await svc
    .from("import_files")
    .insert({
      import_id: importId,
      owner_id: record.ownerId,
      sha256: record.sha256,
      bytes: record.bytes,
      media_type: record.mediaType,
      filename: record.filename,
    })
    .select("id, import_id, sha256, bytes, media_type, filename, storage_path, created_at")
    .single();
  if (error || !data) return { ok: false, error: "write_failed", detail: error?.message ?? "no row returned" };
  return { ok: true, value: data as ImportFileRow, repeat: false };
}

export async function listImportFiles(svc: SupabaseClient, importId: string): Promise<ImportFileRow[]> {
  const out: ImportFileRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await svc
      .from("import_files")
      .select("id, import_id, sha256, bytes, media_type, filename, storage_path, created_at")
      .eq("import_id", importId)
      .order("created_at")
      .order("sha256")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`listing the import's files: ${error.message}`);
    const rows = (data ?? []) as ImportFileRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
