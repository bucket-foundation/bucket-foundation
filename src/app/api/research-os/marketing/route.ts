import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { consentRefusal, requireConsent } from "@/lib/research-os/consent";
import { graphService, verifyLearner } from "@/lib/research-os/db";
import { MAX_TITLE } from "@/lib/research-os/import-types";
import { bucketFrom, listImportFiles, pathConflict, type ImportFileRow } from "@/lib/research-os/import-upload";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";
import { admit } from "@/lib/research-os/marketing/limiter";
import { runAnalyzer } from "@/lib/research-os/marketing/runner";
import { open, parseSealKeys, seal, type SealKeys } from "@/lib/research-os/marketing/seal";
import {
  MAX_MARKETING_FILE_BYTES,
  MAX_MARKETING_FILES,
  MAX_MARKETING_TOTAL_BYTES,
  magicFits,
  marketingExtension,
  mediaTypeFits,
} from "@/lib/research-os/marketing/sniff";
import {
  analyzerVersion,
  createMarketingImport,
  deleteMarketingImport,
  findReport,
  fromBytea,
  inputDigest,
  marketingImport,
  removerFrom,
  saveReport,
  type ReportRow,
} from "@/lib/research-os/marketing/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const NO_STORE = { "cache-control": "private, no-store" };
const MAX_BODY_BYTES = 4 * 1024;

const answer = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: NO_STORE });

const logCode = (code: string) => console.error(`[research-os/marketing] ${code}`);

async function caller(req: NextRequest): Promise<{ ok: true; learnerId: string } | { ok: false; res: NextResponse }> {
  const learnerId = await verifyLearner(req);
  if (!learnerId) return { ok: false, res: answer(401, { error: "unauthorized", message: "Sign in to analyze a file." }) };
  const consent = await requireConsent(learnerId, "workspace_tool");
  if (!consent.allowed) {
    const refusal = consentRefusal(consent);
    return { ok: false, res: answer(refusal.status, refusal.body as unknown as Record<string, unknown>) };
  }
  return { ok: true, learnerId };
}

function keys(): SealKeys | null {
  return parseSealKeys(process.env.MARKETING_SEAL_KEYS);
}

const keyMissing = () => answer(503, { error: "seal_key_missing", message: "Reports are sealed before they are saved, and this server has no sealing key. Nothing was analyzed." });

function unavailable(e: unknown): NextResponse {
  logCode(e instanceof Error && /storage/i.test(e.message) ? "storage_unavailable" : "graph_unavailable");
  return answer(503, { error: "graph_unavailable", message: "The import could not be read." });
}

function opened(k: SealKeys, row: ReportRow, ownerId: string): Record<string, unknown> | null {
  const text = open(k, { keyId: row.key_id, iv: fromBytea(row.iv), ciphertext: fromBytea(row.ciphertext) }, { ownerId, importId: row.import_id, inputDigest: row.input_digest });
  if (text === null) return null;
  return JSON.parse(text) as Record<string, unknown>;
}

function checkFiles(files: ImportFileRow[]): NextResponse | null {
  if (!files.length) return answer(409, { error: "no_files", message: "Attach at least one file before analyzing." });
  if (files.length > MAX_MARKETING_FILES) return answer(413, { error: "too_many_files", message: `One analysis reads at most ${MAX_MARKETING_FILES} files.` });
  let total = 0;
  for (const f of files) {
    const ext = marketingExtension(f.filename ?? "");
    if (!ext || !mediaTypeFits(ext, f.media_type)) return answer(415, { error: "unsupported_type", message: "Marketing analysis reads CSV, TSV, XLSX, JSON, JSONL, Parquet and PDF files." });
    if (f.bytes > MAX_MARKETING_FILE_BYTES) return answer(413, { error: "file_too_large", message: `A file is at most ${MAX_MARKETING_FILE_BYTES / 1024 / 1024} MB for analysis.` });
    total += f.bytes;
  }
  if (total > MAX_MARKETING_TOTAL_BYTES) return answer(413, { error: "files_too_large", message: `One analysis reads at most ${MAX_MARKETING_TOTAL_BYTES / 1024 / 1024} MB in all.` });
  return null;
}

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(text) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function create(ownerId: string, body: Record<string, unknown>): Promise<NextResponse> {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE) return answer(400, { error: "invalid_title", message: `Give the analysis a title of 1 to ${MAX_TITLE} characters.` });
  try {
    const importId = await createMarketingImport(graphService(), ownerId, title);
    return answer(201, { importId });
  } catch (e) {
    return unavailable(e);
  }
}

async function analyze(ownerId: string, importId: string, k: SealKeys): Promise<NextResponse> {
  const svc = graphService();
  let files: ImportFileRow[];
  try {
    const imp = await marketingImport(svc, importId, ownerId);
    if (!imp) return answer(404, { error: "not_found", message: "No marketing import of yours has that id." });
    files = await listImportFiles(svc, importId);
    const bad = checkFiles(files);
    if (bad) return bad;
    for (const f of files) {
      const conflict = await pathConflict(svc, importId, f.storage_path);
      if (conflict) return answer(409, { error: conflict, message: "A file here is also recorded under an import others can read. Remove it from this analysis." });
    }
  } catch (e) {
    return unavailable(e);
  }
  const digest = inputDigest(files);
  const version = analyzerVersion();
  try {
    const existing = await findReport(svc, importId, digest, version);
    if (existing) {
      const report = opened(k, existing, ownerId);
      if (report) return answer(200, { importId, report, repeat: true });
    }
  } catch (e) {
    return unavailable(e);
  }
  const slot = admit(ownerId);
  if (!slot.ok) {
    return slot.error === "busy"
      ? answer(503, { error: "busy", message: "Two analyses are running. Try again in a minute." })
      : answer(429, { error: slot.error, message: slot.error === "owner_busy" ? "Your last analysis is still running." : "You have run 20 analyses in the last hour. Try again later." });
  }
  let dir: string | null = null;
  try {
    dir = await mkdtemp(join(tmpdir(), "bkt-marketing-"));
    const paths: string[] = [];
    const reader = bucketFrom(svc);
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const got = await reader.download(f.storage_path);
      if (got.error || !got.data) {
        logCode("object_missing");
        return answer(409, { error: "object_missing", message: "A recorded file is missing from storage. Upload it again." });
      }
      const bytes = new Uint8Array(await got.data.arrayBuffer());
      if (bytes.length !== f.bytes || createHash("sha256").update(bytes).digest("hex") !== f.sha256) {
        logCode("hash_mismatch");
        return answer(422, { error: "hash_mismatch", message: "A stored file is not the one recorded." });
      }
      const ext = marketingExtension(f.filename ?? "")!;
      if (!magicFits(ext, bytes)) return answer(415, { error: "content_mismatch", message: `A file named .${ext} does not hold ${ext.toUpperCase()} content. Nothing was analyzed.` });
      const path = join(dir, `${i}.${ext}`);
      await writeFile(path, bytes, { mode: 0o600 });
      paths.push(path);
    }
    const run = await runAnalyzer({ files: paths, outDir: join(dir, "out"), names: files.map((f) => f.filename ?? "file") });
    if (!run.ok) {
      logCode(run.error);
      const status = run.error === "analysis_local_only" ? 503 : run.error === "analysis_timeout" ? 504 : 422;
      const message =
        run.error === "analysis_local_only"
          ? "Analysis runs on a local Bucket install or in the desktop app with bkt analyze. This server has no analyzer."
          : run.error === "analysis_timeout"
            ? "The analysis passed its time limit. Try fewer or smaller files."
            : "The files could not be analyzed.";
      return answer(status, { error: run.error, message });
    }
    const plaintext = JSON.stringify(run.report);
    const row = await saveReport(svc, { importId, ownerId, digest, version, sealed: seal(k, plaintext, { ownerId, importId, inputDigest: digest }) });
    const report = opened(k, row, ownerId);
    return answer(201, { importId, report: report ?? run.report, repeat: false });
  } catch (e) {
    return unavailable(e);
  } finally {
    slot.release();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}

async function post(req: NextRequest) {
  const who = await caller(req);
  if (!who.ok) return who.res;
  const body = await readBody(req);
  if (!body) return answer(400, { error: "invalid_request", message: "The body is a small JSON object." });
  if (body.action === "create") return create(who.learnerId, body);
  if (body.action !== "analyze") return answer(400, { error: "invalid_request", message: "The actions are create and analyze." });
  if (typeof body.importId !== "string" || !body.importId) return answer(400, { error: "invalid_request", message: "Name the import." });
  const k = keys();
  if (!k) return keyMissing();
  return analyze(who.learnerId, body.importId, k);
}

async function get(req: NextRequest) {
  const who = await caller(req);
  if (!who.ok) return who.res;
  const importId = new URL(req.url).searchParams.get("import") ?? "";
  if (!importId) return answer(400, { error: "invalid_request", message: "Name the import." });
  const k = keys();
  if (!k) return keyMissing();
  try {
    const svc = graphService();
    if (!(await marketingImport(svc, importId, who.learnerId))) return answer(404, { error: "not_found", message: "No marketing import of yours has that id." });
    const row = await findReport(svc, importId);
    if (!row) return answer(404, { error: "no_report", message: "This import has no saved analysis yet." });
    const report = opened(k, row, who.learnerId);
    if (!report) {
      logCode("seal_open_failed");
      return answer(500, { error: "seal_open_failed", message: "The saved report could not be opened with this server's keys." });
    }
    return answer(200, { importId, report, createdAt: row.created_at });
  } catch (e) {
    return unavailable(e);
  }
}

async function del(req: NextRequest) {
  const who = await caller(req);
  if (!who.ok) return who.res;
  const importId = new URL(req.url).searchParams.get("import") ?? "";
  if (!importId) return answer(400, { error: "invalid_request", message: "Name the import." });
  try {
    const svc = graphService();
    if (!(await marketingImport(svc, importId, who.learnerId))) return answer(404, { error: "not_found", message: "No marketing import of yours has that id." });
    const done = await deleteMarketingImport(svc, removerFrom(svc), importId, who.learnerId);
    if (!done.ok) {
      logCode(done.error);
      return done.error === "storage_failed"
        ? answer(502, { error: "storage_failed", message: "Storage did not delete the files. Nothing else was removed, so deleting again finishes the job." })
        : answer(503, { error: "graph_unavailable", message: "The import could not be deleted." });
    }
    return answer(200, { deleted: true, files: done.files, objectsRemoved: done.objectsRemoved });
  } catch (e) {
    return unavailable(e);
  }
}

export const POST = staffOnlyAtLaunch(post);
export const GET = staffOnlyAtLaunch(get);
export const DELETE = staffOnlyAtLaunch(del);
