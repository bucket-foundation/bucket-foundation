import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { NextRequest } from "next/server";

const CHILD = process.env.RESEARCH_TOOLS_ENV_CHILD === "1";
if (!CHILD) {
  delete process.env.TOOLS_GATEWAY_URL;
  delete process.env.TOOLS_GATEWAY_TIMEOUT_MS;
}

const ROOT = path.join(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src/app/api/research");
const GOLDEN = path.join(__dirname, "test-research-tools-routes.golden.json");
const NOT_TOOL_PROXIES = new Set(["atlas", "datasets"]);
const MULTIPART = new Set(["cryotriage", "patchseqml"]);
const BASE = "http://localhost/api/research";

type Handler = (req: NextRequest) => Promise<Response>;
type RouteModule = { GET?: Handler; POST?: Handler; OPTIONS?: () => Promise<Response> };
type Upstream = "ok" | "json-error" | "text-error" | "throw" | "ok-non-json";

type FetchCall = {
  url: string;
  method: string;
  headers: [string, string][];
  body: unknown;
  cache: string | undefined;
  signal: boolean;
};

type Outcome =
  | { threw: true; fetches: FetchCall[]; timeouts: number[] }
  | { status: number; headers: [string, string][]; body: string; fetches: FetchCall[]; timeouts: number[] };

const FIELDS = [
  "z", "force", "radius_nm", "geometry", "sequence", "trace", "fs_hz", "baseline_window_s", "thresh_mad",
  "demo", "treatment", "outcome", "image", "min_distance", "sigma", "paper", "limit", "record", "text",
  "values", "topic", "pam", "guide_len", "current_pa", "dt_ms", "stim_onset_ms", "author", "question",
  "formula", "interests", "since_days", "input", "methods", "title", "claim", "alpha", "items", "papers",
  "k", "smiles", "seq_a", "seq_b", "mode", "mutation", "position", "equation", "durations", "toxin",
  "reference", "deformed", "window", "step", "search", "op", "unit", "value", "from", "to",
];

const fill = (v: unknown) => JSON.stringify(Object.fromEntries(FIELDS.map((f) => [f, v])));

const JSON_BODIES: [string, string | null][] = [
  ["no-body", null],
  ["invalid", "not json"],
  ["null", "null"],
  ["number", "42"],
  ["array", "[]"],
  ["empty", "{}"],
  ["demo-true", JSON.stringify({ demo: true })],
  ["all-demo", fill("demo")],
  ["all-DEMO-padded", fill("  DEMO  ")],
  ["all-x", fill("x")],
  ["all-blank", fill("   ")],
  ["all-long", fill("  ACGTACGTACGTACGTACGTACGTACGTAC  ")],
  ["all-array", fill([1, 2, 3, 4, 5])],
  ["all-short-array", fill([1])],
  ["all-number", fill(7)],
  ["all-zero", fill(0)],
  ["all-object", fill({ a: 1 })],
  ["all-matrix", fill([[1, 2], [3, 4]])],
  ["all-null", fill(null)],
  ["all-true", fill(true)],
  ["op-convert", JSON.stringify({ op: "Convert", value: 1, from: "m", to: "km" })],
  ["op-convert-missing", JSON.stringify({ op: "convert", value: 1 })],
  ["op-check", JSON.stringify({ op: "check", equation: "N = kg*m/s^2" })],
  ["op-check-missing", JSON.stringify({ op: "check" })],
  ["op-parse", JSON.stringify({ op: "parse", unit: "m/s" })],
  ["op-parse-missing", JSON.stringify({ op: "parse" })],
  ["op-demo", JSON.stringify({ op: " DEMO " })],
  ["op-bad", JSON.stringify({ op: "nope" })],
  ["stab-scan", JSON.stringify({ sequence: "ACDEFGHIK", mode: "scan" })],
  ["stab-scan-pos", JSON.stringify({ sequence: "ACDEFGHIK", mode: "scan", position: 3 })],
  ["stab-predict", JSON.stringify({ sequence: " ACDEFGHIK ", mutation: " A2V " })],
  ["stab-short", JSON.stringify({ sequence: "AC-1", mutation: "A2V" })],
  ["afm-cone", JSON.stringify({ z: "demo", geometry: "cone" })],
  ["afm-bad-geometry", JSON.stringify({ z: "demo", geometry: "cube" })],
  ["afm-arrays", JSON.stringify({ z: [1, 2], force: [3, 4], radius_nm: 50 })],
  ["afm-no-force", JSON.stringify({ z: [1, 2] })],
  ["traction", JSON.stringify({ reference: [[1]], deformed: [[2]], window: 4 })],
  ["replicheck", JSON.stringify({ text: "t(12) = 2.1, p = .04", alpha: 0.01, items: "3" })],
  ["reviewguard", JSON.stringify({ claim: "coffee reduces risk", papers: [" 10.1/x ", "", 5, null], limit: 3 })],
  ["reviewguard-many", JSON.stringify({ claim: "coffee reduces risk", papers: Array.from({ length: 30 }, (_, i) => `p${i}`) })],
  ["protocol-title-blank", JSON.stringify({ methods: "Incubate cells at 37 C for 2 h", title: "   " })],
  ["protocol-title", JSON.stringify({ methods: "Incubate cells at 37 C for 2 h", title: " SOP " })],
  ["grna-pam-blank", JSON.stringify({ sequence: "ACGTACGTACGTACGTACGTACGTAC", pam: "  " })],
  ["grna-pam", JSON.stringify({ sequence: "ACGTACGTACGTACGTACGTACGTAC", pam: " NAG ", guide_len: 18, limit: 2 })],
  ["labbrain", JSON.stringify({ author: " Ada ", question: " What is life? " })],
  ["labbrain-short", JSON.stringify({ author: "Ada", question: "Why" })],
  ["seqalign-one", JSON.stringify({ seq_a: "ACGT" })],
  ["seqalign-two", JSON.stringify({ seq_a: "ACGT", seq_b: "AGGT", mode: "local" })],
  ["survival", JSON.stringify({ durations: [1, 2], events: [1, 0] })],
  ["survival-short", JSON.stringify({ durations: [1] })],
  ["forecast-short", JSON.stringify({ values: [1, 2, 3] })],
  ["trajmine-blank", JSON.stringify({ demo: "  " })],
  ["trajmine-named", JSON.stringify({ demo: " ala " })],
  ["faircheck-array", JSON.stringify({ record: [1, 2] })],
  ["faircheck-str", JSON.stringify({ record: "{}" })],
  ["mlrepro-str1", JSON.stringify({ record: "x" })],
];

type FormCase = [string, (() => BodyInit) | null, Record<string, string>?];

const FORM_BODIES: FormCase[] = [
  ["no-body", null],
  ["json-body", () => JSON.stringify({ file: "x" }), { "content-type": "application/json" }],
  ["empty-form", () => new FormData()],
  [
    "file-and-mode",
    () => {
      const f = new FormData();
      f.append("file", new File([new Uint8Array([1, 2, 3])], "trace.abf", { type: "application/octet-stream" }));
      f.append("mode", "file");
      return f;
    },
  ],
  [
    "unnamed-file",
    () => {
      const f = new FormData();
      f.append("file", new Blob([new Uint8Array([9, 9])]));
      return f;
    },
  ],
  [
    "empty-file",
    () => {
      const f = new FormData();
      f.append("file", new File([], "empty.png"));
      f.append("mode", "sim");
      return f;
    },
  ],
  [
    "string-file",
    () => {
      const f = new FormData();
      f.append("file", "not a file");
      f.append("extra", "dropped");
      return f;
    },
  ],
];

const GET_QUERIES: [string, string][] = [
  ["none", ""],
  ["blank", "?job=%20%20"],
  ["status", "?job=abc"],
  ["padded", "?job=%20a%20b%2Fc%20"],
  ["result", "?job=abc&result=1"],
  ["result-other", "?job=abc&result=true"],
];

const UPSTREAMS: Upstream[] = ["ok", "json-error", "text-error", "throw", "ok-non-json"];

async function describeBody(body: BodyInit | null | undefined): Promise<unknown> {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return body;
  if (body instanceof FormData) {
    const out: unknown[] = [];
    for (const [k, v] of Array.from(body.entries())) {
      if (typeof v === "string") out.push([k, v]);
      else out.push([k, { name: v.name, size: v.size, type: v.type, bytes: Array.from(new Uint8Array(await v.arrayBuffer())) }]);
    }
    return { form: out };
  }
  return { unknown: Object.prototype.toString.call(body) };
}

function respond(kind: Upstream): Response {
  switch (kind) {
    case "ok":
      return new Response(JSON.stringify({ job_id: "j1", status: "queued" }), { status: 202, headers: { "content-type": "application/json", "x-up": "1" } });
    case "json-error":
      return new Response(JSON.stringify({ error: { code: "invalid", message: "nope" } }), { status: 422 });
    case "text-error":
      return new Response("<html>bad gateway</html>", { status: 502 });
    case "ok-non-json":
      return new Response("plain", { status: 200 });
    case "throw":
      throw new Error("unreachable");
  }
}

async function run(call: () => Promise<Response>, upstream: Upstream): Promise<Outcome> {
  const fetches: FetchCall[] = [];
  const timeouts: number[] = [];
  const realFetch = globalThis.fetch;
  const realSetTimeout = globalThis.setTimeout;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    fetches.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: Array.from(new Headers(init.headers).entries()).sort(),
      body: await describeBody(init.body),
      cache: init.cache,
      signal: init.signal instanceof AbortSignal,
    });
    return respond(upstream);
  }) as typeof fetch;
  globalThis.setTimeout = ((fn: () => void, ms?: number) => {
    timeouts.push(ms ?? 0);
    return realSetTimeout(fn, ms);
  }) as typeof setTimeout;
  try {
    const res = await call();
    return {
      status: res.status,
      headers: Array.from(res.headers.entries()).sort(),
      body: res.body === null ? "" : await res.text(),
      fetches,
      timeouts,
    };
  } catch {
    return { threw: true, fetches, timeouts };
  } finally {
    globalThis.fetch = realFetch;
    globalThis.setTimeout = realSetTimeout;
  }
}

function post(tool: string, body: BodyInit | null, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${BASE}/${tool}`, body === null ? { method: "POST" } : { method: "POST", body, headers });
}

async function record(tool: string, mod: RouteModule): Promise<Record<string, Outcome>> {
  const out: Record<string, Outcome> = {};
  const { GET, POST, OPTIONS } = mod;
  assert.ok(GET && POST && OPTIONS, `${tool} exports GET, POST, OPTIONS`);
  out["OPTIONS"] = await run(() => OPTIONS(), "ok");
  let submit: (() => NextRequest) | null = null;
  if (MULTIPART.has(tool)) {
    for (const [name, make, headers] of FORM_BODIES) {
      const build = () => post(tool, make ? make() : null, headers);
      const o = await run(() => POST(build()), "ok");
      out[`POST ${name}`] = o;
      if (!submit && o.fetches.length > 0) submit = build;
    }
  } else {
    for (const [name, raw] of JSON_BODIES) {
      const build = () => post(tool, raw, { "content-type": "application/json" });
      const o = await run(() => POST(build()), "ok");
      out[`POST ${name}`] = o;
      if (!submit && o.fetches.length > 0) submit = build;
    }
  }
  assert.ok(submit, `${tool}: some body reaches the gateway`);
  for (const up of UPSTREAMS) {
    const build = submit;
    out[`POST upstream ${up}`] = await run(() => POST(build()), up);
  }
  for (const [name, q] of GET_QUERIES) {
    out[`GET ${name}`] = await run(() => GET(new NextRequest(`${BASE}/${tool}${q}`)), "ok");
  }
  for (const up of UPSTREAMS) {
    out[`GET status upstream ${up}`] = await run(() => GET(new NextRequest(`${BASE}/${tool}?job=j1`)), up);
    out[`GET result upstream ${up}`] = await run(() => GET(new NextRequest(`${BASE}/${tool}?job=j1&result=1`)), up);
  }
  return out;
}

function tools(): string[] {
  return fs
    .readdirSync(ROUTES_DIR)
    .filter((d) => fs.existsSync(path.join(ROUTES_DIR, d, "route.ts")) && !NOT_TOOL_PROXIES.has(d))
    .sort();
}

function load(tool: string): RouteModule {
  return module.require(path.join(ROUTES_DIR, tool, "route.ts")) as RouteModule;
}

const ENV_CASES = new Set(["OPTIONS", "POST upstream ok", "GET status upstream ok", "GET result upstream ok"]);

const normalize = (tool: string, o: Outcome) => JSON.stringify(o).split(tool).join("{tool}");

async function recordEnvCases(): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};
  for (const tool of tools()) {
    const got = await record(tool, load(tool));
    out[tool] = Object.fromEntries(
      Object.entries(got)
        .filter(([k]) => ENV_CASES.has(k))
        .map(([k, v]) => [k, normalize(tool, v)]),
    );
  }
  return out;
}

function runEnvChild(): Record<string, Record<string, string>> {
  const run = spawnSync(
    process.execPath,
    [
      require.resolve("ts-node/dist/bin"),
      "-r",
      "tsconfig-paths/register",
      "--compiler-options",
      JSON.stringify({ module: "commonjs", baseUrl: "." }),
      __filename,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        RESEARCH_TOOLS_ENV_CHILD: "1",
        RECORD_GOLDEN: "",
        TS_NODE_BASEURL: "./",
        TOOLS_GATEWAY_URL: "https://gw.test/",
        TOOLS_GATEWAY_TIMEOUT_MS: "1234",
      },
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const line = run.stdout.split("\n").find((l) => l.startsWith("ENV_RESULT "));
  assert.ok(line, `child printed no result: ${run.stdout.slice(0, 500)} ${run.stderr.slice(0, 500)}`);
  return JSON.parse(line.slice("ENV_RESULT ".length)) as Record<string, Record<string, string>>;
}

type Golden = {
  outcomes: string[];
  routes: Record<string, Record<string, number>>;
  env: Record<string, Record<string, number>>;
};

const RECORDING = process.env.RECORD_GOLDEN === "1";
const recorded: Record<string, Record<string, string>> = {};
let recordedEnv: Record<string, Record<string, string>> = {};

if (CHILD) {
  recordEnvCases().then(
    (r) => {
      process.stdout.write(`ENV_RESULT ${JSON.stringify(r)}\n`);
    },
    (e: unknown) => {
      process.stderr.write(String(e));
      process.exit(1);
    },
  );
} else {
  const golden: Golden = RECORDING
    ? { outcomes: [], routes: {}, env: {} }
    : (JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Golden);

  const expect = (want: Record<string, number>, got: Record<string, string>, label: string) => {
    assert.deepEqual(Object.keys(got), Object.keys(want), label);
    for (const [key, index] of Object.entries(want)) {
      assert.deepEqual(JSON.parse(got[key]), JSON.parse(golden.outcomes[index]), `${label} ${key}`);
    }
  };

  test("every tool route directory has a recorded contract", () => {
    if (RECORDING) return;
    assert.deepEqual(tools(), Object.keys(golden.routes).sort());
  });

  for (const tool of tools()) {
    test(`${tool} keeps its request and response contract`, async () => {
      const mod = load(tool);
      assert.equal((mod as Record<string, unknown>).runtime, "nodejs");
      assert.equal((mod as Record<string, unknown>).dynamic, "force-dynamic");
      const got = await record(tool, mod);
      const cases = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, normalize(tool, v)]));
      if (RECORDING) {
        recorded[tool] = cases;
        return;
      }
      assert.ok(golden.routes[tool], `${tool} missing from golden`);
      expect(golden.routes[tool], cases, tool);
    });
  }

  test("a fresh process reads the gateway URL and timeout from env at module load", () => {
    const got = runEnvChild();
    if (RECORDING) {
      recordedEnv = got;
      return;
    }
    assert.deepEqual(Object.keys(got).sort(), Object.keys(golden.env).sort());
    for (const tool of Object.keys(golden.env)) expect(golden.env[tool], got[tool], `env ${tool}`);
  });

  test.after(() => {
    if (!RECORDING) return;
    const outcomes: string[] = [];
    const seen = new Map<string, number>();
    const index = (source: Record<string, Record<string, string>>) => {
      const out: Record<string, Record<string, number>> = {};
      for (const tool of Object.keys(source).sort()) {
        out[tool] = {};
        for (const [key, value] of Object.entries(source[tool])) {
          let i = seen.get(value);
          if (i === undefined) {
            i = outcomes.push(value) - 1;
            seen.set(value, i);
          }
          out[tool][key] = i;
        }
      }
      return out;
    };
    const routes = index(recorded);
    const env = index(recordedEnv);
    const section = (m: Record<string, Record<string, number>>) =>
      Object.keys(m).map((t) => `    ${JSON.stringify(t)}: ${JSON.stringify(m[t])}`).join(",\n");
    const out = [
      "{",
      '  "outcomes": [',
      outcomes.map((o) => `    ${JSON.stringify(o)}`).join(",\n"),
      "  ],",
      '  "routes": {',
      section(routes),
      "  },",
      '  "env": {',
      section(env),
      "  }",
      "}",
    ];
    fs.writeFileSync(GOLDEN, `${out.join("\n")}\n`);
  });
}
