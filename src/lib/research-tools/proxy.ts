import { NextRequest, NextResponse } from "next/server";

export class Rejection {
  constructor(readonly message: string) {}
}

export function reject(message: string): Rejection {
  return new Rejection(message);
}

export function isDemo(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "demo";
}

type Common = {
  tool: string;
  timeoutMs?: number;
};

type JsonTool<B> = Common & {
  prepare?: (body: B) => unknown;
  invalidJson?: "reject" | "empty";
};

type FormTool = Common & {
  prepareForm: (form: FormData | null) => FormData | Rejection;
};

export type ToolRouteConfig<B> = JsonTool<B> | FormTool;

export type ToolRoute = {
  GET: (req: NextRequest) => Promise<NextResponse>;
  POST: (req: NextRequest) => Promise<NextResponse>;
  OPTIONS: () => Promise<NextResponse>;
};

const isForm = <B>(config: ToolRouteConfig<B>): config is FormTool => "prepareForm" in config;

export function toolRoute<B = Record<string, unknown>>(config: ToolRouteConfig<B>): ToolRoute {
  const { tool } = config;
  const form = isForm(config);
  const gatewayUrl = process.env.TOOLS_GATEWAY_URL?.replace(/\/$/, "") ?? "https://research-tools.agfarms.dev";
  const timeoutMs = Number(process.env.TOOLS_GATEWAY_TIMEOUT_MS ?? String(config.timeoutMs ?? 30000));
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "x-bucket-tool": tool,
  };

  const json = (body: unknown, status = 200) =>
    new NextResponse(JSON.stringify(body, null, 2), { status, headers });

  const badRequest = (message: string) => json({ error: { code: "bad_request", message } }, 400);

  const offline = (detail: string) =>
    json(
      {
        error: { code: "tool_offline", message: detail },
        tool,
        hint: "The research tools backend is not reachable right now. Try again shortly.",
      },
      503,
    );

  const gatewayFetch = async (path: string, init: RequestInit, accept: boolean): Promise<Response> => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${gatewayUrl}${path}`, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        headers: {
          ...(accept ? { accept: "application/json" } : {}),
          "x-bucket-proxy": "v1",
          ...(init.headers ?? {}),
        },
      });
    } finally {
      clearTimeout(to);
    }
  };

  const relay = async (resp: Response): Promise<NextResponse> => {
    if (!resp.ok) {
      let err: unknown;
      try {
        err = await resp.json();
      } catch {
        err = { error: { code: "upstream_error", message: `gateway ${resp.status}` } };
      }
      return json(err, resp.status);
    }
    return json(await resp.json(), 200);
  };

  const submitInit = async (req: NextRequest): Promise<RequestInit | NextResponse> => {
    if (isForm(config)) {
      let incoming: FormData | null;
      try {
        incoming = await req.formData();
      } catch {
        incoming = null;
      }
      const out = config.prepareForm(incoming);
      if (out instanceof Rejection) return badRequest(out.message);
      return { method: "POST", body: out };
    }
    let body: B;
    try {
      body = (await req.json()) as B;
    } catch {
      if (config.invalidJson !== "empty") return badRequest("invalid JSON body");
      body = {} as B;
    }
    const payload = config.prepare ? config.prepare(body) : body;
    if (payload instanceof Rejection) return badRequest(payload.message);
    return {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    };
  };

  return {
    async OPTIONS() {
      return new NextResponse(null, { status: 204, headers });
    },

    async POST(req) {
      const init = await submitInit(req);
      if (init instanceof NextResponse) return init;
      let resp: Response;
      try {
        resp = await gatewayFetch(`/v1/${tool}/submit`, init, !form);
      } catch {
        return offline("could not reach the tools gateway (submit)");
      }
      return relay(resp);
    },

    async GET(req) {
      const url = new URL(req.url);
      const jobId = (url.searchParams.get("job") ?? "").trim();
      const wantResult = url.searchParams.get("result") === "1";
      if (!jobId) return badRequest("missing required query param: job");
      const path = wantResult
        ? `/v1/jobs/${encodeURIComponent(jobId)}/result`
        : `/v1/jobs/${encodeURIComponent(jobId)}`;
      let resp: Response;
      try {
        resp = await gatewayFetch(path, {}, true);
      } catch {
        return offline(`could not reach the tools gateway (${wantResult ? "result" : "status"})`);
      }
      return relay(resp);
    },
  };
}
