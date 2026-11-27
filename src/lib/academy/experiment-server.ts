import { assignArm, EXPERIMENT_ID, parseEnrolment, type Enrolment, type Stratum } from "./input-experiment";
import type { GateReason } from "./events-server";

export interface ExperimentDeps {
  configured: () => boolean;
  verifyUser: (req: Request) => Promise<string | null>;
  gate: (userId: string) => Promise<"ok" | GateReason | null>;
  load: (userId: string, experiment: string) => Promise<Enrolment | null | undefined>;
  insertFirst: (userId: string, e: Enrolment) => Promise<Enrolment | null>;
  now: () => number;
}

const HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

export function createExperimentHandlers(deps: ExperimentDeps) {
  async function user(req: Request): Promise<string | Response> {
    if (!deps.configured()) return json({ error: "not_configured" }, 503);
    const id = await deps.verifyUser(req);
    return id ?? json({ error: "unauthorized" }, 401);
  }

  return {
    async GET(req: Request): Promise<Response> {
      const u = await user(req);
      if (typeof u !== "string") return u;
      const e = await deps.load(u, EXPERIMENT_ID);
      if (e === undefined) return json({ error: "store" }, 502);
      return json({ enrolment: e });
    },

    async POST(req: Request): Promise<Response> {
      const u = await user(req);
      if (typeof u !== "string") return u;
      let body: { experiment?: unknown; stratum?: unknown } | null;
      try {
        body = (await req.json()) as { experiment?: unknown; stratum?: unknown } | null;
      } catch {
        return json({ error: "bad_json" }, 400);
      }
      if (body?.experiment !== EXPERIMENT_ID || (body.stratum !== "to-a2" && body.stratum !== "past-a2")) return json({ error: "bad_request" }, 400);
      const gate = await deps.gate(u);
      if (gate === null) return json({ error: "store" }, 502);
      if (gate !== "ok") return json({ error: gate }, 403);
      const existing = await deps.load(u, EXPERIMENT_ID);
      if (existing === undefined) return json({ error: "store" }, 502);
      if (existing) return json({ enrolment: existing });
      const key = `acct:${u}`;
      const fresh: Enrolment = { experiment: EXPERIMENT_ID, key, arm: assignArm(key), stratum: body.stratum as Stratum, at: deps.now() };
      const stored = await deps.insertFirst(u, fresh);
      return stored ? json({ enrolment: stored }, 201) : json({ error: "store" }, 502);
    },
  };
}

export function rowToEnrolment(row: { experiment: string; unit: string; arm: string; stratum: string; enrolled_at: string | number } | null): Enrolment | null {
  if (!row) return null;
  const at = typeof row.enrolled_at === "number" ? row.enrolled_at : Date.parse(row.enrolled_at);
  return parseEnrolment({ experiment: row.experiment, key: row.unit, arm: row.arm, stratum: row.stratum, at });
}
