import { verifyLearnerIdentity } from "@/lib/research-os/db";
import { createClass, joinClass, listMyClasses } from "@/lib/research-os/classes";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none", failed: () => bad(503, "class_read_failed") }, async (req) => {
  const user = await verifyLearnerIdentity(req);
  if (!user) return bad(401, "unauthorized");
  return { classes: await listMyClasses(user.id) };
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const user = await verifyLearnerIdentity(req);
  if (!user) return bad(401, "unauthorized");
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { action?: string; name?: string; code?: string };
  if (body.action === "create") {
    const r = await createClass(user.id, user.email, String(body.name ?? ""));
    return r.ok ? { class: r.value } : bad(r.error === "bad_name" ? 400 : 500, r.error);
  }
  if (body.action === "join") {
    const r = await joinClass(user.id, String(body.code ?? ""));
    return r.ok ? { class: r.value } : bad(r.error === "not_found" ? 404 : r.error === "bad_code" ? 400 : 500, r.error);
  }
  return bad(400, "bad_action");
});
