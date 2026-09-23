/**
 * The import upload route (ros-import 2).
 *
 * `POST { action: "attach" }` records one uploaded file against an import
 * the caller owns. The browser hashes the file, uploads it to
 * `<owner>/<sha256>` under its own session, and calls this; the route
 * reads the object back, hashes it, and writes the row when the bytes
 * are the ones the path names. Nothing here uploads, and nothing trusts
 * the client's hash.
 *
 * `GET ?import=<id>` lists the files of an import the caller owns.
 *
 * The import itself is created by `/api/research-os/access` with
 * `{ action: "import" }`, which writes the private node beside it.
 */
import { NextRequest, NextResponse } from "next/server";
import { consentRefusal, requireConsent } from "@/lib/research-os/consent";
import { graphService, verifyLearner } from "@/lib/research-os/db";
import { validateImportFile, MAX_IMPORT_BYTES } from "@/lib/research-os/import-storage";
import { detectType, validateFilename } from "@/lib/research-os/import-types";
import { bucketFrom, listImportFiles, ownedImport, recordImportFile, verifyUpload } from "@/lib/research-os/import-upload";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };
const MAX_BODY_BYTES = 8 * 1024;

const answer = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: NO_STORE });

async function caller(req: NextRequest): Promise<{ ok: true; learnerId: string } | { ok: false; res: NextResponse }> {
  const learnerId = await verifyLearner(req);
  if (!learnerId) return { ok: false, res: answer(401, { error: "unauthorized", message: "Sign in to import a file." }) };
  const consent = await requireConsent(learnerId, "workspace_tool");
  if (!consent.allowed) {
    const refusal = consentRefusal(consent);
    return { ok: false, res: answer(refusal.status, refusal.body as unknown as Record<string, unknown>) };
  }
  return { ok: true, learnerId };
}

function graphUnavailable(e: unknown): NextResponse {
  console.error("[research-os/import] graph read failed:", e instanceof Error ? e.message : String(e));
  return answer(503, { error: "graph_unavailable", message: "The graph could not be read." });
}

export async function GET(req: NextRequest) {
  const who = await caller(req);
  if (!who.ok) return who.res;
  const importId = new URL(req.url).searchParams.get("import") ?? "";
  if (!importId) return answer(400, { error: "invalid_request", message: "Name the import." });
  try {
    const imp = await ownedImport(graphService(), importId, who.learnerId);
    if (!imp) return answer(404, { error: "not_found", message: "No import of yours has that id." });
    const files = await listImportFiles(graphService(), importId);
    return answer(200, { importId, files: files.map(shape) });
  } catch (e) {
    return graphUnavailable(e);
  }
}

const shape = (row: { sha256: string; bytes: number; media_type: string; filename: string | null; storage_path: string; created_at: string }) => ({
  sha256: row.sha256,
  bytes: row.bytes,
  mediaType: row.media_type,
  filename: row.filename,
  storagePath: row.storage_path,
  createdAt: row.created_at,
  structured: detectType(row.filename ?? "", row.media_type).structured,
});

interface AttachBody {
  action?: unknown;
  importId?: unknown;
  filename?: unknown;
  mediaType?: unknown;
  bytes?: unknown;
  sha256?: unknown;
}

export async function POST(req: NextRequest) {
  const who = await caller(req);
  if (!who.ok) return who.res;

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return answer(413, { error: "too_large", message: `The request is at most ${MAX_BODY_BYTES} bytes. The file goes to storage, never through this route.` });
  }
  let body: AttachBody;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return answer(413, { error: "too_large", message: "The request is too large." });
    body = JSON.parse(text) as AttachBody;
  } catch {
    return answer(400, { error: "invalid_request", message: "The body is JSON." });
  }
  if (body?.action !== "attach") return answer(400, { error: "invalid_request", message: "The only action is attach." });
  if (typeof body.importId !== "string" || !body.importId) return answer(400, { error: "invalid_request", message: "Name the import." });

  const filename = validateFilename(body.filename);
  if (!filename.ok) return answer(400, { error: filename.error, message: "The file needs a name of 1 to 255 characters." });
  const detected = detectType(filename.value, typeof body.mediaType === "string" ? body.mediaType : null);
  const record = validateImportFile({
    ownerId: who.learnerId,
    sha256: typeof body.sha256 === "string" ? body.sha256 : "",
    bytes: typeof body.bytes === "number" ? body.bytes : Number.NaN,
    mediaType: detected.mediaType,
    filename: filename.value,
  });
  if (!record.ok) {
    const message =
      record.error === "bytes_out_of_range"
        ? `A file is 1 byte to ${MAX_IMPORT_BYTES} bytes.`
        : record.error === "sha256_not_hex"
          ? "The hash is 64 lowercase hex characters."
          : "That file cannot be recorded.";
    return answer(400, { error: record.error, message });
  }

  try {
    const svc = graphService();
    const imp = await ownedImport(svc, body.importId, who.learnerId);
    if (!imp) return answer(404, { error: "not_found", message: "No import of yours has that id." });

    const verified = await verifyUpload(bucketFrom(svc), record.value);
    if (!verified.ok) {
      const status = verified.error === "object_missing" ? 409 : verified.error === "storage_unavailable" ? 503 : 422;
      const message =
        verified.error === "object_missing"
          ? "Upload the file to storage before recording it."
          : verified.error === "storage_unavailable"
            ? "Storage could not be read; nothing was recorded."
            : "The stored bytes are not the ones this request describes.";
      return answer(status, { error: verified.error, message });
    }

    const written = await recordImportFile(svc, body.importId, record.value);
    if (!written.ok) {
      return answer(written.error === "import_not_found" ? 404 : 500, { error: written.error, message: "The file could not be recorded." });
    }
    return answer(written.repeat ? 200 : 201, {
      file: { ...shape(written.value), structured: detected.structured, extractable: detected.extractable },
      repeat: written.repeat,
      nodeId: imp.nodeId,
      nodeSlug: imp.nodeSlug,
    });
  } catch (e) {
    return graphUnavailable(e);
  }
}
