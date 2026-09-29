import test from "node:test";
import assert from "node:assert/strict";
import { COOKIE_MIGRATION_MARKER, cookieDomainFor, cookieMigrationHeaders, isResearchHost, researchHref, researchRoute } from "../src/lib/research-host";

const R = "research.bucket.foundation";

test("research host rewrites pages under /research-os", () => {
  assert.deepEqual(researchRoute(R, "/"), { kind: "rewrite", pathname: "/research-os" });
  assert.deepEqual(researchRoute(R, "/home"), { kind: "rewrite", pathname: "/research-os/home" });
  assert.deepEqual(researchRoute(R, "/workspace/a/b"), { kind: "rewrite", pathname: "/research-os/workspace/a/b" });
  assert.deepEqual(researchRoute("Research.Bucket.Foundation:443", "/learn"), { kind: "rewrite", pathname: "/research-os/learn" });
});

test("research host leaves api, assets, auth and prefixed paths alone", () => {
  for (const p of ["/api/research-os/state", "/api", "/_next/static/x.js", "/logo.png", "/favicon.ico", "/sign-in", "/auth/callback", "/account"]) {
    assert.deepEqual(researchRoute(R, p), { kind: "none" }, p);
  }
  assert.deepEqual(researchRoute(R, "/apiary"), { kind: "rewrite", pathname: "/research-os/apiary" });
});

test("research host 308s prefixed paths and handles odd paths", () => {
  assert.deepEqual(researchRoute(R, "/research-os/home", "?a=1"), { kind: "redirect", url: "https://research.bucket.foundation/home?a=1" });
  assert.deepEqual(researchRoute(R, "/research-os"), { kind: "redirect", url: "https://research.bucket.foundation/" });
  assert.deepEqual(researchRoute(R, "/research-os/research-os"), { kind: "redirect", url: "https://research.bucket.foundation/research-os" });
  assert.deepEqual(researchRoute(R, "//"), { kind: "rewrite", pathname: "/research-os//" });
  assert.deepEqual(researchRoute(R, "/%2Fapi/x"), { kind: "rewrite", pathname: "/research-os/%2Fapi/x" });
  assert.deepEqual(researchRoute(R, "/research%2Dos/home"), { kind: "rewrite", pathname: "/research-os/research%2Dos/home" });
  for (const h of ["bucket-foundation-git-x.vercel.app", "research.bucket.foundation.evil.com", "localhost:3000"]) {
    assert.deepEqual(researchRoute(h, "/home"), { kind: "none" }, h);
  }
});

test("main host keeps /research-os unless the redirect flag is on", () => {
  for (const h of ["bucket.foundation", "www.bucket.foundation", "localhost:3000", null]) {
    assert.deepEqual(researchRoute(h, "/research-os/home"), { kind: "none" });
    assert.deepEqual(researchRoute(h, "/"), { kind: "none" });
  }
  assert.deepEqual(researchRoute("www.bucket.foundation", "/research-os/home", "?x=1", "1"), { kind: "redirect", url: "https://research.bucket.foundation/home?x=1" });
  assert.deepEqual(researchRoute("bucket.foundation", "/research-os", "", "true"), { kind: "redirect", url: "https://research.bucket.foundation/" });
  assert.deepEqual(researchRoute("www.bucket.foundation", "/research-osx", "", "1"), { kind: "none" });
  assert.deepEqual(researchRoute("preview.vercel.app", "/research-os/home", "", "1"), { kind: "none" });
  assert.deepEqual(researchRoute("www.bucket.foundation", "/research-os/home", "", "0"), { kind: "none" });
});

test("researchHref strips the prefix only on the research host", () => {
  assert.equal(researchHref("/research-os/home", R), "/home");
  assert.equal(researchHref("/research-os", R), "/");
  assert.equal(researchHref("/research-os?q=1", R), "/?q=1");
  assert.equal(researchHref("/account", R), "/account");
  assert.equal(researchHref("/research-os/home", "www.bucket.foundation"), "/research-os/home");
  assert.equal(isResearchHost(null), false);
});

test("cookie domain comes from the request host alone", () => {
  assert.equal(cookieDomainFor(R), ".bucket.foundation");
  assert.equal(cookieDomainFor("www.bucket.foundation"), ".bucket.foundation");
  assert.equal(cookieDomainFor("bucket.foundation:443"), ".bucket.foundation");
  assert.equal(cookieDomainFor("localhost:3000"), undefined);
  assert.equal(cookieDomainFor("x.vercel.app"), undefined);
  assert.equal(cookieDomainFor("evilbucket.foundation"), undefined);
});

test("cookie migration expires host-only sb chunks and re-sets them on the shared domain", () => {
  const jar = [{ name: "sb-p-auth-token.0", value: "a" }, { name: "sb-p-auth-token.1", value: "b" }, { name: "other", value: "z" }];
  const h = cookieMigrationHeaders(R, jar);
  assert.deepEqual(h, [
    "sb-p-auth-token.0=; Path=/; SameSite=Lax; Secure; Max-Age=0",
    "sb-p-auth-token.0=a; Path=/; SameSite=Lax; Secure; Domain=.bucket.foundation; Max-Age=34560000",
    "sb-p-auth-token.1=; Path=/; SameSite=Lax; Secure; Max-Age=0",
    "sb-p-auth-token.1=b; Path=/; SameSite=Lax; Secure; Domain=.bucket.foundation; Max-Age=34560000",
    `${COOKIE_MIGRATION_MARKER}=1; Path=/; SameSite=Lax; Secure; Domain=.bucket.foundation; Max-Age=34560000`,
  ]);
  for (const line of h.filter((l) => l.includes("Max-Age=0"))) assert.ok(!line.includes("Domain="));
  const fresh = cookieMigrationHeaders(R, jar, true, ["sb-p-auth-token.0"]);
  assert.ok(!fresh.some((l) => l.startsWith("sb-p-auth-token.0=a")));
  assert.deepEqual(cookieMigrationHeaders(R, [...jar, { name: COOKIE_MIGRATION_MARKER, value: "1" }]), []);
  assert.deepEqual(cookieMigrationHeaders("localhost:3000", jar), []);
  assert.deepEqual(cookieMigrationHeaders("x.vercel.app", jar), []);
});
