export const BRONZE_ROOTS = ["_intake/", "bucket-canon/", "learning/app/corpus/", "supabase/seed/", "canon-figures/", "src/data/", "archaeology/"] as const;

export const MAX_REPO_PATH = 512;

export type PathRefusal = "empty" | "too_long" | "absolute" | "home" | "backslash" | "dot_segment" | "double_slash" | "control" | "outside_roots";

export type PathCheck = { ok: true; path: string } | { ok: false; error: PathRefusal };

export function checkRepoPath(raw: string): PathCheck {
  if (typeof raw !== "string" || raw.length === 0) return { ok: false, error: "empty" };
  if (raw.length > MAX_REPO_PATH) return { ok: false, error: "too_long" };
  if (raw.startsWith("/")) return { ok: false, error: "absolute" };
  if (raw.startsWith("~")) return { ok: false, error: "home" };
  if (raw.includes("\\")) return { ok: false, error: "backslash" };
  if (Array.from(raw).some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)) return { ok: false, error: "control" };
  if (raw.split("/").some((seg) => seg === "." || seg === "..")) return { ok: false, error: "dot_segment" };
  if (raw.includes("//")) return { ok: false, error: "double_slash" };
  if (!BRONZE_ROOTS.some((root) => raw.startsWith(root))) return { ok: false, error: "outside_roots" };
  return { ok: true, path: raw };
}

const TRANSCRIPT_PATHS = [/^bucket-canon\/[^/]+\/sub-claims\//, /^_intake\/embeddings-v2\/clusters\.json$/, /(^|\/)yt\/[^/]+\/transcript\.[a-z]+$/];

export function isTranscriptPath(repoPath: string): boolean {
  return TRANSCRIPT_PATHS.some((re) => re.test(repoPath));
}
