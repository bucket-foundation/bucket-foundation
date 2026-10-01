import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { protectedRedirectTarget, redirectUrl, signInClosed, signInEntryUrl, signInRedirectTarget } from "../src/lib/sign-in-gate";

const PROD = { VERCEL_ENV: "production" };

test("production closes sign-in unless SIGN_IN_OPEN is 1", () => {
  assert.equal(signInClosed(PROD), true);
  assert.equal(signInClosed({ ...PROD, SIGN_IN_OPEN: "0" }), true);
  assert.equal(signInClosed({ ...PROD, SIGN_IN_OPEN: "true" }), true);
  assert.equal(signInClosed({ ...PROD, SIGN_IN_OPEN: "" }), true);
  assert.equal(signInClosed({ ...PROD, SIGN_IN_OPEN: "1" }), false);
  assert.equal(signInClosed({ ...PROD, SIGN_IN_OPEN: " 1 " }), false);
  assert.equal(signInClosed({ ...PROD, BUCKET_SIGNIN_OPEN: "1" }), true);
});

test("preview, development and local stay open", () => {
  assert.equal(signInClosed({ VERCEL_ENV: "preview" }), false);
  assert.equal(signInClosed({ VERCEL_ENV: "development" }), false);
  assert.equal(signInClosed({}), false);
  assert.equal(signInClosed({ SIGN_IN_OPEN: "0" }), false);
});

test("the sign-in path redirects to /download only while closed", () => {
  assert.equal(signInRedirectTarget("/sign-in", PROD), "/download");
  assert.equal(signInRedirectTarget("/sign-in/anything", PROD), "/download");
  assert.equal(signInRedirectTarget("/sign-in", { ...PROD, SIGN_IN_OPEN: "1" }), null);
  assert.equal(signInRedirectTarget("/sign-in", { VERCEL_ENV: "preview" }), null);
  assert.equal(signInRedirectTarget("/sign-ins", PROD), null);
  assert.equal(signInRedirectTarget("/download", PROD), null);
});

test("protected and entry links go to /download while closed", () => {
  assert.equal(protectedRedirectTarget("/research-os/workspace", "?target=x", PROD), "/download");
  assert.equal(signInEntryUrl("/academy", PROD), "/download");
  assert.equal(protectedRedirectTarget("/research-os/workspace", "?target=x", { VERCEL_ENV: "preview" }), "/sign-in?next=%2Fresearch-os%2Fworkspace%3Ftarget%3Dx");
  assert.equal(signInEntryUrl("/academy", { ...PROD, SIGN_IN_OPEN: "1" }), "/sign-in?next=%2Facademy");
});

test("the research host sends /download to the main site", () => {
  assert.equal(redirectUrl("/download", "https://research.bucket.foundation/sign-in", true).href, "https://www.bucket.foundation/download");
  assert.equal(redirectUrl("/download", "https://www.bucket.foundation/sign-in", false).href, "https://www.bucket.foundation/download");
  assert.equal(redirectUrl("/sign-in", "https://research.bucket.foundation/x", true).href, "https://research.bucket.foundation/sign-in");
});

async function run(url: string, env: Record<string, string | undefined>, host = "www.bucket.foundation") {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    return await middleware(new NextRequest(url, { headers: { host } }));
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const NO_AUTH = { NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined, SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined };

test("middleware: production /sign-in with any query is a 307 to /download", async () => {
  for (const q of ["", "?next=/research-os/workspace", "?account=1&next=%2Faccount"]) {
    const res = await run("https://www.bucket.foundation/sign-in" + q, { ...NO_AUTH, VERCEL_ENV: "production", SIGN_IN_OPEN: undefined });
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location")!).pathname, "/download");
    assert.equal(new URL(res.headers.get("location")!).search, "");
  }
});

test("middleware: production signed-out protected routes go to /download", async () => {
  for (const p of ["/research-os/workspace", "/research-os/home", "/account", "/canon/signoff"]) {
    const res = await run("https://www.bucket.foundation" + p + "?x=1", { ...NO_AUTH, VERCEL_ENV: "production", SIGN_IN_OPEN: undefined });
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location")!).pathname, "/download");
  }
});

test("middleware: research host sign-in lands on the main site download page", async () => {
  const res = await run("https://research.bucket.foundation/sign-in", { ...NO_AUTH, VERCEL_ENV: "production", SIGN_IN_OPEN: undefined }, "research.bucket.foundation");
  assert.equal(res.status, 307);
  assert.equal(res.headers.get("location"), "https://www.bucket.foundation/download");
});

test("middleware: SIGN_IN_OPEN=1 and preview keep the sign-in flow", async () => {
  const open = await run("https://www.bucket.foundation/sign-in", { ...NO_AUTH, VERCEL_ENV: "production", SIGN_IN_OPEN: "1" });
  assert.equal(open.headers.get("location"), null);
  const preview = await run("https://www.bucket.foundation/sign-in", { ...NO_AUTH, VERCEL_ENV: "preview", SIGN_IN_OPEN: undefined });
  assert.equal(preview.headers.get("location"), null);
  const gated = await run("https://www.bucket.foundation/research-os/workspace", { ...NO_AUTH, VERCEL_ENV: "preview", SIGN_IN_OPEN: undefined });
  assert.equal(gated.status, 307);
  assert.equal(new URL(gated.headers.get("location")!).pathname, "/sign-in");
});
