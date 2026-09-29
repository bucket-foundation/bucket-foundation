import test from "node:test";
import assert from "node:assert/strict";
import { cookieDomainFor, isResearchHost, researchHref, researchRoute } from "../src/lib/research-host";

const R = "research.bucket.foundation";

test("research host rewrites pages under /research-os", () => {
  assert.deepEqual(researchRoute(R, "/"), { kind: "rewrite", pathname: "/research-os" });
  assert.deepEqual(researchRoute(R, "/home"), { kind: "rewrite", pathname: "/research-os/home" });
  assert.deepEqual(researchRoute(R, "/workspace/a/b"), { kind: "rewrite", pathname: "/research-os/workspace/a/b" });
  assert.deepEqual(researchRoute("Research.Bucket.Foundation:443", "/learn"), { kind: "rewrite", pathname: "/research-os/learn" });
});

test("research host leaves api, assets, auth and prefixed paths alone", () => {
  for (const p of ["/api/research-os/state", "/api", "/_next/static/x.js", "/logo.png", "/favicon.ico", "/sign-in", "/auth/callback", "/account", "/research-os", "/research-os/home"]) {
    assert.deepEqual(researchRoute(R, p), { kind: "none" }, p);
  }
  assert.deepEqual(researchRoute(R, "/apiary"), { kind: "rewrite", pathname: "/research-os/apiary" });
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

test("cookie domain is shared only in production on bucket.foundation hosts", () => {
  assert.equal(cookieDomainFor(R, true), ".bucket.foundation");
  assert.equal(cookieDomainFor("www.bucket.foundation", true), ".bucket.foundation");
  assert.equal(cookieDomainFor("bucket.foundation", true), ".bucket.foundation");
  assert.equal(cookieDomainFor(R, false), undefined);
  assert.equal(cookieDomainFor("x.vercel.app", true), undefined);
  assert.equal(cookieDomainFor("evilbucket.foundation", true), undefined);
});
