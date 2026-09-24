import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { LAUNCH_APIS, LAUNCH_PAGES, inLaunchScope } from "../src/lib/research-os/launch-scope";
import { isLaunchStaff, launchPageAllowed, launchWriteRefusal } from "../src/lib/research-os/launch-gate";
import { gateLaunchPage } from "../src/lib/research-os/launch-page";

const ROOT = path.join(__dirname, "..");
const APP = path.join(ROOT, "src/app/research-os/(app)");
const API = path.join(ROOT, "src/app/api/research-os");
const WRITES = ["POST", "PUT", "PATCH", "DELETE"] as const;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function routeOf(base: string, prefix: string, file: string): string {
  const segs = path.relative(base, path.dirname(file)).split(path.sep).filter((s) => s && !/^\(.*\)$/.test(s));
  return [prefix, ...segs].join("/");
}

const pages = walk(APP).filter((f) => path.basename(f) === "page.tsx").map((f) => ({ file: f, route: routeOf(APP, "/research-os", f) }));
const apis = walk(API).filter((f) => path.basename(f) === "route.ts").map((f) => ({ file: f, route: routeOf(API, "/api/research-os", f) }));

function gatingLayout(file: string): { layout: string; route: string } | null {
  for (let dir = path.dirname(file); dir.startsWith(APP) && dir !== APP; dir = path.dirname(dir)) {
    const layout = path.join(dir, "layout.tsx");
    if (!fs.existsSync(layout)) continue;
    const route = routeOf(APP, "/research-os", layout);
    const m = /gateLaunchPage\("([^"]+)"\)/.exec(fs.readFileSync(layout, "utf8"));
    if (m) return { layout, route: m[1] === route ? route : `mismatch:${m[1]}` };
  }
  return null;
}

test("the scope list matches the plan's launch screens", () => {
  assert.deepEqual(
    pages.filter((p) => inLaunchScope(p.route)).map((p) => p.route).sort(),
    [...LAUNCH_PAGES].sort(),
  );
  assert.ok(inLaunchScope("/research-os/learn/02-physics/place"));
  assert.ok(inLaunchScope("/research-os/n/why-the-sky-is-blue"));
  assert.ok(inLaunchScope("/research-os/home/"));
  assert.ok(!inLaunchScope("/research-os/status"));
  assert.ok(!inLaunchScope("/research-os/patents"));
  assert.ok(!inLaunchScope("/research-os/n"));
  assert.ok(!inLaunchScope("/research-os/learn/02-physics/place/extra"));
  assert.ok(!inLaunchScope("/api/research-os/edges"));
});

test("every (app) page is in launch scope or behind a launch-scope layout for its own segment", () => {
  const loose: string[] = [];
  for (const p of pages) {
    const gate = gatingLayout(p.file);
    if (inLaunchScope(p.route)) {
      if (gate) loose.push(`${p.route} is in scope yet gated by ${path.relative(ROOT, gate.layout)}`);
      continue;
    }
    if (!gate) loose.push(`${p.route} is out of launch scope and has no gateLaunchPage layout: add it to LAUNCH_PAGES or gate it`);
    else if (gate.route.startsWith("mismatch:")) loose.push(`${path.relative(ROOT, gate.layout)} gates ${gate.route.slice(9)}, a route other than its own`);
    else if (inLaunchScope(gate.route)) loose.push(`${path.relative(ROOT, gate.layout)} gates an in-scope route`);
  }
  assert.deepEqual(loose, []);
});

test("every research-os API is in launch scope or wraps each write method in the launch gate", () => {
  const known = new Set(apis.map((a) => a.route));
  assert.deepEqual(LAUNCH_APIS.filter((r) => !known.has(r)), [], "LAUNCH_APIS names a route that does not exist");
  const loose: string[] = [];
  for (const a of apis) {
    if (inLaunchScope(a.route)) continue;
    const src = fs.readFileSync(a.file, "utf8");
    for (const m of WRITES) {
      if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src)) loose.push(`${a.route} ${m} is a bare function`);
      const exported = new RegExp(`export\\s+const\\s+${m}\\s*=\\s*(\\w+)\\(`).exec(src);
      if (exported && !["withResearchOsRoute", "staffWritesAtLaunch"].includes(exported[1])) loose.push(`${a.route} ${m} is built by ${exported[1]}`);
    }
  }
  assert.deepEqual(loose, []);
});

test("out-of-scope write APIs answer 404 to a caller with no staff identity", async () => {
  const gated: string[] = [];
  for (const a of apis) {
    if (inLaunchScope(a.route)) continue;
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const mod = require(a.file) as Record<string, unknown>;
    for (const m of WRITES) {
      const handler = mod[m];
      if (typeof handler !== "function") continue;
      const res = (await handler(new NextRequest(`http://localhost${a.route}`, { method: m, body: "{}", headers: { "content-type": "application/json" } }), { params: {} })) as Response;
      assert.equal(res.status, 404, `${m} ${a.route} answered ${res.status}`);
      gated.push(`${m} ${a.route}`);
    }
  }
  assert.ok(gated.length >= 10, `only ${gated.length} gated write handlers found`);
});

test("reads and in-scope writes pass the launch gate", async () => {
  assert.equal(await launchWriteRefusal(new NextRequest("http://localhost/api/research-os/edges")), null);
  assert.equal(await launchWriteRefusal(new NextRequest("http://localhost/api/research-os/workspace", { method: "POST", body: "{}" })), null);
  assert.equal((await launchWriteRefusal(new NextRequest("http://localhost/api/research-os/edges", { method: "POST", body: "{}" })))?.status, 404);
});

test("every API an in-scope page calls stays in launch scope", () => {
  const gatedDirs = pages.filter((p) => !inLaunchScope(p.route)).map((p) => gatingLayout(p.file)?.layout).filter((l): l is string => Boolean(l)).map((l) => path.dirname(l));
  const files = walk(APP).filter((f) => /\.tsx?$/.test(f) && !gatedDirs.some((d) => f.startsWith(d + path.sep)));
  const missing = new Set<string>();
  for (const f of files) {
    for (const m of Array.from(fs.readFileSync(f, "utf8").matchAll(/\/api\/research-os\/[a-z0-9\-/]+/g))) {
      if (!inLaunchScope(m[0])) missing.add(`${path.relative(APP, f)} calls ${m[0]}`);
    }
  }
  assert.deepEqual(Array.from(missing), []);
});

const TEACHER = { id: "00000000-0000-0000-0000-00000000d074", email: "self-made-teacher@bucket.test" };
const LISTED = { id: "00000000-0000-0000-0000-00000000d075", email: "staff@bucket.test" };

/* eslint-disable @typescript-eslint/no-require-imports */
const db = require("@/lib/research-os/db") as Record<string, unknown>;
const classDb = require("@/lib/research-os/class-db") as Record<string, unknown>;
const staff = require("@/lib/research-os/staff") as Record<string, unknown>;
const server = require("@/lib/supabase/server") as Record<string, unknown>;
/* eslint-enable @typescript-eslint/no-require-imports */

async function as<T>(who: { id: string; email: string } | null, list: string | undefined, run: () => Promise<T>): Promise<T> {
  const saved = { verify: db.verifyLearnerIdentity, anywhere: classDb.isClassStaffAnywhere, isStaff: staff.isStaff, session: server.getSessionUser, list: process.env.RESEARCH_OS_REVIEWER_EMAILS };
  db.verifyLearnerIdentity = async () => who;
  classDb.isClassStaffAnywhere = async () => true;
  staff.isStaff = async () => true;
  server.getSessionUser = async () => who;
  if (list === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
  else process.env.RESEARCH_OS_REVIEWER_EMAILS = list;
  try {
    return await run();
  } finally {
    db.verifyLearnerIdentity = saved.verify;
    classDb.isClassStaffAnywhere = saved.anywhere;
    staff.isStaff = saved.isStaff;
    server.getSessionUser = saved.session;
    if (saved.list === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = saved.list;
  }
}

async function pageStatus(route: string): Promise<number> {
  try {
    await gateLaunchPage(route);
    return 200;
  } catch (err) {
    if (err instanceof Error && /NEXT_NOT_FOUND/.test(`${err.message} ${(err as { digest?: string }).digest ?? ""}`)) return 404;
    throw err;
  }
}

async function writeStatus(route: string): Promise<number> {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const mod = require(path.join(API, route.replace("/api/research-os/", ""), "route")) as { POST: (req: NextRequest, ctx: unknown) => Promise<Response> };
  const res = await mod.POST(new NextRequest(`http://localhost${route}`, { method: "POST", body: "{}", headers: { "content-type": "application/json" } }), { params: {} });
  return res.status;
}

test("a self-made teacher gets 404 on out-of-scope pages and their write APIs", async () => {
  await as(TEACHER, LISTED.email, async () => {
    assert.equal(isLaunchStaff(TEACHER), false);
    for (const route of ["/research-os/status", "/research-os/class", "/research-os/edges"]) assert.equal(await pageStatus(route), 404, route);
    for (const route of ["/api/research-os/edges", "/api/research-os/roster"]) assert.equal(await writeStatus(route), 404, route);
    assert.equal(await pageStatus("/research-os/learn"), 200);
  });
});

test("a listed staff email passes the gate, and an unset list refuses everyone", async () => {
  await as(LISTED, `other@bucket.test, ${LISTED.email.toUpperCase()}`, async () => {
    assert.equal(await pageStatus("/research-os/status"), 200);
    assert.notEqual(await writeStatus("/api/research-os/edges"), 404);
  });
  await as(LISTED, undefined, async () => {
    assert.equal(launchPageAllowed("/research-os/status", LISTED), false);
    assert.equal(await pageStatus("/research-os/status"), 404);
    assert.equal(await writeStatus("/api/research-os/edges"), 404);
  });
  await as(LISTED, "", async () => {
    assert.equal(await pageStatus("/research-os/patents"), 404);
  });
});
