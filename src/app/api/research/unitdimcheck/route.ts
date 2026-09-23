import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "unitdimcheck",
  prepare: (body) => {
    const op = typeof body.op === "string" ? body.op.trim().toLowerCase() : "";
    if (body.demo === true || op === "demo") return body;
    if (!["convert", "check", "parse"].includes(op)) return reject('op must be "convert", "check", "parse", or use demo');
    if (op === "check" && typeof body.equation !== "string") return reject("check needs an equation (e.g. 'N = kg*m/s^2')");
    if (op === "parse" && typeof body.unit !== "string") return reject("parse needs a unit string");
    if (op === "convert" && (body.value === undefined || typeof body.from !== "string" || typeof body.to !== "string")) {
      return reject("convert needs value, from, and to");
    }
    return body;
  },
});
