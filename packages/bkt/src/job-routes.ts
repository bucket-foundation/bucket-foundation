import { JobError, type JobFile, type JobRunner } from "./jobs";
import type { Route } from "./serve";

export const JOB_BODY_BYTES = 96 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function guard(fn: () => unknown): Response {
  try {
    return json(fn());
  } catch (e) {
    if (e instanceof JobError) return json({ error: e.message }, e.status);
    throw e;
  }
}

export function jobRoutes(runner: JobRunner): Record<string, Route> {
  return {
    "GET /local/jobs": () => json({ kinds: runner.kinds(), jobs: runner.list() }),
    "GET /local/jobs/one": (_req, url) => {
      const job = runner.get(url.searchParams.get("id") ?? "");
      return job ? json(job) : json({ error: "no such job" }, 404);
    },
    "POST /local/jobs": async (req) => {
      const b = await body(req);
      if (!b || typeof b.kind !== "string" || !b.files || typeof b.files !== "object" || Array.isArray(b.files)) return json({ error: "kind and files required" }, 400);
      const files = b.files as Record<string, unknown>;
      const ok = (v: unknown) => typeof v === "string" || (!!v && typeof v === "object" && typeof (v as { text?: unknown }).text === "string" && ["string", "undefined"].includes(typeof (v as { ext?: unknown }).ext));
      if (!Object.values(files).every(ok)) return json({ error: "each file must be text" }, 400);
      const options = b.options && typeof b.options === "object" && !Array.isArray(b.options) ? (b.options as Record<string, unknown>) : {};
      return guard(() => runner.start(b.kind as string, files as Record<string, JobFile>, options));
    },
    "POST /local/jobs/cancel": async (req) => {
      const b = await body(req);
      return typeof b?.id === "string" ? guard(() => runner.cancel(b.id as string)) : json({ error: "id required" }, 400);
    },
    "POST /local/jobs/delete": async (req) => {
      const b = await body(req);
      return typeof b?.id === "string" ? guard(() => (runner.remove(b.id as string), { deleted: b.id })) : json({ error: "id required" }, 400);
    },
  };
}
