import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { adminRewrites } from "./hosts.cjs";
import { isAdminHost, requestHost } from "./gate";

type Rule = { source: string; destination: string; has?: { value: string }[]; missing?: { value: string }[] };
const config = createRequire(__filename)("../../../next.config.js") as { rewrites(): Promise<{ beforeFiles: Rule[] }>; redirects(): Promise<Rule[]> };

function matches(source: string, path: string): boolean {
  if (source === "/") return path === "/";
  const inner = source.slice("/:path(".length, -1);
  return new RegExp(`^/${inner}$`).test(path);
}

test("admin host maps to the ops route", () => {
  const rules = adminRewrites({});
  assert.ok(rules.every((r) => r.has[0].value === "admin.polingual.com"));
  const route = (path: string) => rules.find((r) => matches(r.source, path))?.destination.replace(":path", path.slice(1));
  assert.equal(route("/"), "/ops");
  assert.equal(route("/sign-in"), "/ops/sign-in");
  assert.equal(route("/session"), "/ops/session");
  assert.equal(route("/ops"), undefined);
  assert.equal(route("/_next/static/x.js"), undefined);
  assert.equal(route("/media/social/night/slide-1.jpg"), undefined);
});

test("dev host joins only when set", () => {
  assert.equal(adminRewrites({}).length, 2);
  assert.equal(adminRewrites({ POLINGUAL_ADMIN_DEV_HOST: "localhost" }).length, 4);
});

test("next config puts the admin rewrites ahead of the landing rewrite and drops the bucket redirect", async () => {
  const { beforeFiles } = await config.rewrites();
  const first = beforeFiles.findIndex((r) => r.has?.[0]?.value === "admin.polingual.com");
  const landing = beforeFiles.findIndex((r) => r.source === "/" && !r.has);
  assert.ok(first >= 0 && first < landing);
  const redirects = await config.redirects();
  assert.ok(!redirects.some((r) => r.has?.some((h) => h.value === "admin.polingual.com")));
  assert.ok(redirects.find((r) => r.source === "/admin")?.missing?.some((h) => h.value === "admin.polingual.com"));
});

test("isAdminHost accepts the admin host only", () => {
  assert.equal(isAdminHost("admin.polingual.com", {}), true);
  assert.equal(isAdminHost("ADMIN.polingual.com:443", {}), true);
  assert.equal(isAdminHost("polingual.com", {}), false);
  assert.equal(isAdminHost("www.polingual.com", {}), false);
  assert.equal(isAdminHost("admin.polingual.com.evil.com", {}), false);
  assert.equal(isAdminHost(null, {}), false);
  assert.equal(isAdminHost("localhost:3000", {}), false);
  assert.equal(isAdminHost("localhost:3000", { POLINGUAL_ADMIN_DEV_HOST: "localhost" }), true);
});

test("requestHost prefers the forwarded host", () => {
  const h = new Headers({ host: "polingual.vercel.app", "x-forwarded-host": "admin.polingual.com" });
  assert.equal(requestHost(h), "admin.polingual.com");
  assert.equal(requestHost(new Headers({ host: "polingual.com" })), "polingual.com");
});
