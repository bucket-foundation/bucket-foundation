/**
 * /api/research-os/roster, the OneRoster 1.2 CSV roster sync (bkt-ros,
 * ros-06 follow-on named in TEACHER-LAYER.md's own TODO and
 * PLAN-REVISION-2.md section 3 item 4). Reads the four files this
 * importer accepts out of a standard OneRoster bundle -- orgs.csv,
 * users.csv, classes.csv, enrollments.csv (1EdTech OneRoster 1.2 CSV
 * Binding, https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/) --
 * computes a diff against the current graph.classes/class_members/
 * reviewer_candidates/learner_profiles state (src/lib/research-os/
 * roster/diff.ts), and, only when asked, applies it (src/lib/research-os/
 * roster/apply.ts). See ROSTER.md for the full field-mapping table.
 *
 * POST multipart/form-data:
 *   orgs, users, classes, enrollments -- four required file fields, each
 *   the raw CSV text of the file with that name from a OneRoster bulk
 *   export. apply -- optional form field; "true" applies the diff, any
 *   other value (or its absence) leaves the sync a dry run. Dry run is
 *   the default on purpose: a reviewer should see the diff before a
 *   roster's contents ever touch graph.classes or graph.learner_profiles.
 *
 * Response: { diff: RosterDiff, applied: boolean, result?: RosterApplyResult }
 *
 * Auth: Authorization: Bearer <supabase access token>, verified against
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist
 * -- the same gate GET /api/research-os/class uses, on every request,
 * dry run or apply. There is no roster-specific role: the reviewer who
 * runs a sync is whichever allowlisted identity's token is on the
 * request, the same "RESEARCH_OS_REVIEWER_EMAILS is the only real gate"
 * posture reviewer.ts's own header documents.
 *
 * 400 malformed bundle (missing file, unreadable CSV, no usable rows) ·
 * 403 not a reviewer · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { computeRosterDiff } from "@/lib/research-os/roster/diff";
import { configured } from "@/lib/research-os/db";
import { loadRosterExistingState, applyRosterImport } from "@/lib/research-os/roster/apply";
import { OneRosterCsvSource } from "@/lib/research-os/roster/sources";
import { verifyReviewer } from "@/lib/research-os/reviewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const REQUIRED_FIELDS = ["orgs", "users", "classes", "enrollments"] as const;

async function readCsvField(form: FormData, field: string): Promise<string | null> {
  const value = form.get(field);
  if (value === null) return null;
  if (typeof value === "string") return value; // a plain form field also works, not only a File
  return await value.text();
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad(400, "expected multipart/form-data");
  }

  const files: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS) {
    const text = await readCsvField(form, field);
    if (text === null) return bad(400, `missing_field:${field}`);
    files[field] = text;
  }

  const source = new OneRosterCsvSource({
    orgsCsv: files.orgs,
    usersCsv: files.users,
    classesCsv: files.classes,
    enrollmentsCsv: files.enrollments,
  });

  let bundle;
  try {
    bundle = await source.fetchBundle();
  } catch (e) {
    return bad(400, `bundle_parse_failed:${e instanceof Error ? e.message : String(e)}`);
  }

  let existing;
  try {
    existing = await loadRosterExistingState();
  } catch (e) {
    return bad(500, `state_load_failed:${e instanceof Error ? e.message : String(e)}`);
  }

  const diff = computeRosterDiff(bundle, existing);

  const apply = (form.get("apply") ?? "").toString().trim().toLowerCase() === "true";
  if (!apply) {
    return NextResponse.json({ diff, applied: false }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const result = await applyRosterImport(diff);
    return NextResponse.json({ diff, applied: true, result }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return bad(500, `apply_failed:${e instanceof Error ? e.message : String(e)}`);
  }
}
