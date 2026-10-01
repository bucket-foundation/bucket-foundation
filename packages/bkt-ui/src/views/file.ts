export const MAX_FILE_BYTES = 16 * 1024 * 1024;

export const FILE_UNREADABLE = "Bucket could not read that file.";

export async function readJsonFile(f: File | undefined): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  if (!f) return { ok: false, error: "No file chosen." };
  if (f.size > MAX_FILE_BYTES) return { ok: false, error: "That file is larger than 16 MB." };
  try {
    return { ok: true, value: JSON.parse(await f.text()) };
  } catch {
    return { ok: false, error: FILE_UNREADABLE };
  }
}
