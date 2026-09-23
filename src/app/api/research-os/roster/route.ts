import { NextResponse } from "next/server";
import { computeRosterDiff } from "@/lib/research-os/roster/diff";
import { loadRosterExistingState, applyRosterImport } from "@/lib/research-os/roster/apply";
import { OneRosterCsvSource } from "@/lib/research-os/roster/sources";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = ["orgs", "users", "classes", "enrollments"] as const;

async function readCsvField(form: FormData, field: string): Promise<string | null> {
  const value = form.get(field);
  if (value === null) return null;
  if (typeof value === "string") return value;
  return await value.text();
}

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
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
});
