import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_BUCKET } from "../import-storage";
import { isMarketing, listImportFiles, type ImportFileRow } from "../import-upload";
import type { Sealed } from "./seal";

export interface MarketingImport {
  id: string;
  title: string;
}

export interface ReportRow {
  id: string;
  import_id: string;
  input_digest: string;
  analyzer_version: string;
  key_id: string;
  iv: string;
  ciphertext: string;
  created_at: string;
}

export interface Remover {
  remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
}

export const removerFrom = (svc: SupabaseClient): Remover => svc.storage.from(IMPORT_BUCKET) as unknown as Remover;

export const toBytea = (b: Buffer) => `\\x${b.toString("hex")}`;
export const fromBytea = (s: string) => Buffer.from(s.startsWith("\\x") ? s.slice(2) : s, "hex");

export function inputDigest(files: Pick<ImportFileRow, "sha256">[]): string {
  return createHash("sha256").update(files.map((f) => f.sha256).sort().join("\n")).digest("hex");
}

let cachedVersion: string | null = null;

export function analyzerVersion(root = join(process.cwd(), "packages/bkt/analyze")): string {
  if (cachedVersion) return cachedVersion;
  const h = createHash("sha256");
  const files = ["bkt_analyze.py", ...readdirSync(join(root, "marketing")).filter((f) => f.endsWith(".py")).sort().map((f) => `marketing/${f}`)];
  for (const f of files) h.update(f).update("\0").update(readFileSync(join(root, f))).update("\0");
  cachedVersion = h.digest("hex").slice(0, 16);
  return cachedVersion;
}

export async function createMarketingImport(svc: SupabaseClient, ownerId: string, title: string): Promise<string> {
  const { data, error } = await svc
    .from("imports")
    .insert({ owner_id: ownerId, kind: "dataset", title, source: { marketing: true }, node_id: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`creating the import: ${error?.message ?? "no row"}`);
  return (data as { id: string }).id;
}

export async function marketingImport(svc: SupabaseClient, importId: string, ownerId: string): Promise<MarketingImport | null> {
  const { data, error } = await svc.from("imports").select("id, title, node_id, source").eq("id", importId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(`reading the import: ${error.message}`);
  const row = data as { id: string; title: string; node_id: string | null; source: { marketing?: unknown } | null } | null;
  if (!row || !isMarketing(row) || row.node_id !== null) return null;
  return { id: row.id, title: row.title };
}

const REPORT_COLUMNS = "id, import_id, input_digest, analyzer_version, key_id, iv, ciphertext, created_at";

export async function findReport(svc: SupabaseClient, importId: string, digest?: string, version?: string): Promise<ReportRow | null> {
  let q = svc.from("marketing_reports").select(REPORT_COLUMNS).eq("import_id", importId);
  if (digest) q = q.eq("input_digest", digest);
  if (version) q = q.eq("analyzer_version", version);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`reading the report: ${error.message}`);
  return (data as ReportRow | null) ?? null;
}

export async function saveReport(svc: SupabaseClient, row: { importId: string; ownerId: string; digest: string; version: string; sealed: Sealed }): Promise<ReportRow> {
  const { error } = await svc.from("marketing_reports").upsert(
    {
      import_id: row.importId,
      owner_id: row.ownerId,
      input_digest: row.digest,
      analyzer_version: row.version,
      key_id: row.sealed.keyId,
      iv: toBytea(row.sealed.iv),
      ciphertext: toBytea(row.sealed.ciphertext),
    },
    { onConflict: "import_id,input_digest,analyzer_version", ignoreDuplicates: true },
  );
  if (error) throw new Error(`saving the report: ${error.message}`);
  const saved = await findReport(svc, row.importId, row.digest, row.version);
  if (!saved) throw new Error("saving the report: no row after write");
  return saved;
}

export type DeleteResult = { ok: true; files: number; objectsRemoved: number } | { ok: false; error: "storage_failed" | "write_failed"; detail: string };

export async function deleteMarketingImport(svc: SupabaseClient, remover: Remover, importId: string, ownerId: string): Promise<DeleteResult> {
  const files = await listImportFiles(svc, importId);
  const removable: string[] = [];
  for (const path of Array.from(new Set(files.map((f) => f.storage_path)))) {
    const { data, error } = await svc.from("import_files").select("import_id").eq("storage_path", path);
    if (error) return { ok: false, error: "write_failed", detail: error.message };
    const others = ((data as { import_id: string }[] | null) ?? []).filter((r) => r.import_id !== importId);
    if (!others.length) removable.push(path);
  }
  if (removable.length) {
    const removed = await remover.remove(removable);
    if (removed.error) return { ok: false, error: "storage_failed", detail: removed.error.message };
  }
  const { error } = await svc.from("imports").delete().eq("id", importId).eq("owner_id", ownerId);
  if (error) return { ok: false, error: "write_failed", detail: error.message };
  return { ok: true, files: files.length, objectsRemoved: removable.length };
}
