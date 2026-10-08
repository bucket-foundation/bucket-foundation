import type { PatentsDesign } from "./patents-design";
import type { PrimesReport } from "./primes-report-types";
import type { SoftwareAtlasData } from "./software-atlas";
import type { SolvabilityAtlasData } from "./solvability-atlas";

export interface RosPayloads {
  solvability: SolvabilityAtlasData;
  software: SoftwareAtlasData;
  patents: PatentsDesign;
  primes: PrimesReport;
}

export type RosResource = keyof RosPayloads;

export const ROS_RESOURCES: RosResource[] = ["solvability", "software", "patents", "primes"];

export const ROS_PATHS: Record<RosResource, { web: string; local: string }> = {
  solvability: { web: "/api/research-os/atlas/solvability", local: "/local/ros/solvability" },
  software: { web: "/api/research-os/atlas/software", local: "/local/ros/software" },
  patents: { web: "/api/research-os/atlas/patents", local: "/local/ros/patents" },
  primes: { web: "/api/research-os/primes-report", local: "/local/ros/primes" },
};

export class ContractError extends Error {
  constructor(
    readonly resource: RosResource,
    readonly path: string,
  ) {
    super(`${resource} payload breaks the contract at ${path}`);
  }
}

type Check = (v: unknown) => boolean;

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str: Check = (v) => typeof v === "string";
const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const arr = (item?: Check): Check => (v) => Array.isArray(v) && (!item || v.every(item));
const nullable = (c: Check): Check => (v) => v === null || c(v);
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    obj(v) && Object.entries(fields).every(([k, c]) => c(v[k]));

const segment: Check = (v) => obj(v) && str(v.v) && (v.t === "text" || v.t === "code" || (v.t === "link" && str(v.href)));
const segments = arr(segment);
const ref = shape({ slug: nullable(str), title: str, kind: nullable(str), branch: nullable(str) });

const SCHEMAS: Record<RosResource, Record<string, Check>> = {
  solvability: {
    producer: str,
    generator: str,
    productions: arr(obj),
    summary: obj,
    plots: arr(shape({ src: str, title: str, caption: str })),
  },
  software: {
    memo: str,
    fields: arr(shape({ name: str, intro: str })),
    tools: arr(obj),
    viewers: arr(obj),
    suite: arr(obj),
    directions: arr(shape({ n: num, title: str, body: segments })),
    unverified: arr(segments),
  },
  patents: {
    memo: str,
    sources: arr(shape({ source: segments, researchOs: segments, gateway: segments })),
    corpus: arr(shape({ branch: segments, cpc: segments, why: segments })),
    settled: arr(segments),
    slices: arr(shape({ n: num, title: str, shipped: (v) => typeof v === "boolean" })),
  },
  primes: {
    generatedAt: str,
    summary: shape({ nodes: num, prime: num, composite: num }),
    unfactoredByKind: arr(shape({ kind: str, count: num })),
    penetrating: arr(ref),
    deepest: arr(ref),
    widest: arr(ref),
    confirmedIrreducible: shape({ count: num, of: num, sample: arr(ref) }),
    reviewAgain: arr(ref),
    algebra: shape({ coverage: arr(obj), frontier: obj, together: arr(obj), implied: arr(obj), reach: arr(ref) }),
  },
};

export function parseRos<K extends RosResource>(resource: K, raw: unknown): RosPayloads[K] {
  if (!obj(raw)) throw new ContractError(resource, "$");
  for (const [field, check] of Object.entries(SCHEMAS[resource])) if (!check(raw[field])) throw new ContractError(resource, field);
  return raw as unknown as RosPayloads[K];
}

export type RosResult<K extends RosResource> = { ok: true; data: RosPayloads[K] } | { ok: false; status: number; error: string };

export interface RosSource {
  readonly kind: "web" | "local";
  get<K extends RosResource>(resource: K): Promise<RosResult<K>>;
}

export interface FetchSourceOptions {
  base?: string;
  token?: string;
  fetch?: typeof fetch;
}

function fetchSource(kind: "web" | "local", opts: FetchSourceOptions): RosSource {
  const f = opts.fetch ?? fetch;
  const base = opts.base ?? "";
  const headers: Record<string, string> = opts.token ? { authorization: `Bucket ${opts.token}` } : {};
  return {
    kind,
    async get(resource) {
      let res: Response;
      try {
        res = await f(`${base}${ROS_PATHS[resource][kind]}`, { headers, cache: "no-store" });
      } catch (e) {
        return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
      }
      if (!res.ok) return { ok: false, status: res.status, error: `${resource} ${res.status}` };
      try {
        return { ok: true, data: parseRos(resource, await res.json()) };
      } catch (e) {
        return { ok: false, status: res.status, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

export const webRosSource = (opts: Omit<FetchSourceOptions, "token"> = {}): RosSource => fetchSource("web", opts);

export const localRosSource = (opts: FetchSourceOptions & { token: string }): RosSource => fetchSource("local", opts);

export type RosLiveRoute = "graph" | "search" | "node" | "state" | "directions" | "connections" | "loop" | "profile" | "modules" | "route";

export const ROS_LIVE_ROUTES: RosLiveRoute[] = ["graph", "search", "node", "state", "directions", "connections", "loop", "profile", "modules", "route"];

const WEB_PREFIX = "/api/research-os/";
const LOCAL_PREFIX = "/local/ros/";

const livePath = (route: RosLiveRoute, methods: ("GET" | "POST")[]) => ({ web: WEB_PREFIX + route, local: LOCAL_PREFIX + route, methods });

export const ROS_LIVE_PATHS: Record<RosLiveRoute, { web: string; local: string; methods: ("GET" | "POST")[] }> = {
  graph: livePath("graph", ["GET"]),
  search: livePath("search", ["GET"]),
  node: livePath("node", ["GET"]),
  state: livePath("state", ["GET", "POST"]),
  directions: livePath("directions", ["GET"]),
  connections: livePath("connections", ["GET"]),
  loop: livePath("loop", ["GET"]),
  profile: livePath("profile", ["GET", "POST"]),
  modules: livePath("modules", ["GET"]),
  route: livePath("route", ["GET"]),
};

const bool: Check = (v) => typeof v === "boolean";
const any: Check = () => true;
const oneOf =
  (...alts: Record<string, Check>[]): Check =>
  (v) =>
    alts.some((a) => shape(a)(v));

const LIVE_SHAPES: Record<RosLiveRoute, Check> = {
  graph: oneOf(
    { branches: arr(shape({ id: str, nodes: num })) },
    { branch: str, nodes: arr(shape({ id: str, slug: str, title: str, kind: str })), edges: arr(shape({ fromId: str, toId: str, kind: str })), standing: obj, assignments: arr(obj), holders: nullable(obj), learners: num, signedIn: bool },
  ),
  search: shape({ q: str, results: arr(shape({ id: str, slug: str, title: str, branch: str, stage: nullable(str) })) }),
  node: shape({
    node: shape({ id: str, slug: str, title: str, branch: str }),
    standing: obj,
    prerequisites: arr(obj),
    dependents: arr(obj),
    related: arr(obj),
    acting: arr(obj),
    directions: shape({ dependents: arr(obj), frontier: arr(obj), openQuestions: arr(obj), reach: arr(any) }),
    learn: nullable(obj),
    productions: arr(obj),
    verbs: obj,
    classes: arr(obj),
    assignments: arr(obj),
    holders: nullable(arr(obj)),
    transfer: shape({ itemId: str, prompt: str }),
    signedIn: bool,
  }),
  state: oneOf({ states: arr(shape({ nodeId: str, stage: str })) }, { stage: str, event: obj }),
  directions: shape({ dependents: arr(obj), frontier: arr(obj), openQuestions: arr(obj), reach: arr(any) }),
  connections: shape({ held: arr(obj), bridges: arr(obj) }),
  loop: shape({ access: obj, awareness: obj, understanding: obj, internalization: obj, production: obj, empty: bool }),
  profile: oneOf({ profile: nullable(shape({ role: str, consentStatus: str, updatedAt: str })), game: nullable(obj) }, { profile: nullable(obj), deleted: bool }),
  modules: shape({ node: shape({ id: str, slug: str, title: str }), modules: arr(obj) }),
  route: shape({ target: obj, frontier: arr(obj), chain: arr(obj), gap: arr(obj), lowConfidenceFlags: arr(obj), engineFrontier: any, openQuestions: arr(obj), llmEnabled: bool, learner: str }),
};

export function parseRosLive(route: RosLiveRoute, raw: unknown): unknown {
  if (!LIVE_SHAPES[route](raw)) throw new Error(`${route} payload breaks the contract`);
  return raw;
}

export function rosLiveLocal(path: string): string | undefined {
  const hit = ROS_LIVE_ROUTES.find((r) => ROS_LIVE_PATHS[r].web === path);
  return hit ? ROS_LIVE_PATHS[hit].local : undefined;
}
