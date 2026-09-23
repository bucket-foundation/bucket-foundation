import { NextResponse, type NextRequest } from "next/server";
import { consentRefusal, requireConsent, type ConsentAction } from "./consent";
import { configured, verifyLearner } from "./db";

export const NO_STORE = { headers: { "cache-control": "no-store" } } as const;

export type Body = Record<string, unknown>;

export function withNoStore(res: Response): Response {
  const current = res.headers.get("cache-control");
  if (!current || !/(^|,)\s*no-store\s*(,|$)/i.test(current)) res.headers.set("cache-control", "no-store");
  return res;
}

export function ok(body: Body | unknown[], status = 200): NextResponse {
  return NextResponse.json(body, { status, ...NO_STORE });
}

export function bad(status: number, error: string, extra?: Body): NextResponse {
  return NextResponse.json({ error, ...(extra ?? {}) }, { status, ...NO_STORE });
}

export type JsonRead<T> = { ok: true; value: T } | { ok: false; res: NextResponse };

export async function readJson<T = Body>(req: NextRequest, error = "bad_json"): Promise<JsonRead<T>> {
  let value: unknown;
  try {
    value = await req.json();
  } catch {
    return { ok: false, res: bad(400, error) };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { ok: false, res: bad(400, error) };
  return { ok: true, value: value as T };
}

type Refusals = {
  unavailable?: Response | (() => Response);
  unauthorized?: Response | (() => Response);
  failed?: (err: unknown) => Response;
};

export type RouteOptions =
  | ({ auth: "none"; consent?: never } & Refusals)
  | ({ auth: "optional"; consent?: never } & Refusals)
  | ({ auth: "required"; consent?: ConsentAction } & Refusals);

export type RouteContext<O extends RouteOptions> = O extends { auth: "required" }
  ? { learnerId: string }
  : O extends { auth: "optional" }
    ? { learnerId: string | null }
    : { learnerId?: undefined };

type Result = Response | Body | unknown[];
type Handler<O extends RouteOptions, P> = (req: NextRequest, ctx: RouteContext<O>, params: P) => Promise<Result> | Result;

function refusal(r: Response | (() => Response) | undefined, fallback: () => Response): Response {
  if (!r) return fallback();
  return withNoStore(typeof r === "function" ? r() : r.clone());
}

export function withResearchOsRoute<O extends RouteOptions, P = unknown>(options: O, handler: Handler<O, P>) {
  return async (req: NextRequest, params: P): Promise<Response> => {
    if (!configured()) return refusal(options.unavailable, () => bad(503, "research_os_unavailable"));
    try {
      let learnerId: string | null = null;
      if (options.auth !== "none") {
        learnerId = await verifyLearner(req);
        if (!learnerId && options.auth === "required") return refusal(options.unauthorized, () => bad(401, "unauthorized"));
      }
      if (options.auth === "required" && options.consent && learnerId) {
        const consent = await requireConsent(learnerId, options.consent);
        if (!consent.allowed) {
          const r = consentRefusal(consent);
          return NextResponse.json(r.body, { status: r.status, ...NO_STORE });
        }
      }
      const ctx = (options.auth === "none" ? {} : { learnerId }) as RouteContext<O>;
      const out = await handler(req, ctx, params);
      return out instanceof Response ? withNoStore(out) : ok(out);
    } catch (err) {
      console.error(`[research-os] ${req.method} ${new URL(req.url).pathname} failed:`, err instanceof Error ? err.message : String(err));
      return options.failed ? withNoStore(options.failed(err)) : bad(503, "research_os_unavailable");
    }
  };
}
