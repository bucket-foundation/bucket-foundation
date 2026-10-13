import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { MODULE_KINDS, generateModule, generateModules, type ModuleKind } from "@/lib/research-os/modules/generate";
import { loadModuleContext } from "@/lib/research-os/modules/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export const GET = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  const params = new URL(req.url).searchParams;
  const slug = (params.get("node") || "").trim();
  if (!SLUG.test(slug)) return bad(400, "node_required");
  const kindParam = params.get("kind");
  if (kindParam && !(MODULE_KINDS as readonly string[]).includes(kindParam)) return bad(400, "bad_kind");
  const read = await loadModuleContext(slug, learnerId);
  if (!read.ok) return read.reason === "not_found" ? bad(404, "node_not_found") : bad(503, "graph_read_failed");
  const modules = kindParam ? [generateModule(read.ctx, kindParam as ModuleKind)] : generateModules(read.ctx);
  return { node: { id: read.ctx.node.id, slug: read.ctx.node.slug, title: read.ctx.node.title }, modules };
});
