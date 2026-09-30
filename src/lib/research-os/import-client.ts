import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_BUCKET, sha256Hex, storagePathFor } from "./import-storage";
import { detectType } from "./import-types";
import { isTransientOutage, OUTAGE_COPY } from "./outage";

export type UploadStage = "hashing" | "uploading" | "recording";

export type UploadOutcome =
  | { ok: true; sha256: string; already: boolean; nodeSlug: string | null }
  | { ok: false; sha256: string | null; message: string; error?: string };

export function uploadRefusal(message: string): string {
  if (/import quota/i.test(message)) {
    return `${message}. Every file you have imported counts toward it, so remove an import you no longer need and the room comes back.`;
  }
  if (/row-level security|not authorized|unauthorized/i.test(message)) {
    return "Storage refused this file for this account. Sign in again, and if it keeps happening the file is being written under a path that is not yours.";
  }
  return message;
}

export async function uploadAndAttach(args: {
  supabase: SupabaseClient;
  ownerId: string;
  importId: string;
  file: File;
  headers: Record<string, string>;
  onStage?: (stage: UploadStage, sha256: string | null) => void;
}): Promise<UploadOutcome> {
  const { supabase, ownerId, importId, file, headers, onStage } = args;
  onStage?.("hashing", null);
  const sha256 = await sha256Hex(new Uint8Array(await file.arrayBuffer()));
  const path = storagePathFor(ownerId, sha256);
  if (!path.ok) return { ok: false, sha256, message: "This file could not be named for storage." };
  const detected = detectType(file.name, file.type);
  onStage?.("uploading", sha256);
  const upload = await supabase.storage.from(IMPORT_BUCKET).upload(path.value, file, { upsert: false, contentType: detected.mediaType });
  const already = Boolean(upload.error && /exists/i.test(upload.error.message));
  if (upload.error && !already) return { ok: false, sha256, message: uploadRefusal(upload.error.message) };
  onStage?.("recording", sha256);
  const attached = await fetch("/api/research-os/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "attach", importId, filename: file.name, mediaType: detected.mediaType, bytes: file.size, sha256 }),
  });
  if (!attached.ok) {
    const body = (await attached.json().catch(() => null)) as { message?: string; error?: string } | null;
    const retryable = isTransientOutage(attached.status, body?.error ?? null);
    return {
      ok: false,
      sha256,
      error: body?.error,
      message: retryable ? `${OUTAGE_COPY.body} The file is uploaded, so importing it again records it.` : (body?.message ?? `The file could not be recorded (${attached.status}).`),
    };
  }
  const body = (await attached.json().catch(() => null)) as { nodeSlug?: string | null } | null;
  return { ok: true, sha256, already, nodeSlug: body?.nodeSlug ?? null };
}
