import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

export const API_DIR = path.join(__dirname, "..", "..", "src", "app", "api", "research-os");
export const FIXTURE_DIR = path.join(__dirname, "route-characterization");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export const LEARNER = "00000000-0000-0000-0000-0000000000e1";
const PROBE_TIMEOUT_MS = 10_000;

export type Observed = { status: number; cache: string | null; type: string | null; body: unknown } | { threw: string } | { timeout: true };
export type Snapshot = Record<string, Observed>;

export type Stub = Record<string, Record<string, unknown>>;
export type Probe = {
  name: string;
  configured: boolean;
  learner: string | null;
  consent: { allowed: boolean; reason?: string };
  body?: string;
  query?: string;
  methods?: string[];
  stubs?: () => Stub;
};

export const REVIEWER: Stub = { "@/lib/research-os/reviewer": { verifyGraphReviewer: async () => ({ id: LEARNER }) } };
export const SIGNED_IN = { configured: true, learner: LEARNER, consent: { allowed: true } } as const;

function folderProbes(folder: string): Probe[] {
  const file = path.join(FIXTURE_DIR, `${folder}.probes.ts`);
  if (!fs.existsSync(file)) return [];
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  return (require(file) as { probes: Probe[] }).probes;
}

const PROBES: Probe[] = [
  { name: "unconfigured", configured: false, learner: null, consent: { allowed: true } },
  { name: "anonymous", configured: true, learner: null, consent: { allowed: true } },
  { name: "signed in, store down", configured: true, learner: LEARNER, consent: { allowed: true }, body: "{}" },
  { name: "signed in, malformed json", configured: true, learner: LEARNER, consent: { allowed: true }, body: "{" },
  { name: "signed in, consent unavailable", configured: true, learner: LEARNER, consent: { allowed: false, reason: "unavailable" }, body: "{}" },
  { name: "signed in, consent refused", configured: true, learner: LEARNER, consent: { allowed: false, reason: "no_profile" }, body: "{}" },
];

let installed = false;
type Stubs = { db: Record<string, unknown>; consent: Record<string, unknown> };
let stubs: Stubs;

function install(): Stubs {
  if (installed) return stubs;
  for (const key of Object.keys(process.env)) {
    if (/SUPABASE|ANTHROPIC|OPENAI|RESEARCH_OS|STRIPE|RESEND|GEMINI|VOYAGE|WORKER|HASH_SALT/.test(key)) delete process.env[key];
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "characterization-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "characterization-service";
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  /* eslint-disable @typescript-eslint/no-require-imports */
  stubs = { db: require("@/lib/research-os/db"), consent: require("@/lib/research-os/consent") };
  /* eslint-enable @typescript-eslint/no-require-imports */
  installed = true;
  return stubs;
}

export function folders(): string[] {
  return fs
    .readdirSync(API_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(API_DIR, d.name, "route.ts")))
    .map((d) => d.name)
    .sort();
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g;

function normalize(text: string): string {
  return text.replace(ISO, "<time>").replace(UUID, (m) => (m.toLowerCase() === LEARNER ? "<learner>" : "<uuid>"));
}

async function observe(res: Response): Promise<Observed> {
  const text = normalize(await res.text());
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  const type = res.headers.get("content-type");
  return { status: res.status, cache: res.headers.get("cache-control"), type: type ? type.split(";")[0] : null, body };
}

async function run(handler: (req: NextRequest, ctx: unknown) => Promise<Response>, method: string, probe: Probe): Promise<Observed> {
  const { db, consent } = install();
  db.configured = () => probe.configured;
  db.verifyLearner = async () => probe.learner;
  db.verifyLearnerIdentity = async () => (probe.learner ? { id: probe.learner, email: "learner@bucket.test" } : null);
  consent.requireConsent = async () => probe.consent;
  const restore: [Record<string, unknown>, string, unknown][] = [];
  for (const [mod, fns] of Object.entries(probe.stubs?.() ?? {})) {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const target = require(mod) as Record<string, unknown>;
    for (const [name, fn] of Object.entries(fns)) {
      restore.push([target, name, target[name]]);
      target[name] = fn;
    }
  }
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };
  if (method !== "GET" && probe.body !== undefined) {
    init.body = probe.body;
    init.headers = { "content-type": "application/json" };
  }
  const req = new NextRequest(`http://localhost/api/research-os/characterization${probe.query ?? ""}`, init);
  const quiet = { error: console.error, warn: console.warn, log: console.log };
  console.error = console.warn = console.log = () => undefined;
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<Observed>((resolve) => {
      timer = setTimeout(() => resolve({ timeout: true }), PROBE_TIMEOUT_MS);
    });
    return await Promise.race([
      Promise.resolve(handler(req, { params: Promise.resolve({}) })).then(observe, (err: unknown) => ({ threw: normalize(err instanceof Error ? err.message : String(err)) })),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    Object.assign(console, quiet);
    for (const [target, name, fn] of restore.reverse()) target[name] = fn;
  }
}

export async function characterize(folder: string): Promise<Snapshot> {
  install();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const mod = require(path.join(API_DIR, folder, "route")) as Record<string, unknown>;
  const out: Snapshot = {};
  for (const method of METHODS) {
    const handler = mod[method];
    if (typeof handler !== "function") continue;
    for (const probe of [...PROBES, ...folderProbes(folder)]) {
      if (method === "GET" && probe.name === "signed in, malformed json") continue;
      if (probe.methods && !probe.methods.includes(method)) continue;
      out[`${method} ${probe.name}`] = await run(handler as (req: NextRequest, ctx: unknown) => Promise<Response>, method, probe);
    }
  }
  return out;
}

export function fixturePath(folder: string): string {
  return path.join(FIXTURE_DIR, `${folder}.json`);
}

export function readFixture(folder: string): Snapshot | null {
  const file = fixturePath(folder);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot) : null;
}

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => a !== "--update");
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const folder of only.length ? only : folders()) {
    const snap = await characterize(folder);
    fs.writeFileSync(fixturePath(folder), JSON.stringify(snap, null, 2) + "\n");
    console.log(`${folder}: ${Object.keys(snap).length} cases`);
  }
}

if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
