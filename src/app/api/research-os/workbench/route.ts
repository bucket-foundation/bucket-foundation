import type { NextRequest } from "next/server";
import { verifyLearnerIdentity } from "@/lib/research-os/db";
import { launchNotFound, staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";
import { isReviewerEmail } from "@/lib/research-os/reviewer";
import { bad, readAnyJson, withNoStore } from "@/lib/research-os/route";
import { parseSigningKeys, parseWorkbenchRequest, signWorkbenchRequest, workbenchRole } from "@/lib/research-os/workbench";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 10_000;

async function post(req: NextRequest): Promise<Response> {
  const base = (process.env.WORKBENCH_URL || "").replace(/\/+$/, "");
  if (!base) return bad(503, "workbench_not_configured");
  const identity = await verifyLearnerIdentity(req);
  const role = workbenchRole(identity?.email, isReviewerEmail, process.env.BUCKET_FOUNDER_EMAIL);
  if (!identity?.email || !role) return launchNotFound();
  let keys: string[];
  try {
    keys = parseSigningKeys(process.env.WORKBENCH_SIGNING_KEYS);
  } catch {
    return bad(503, "workbench_misconfigured");
  }
  if (keys.length === 0) return bad(503, "workbench_misconfigured");
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const parsed = parseWorkbenchRequest(read.value);
  if (!parsed) return bad(400, "bad_request");
  const { body, signature } = signWorkbenchRequest(identity.email, role, parsed, keys[0]);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/${parsed.action}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-workbench-signature": signature },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    return withNoStore(new Response(text, { status: res.status, headers: { "content-type": "application/json" } }));
  } catch (e: unknown) {
    const name = (e as { name?: string }).name;
    return bad(name === "AbortError" ? 504 : 502, name === "AbortError" ? "workbench_timeout" : "workbench_unreachable");
  } finally {
    clearTimeout(timer);
  }
}

export const POST = staffOnlyAtLaunch(post);
