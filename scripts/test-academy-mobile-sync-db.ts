import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadLocalEnv, sql } from "./lib/test-harness";

loadLocalEnv();
process.env.ACADEMY_REVIEW_LOG = "on";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const migrated = sql("select to_regprocedure('bucket.append_reviews(uuid,jsonb)') is not null").out === "t";
const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const ORIGIN = "https://bucket.test";

async function authUp(): Promise<boolean> {
  if (!SB || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    return (await fetch(`${SB}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } })).ok;
  } catch {
    return false;
  }
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
}

type Handler = (req: Request) => Promise<Response> | Response;

test("a phone signs in with an email code and round-trips a review with the web through local Supabase", async (t) => {
  if (!migrated || !(await authUp())) {
    if (REQUIRED) throw new Error("RESEARCH_OS_REQUIRE_DB=1 and local Supabase auth or the review-log migration is missing");
    t.skip("local Supabase auth is not running or the review-log migration is not applied");
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const { createMobileSync } = await import("../src/lib/academy/mobile-sync");
  const { createReviewSync } = await import("../src/lib/academy/review-sync");
  const { MemoryVault } = await import("../src/lib/academy/token-store");
  /* eslint-disable @typescript-eslint/no-require-imports */
  const table: Record<string, Record<string, Handler>> = {
    "/api/academy/review-log": require("../src/app/api/academy/review-log/route"),
    "/api/academy/progress": require("../src/app/api/academy/progress/route"),
    "/api/academy/session": require("../src/app/api/academy/session/route"),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dispatch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input), ORIGIN);
    const handler = table[url.pathname]?.[(init?.method ?? "GET").toUpperCase()];
    return handler ? handler(new Request(url, init)) : new Response("no route", { status: 404 });
  };

  const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `mobile-sync-${randomUUID()}@bucket.test`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  assert.ifError(created.error);
  const uid = created.data.user!.id;
  try {
    assert.equal(sql(`insert into graph.learner_profiles (learner_id, birth_year_bucket) values ('${uid}', '18plus') on conflict (learner_id) do update set birth_year_bucket = '18plus'`).status, 0);
    const vault = new MemoryVault();
    const phone = createMobileSync({ base: ORIGIN, storage: (() => { const s = memoryStorage(); return () => s; })(), vault, fetch: dispatch, readLocal: () => null });
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const code = link.data.properties?.email_otp;
    assert.ok(code, "local auth returned an email code");
    assert.deepEqual(await phone.verifyCode(email, code!), { ok: true });
    assert.equal((await vault.get())?.user_id, uid);

    const webAuth = await createClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } }).auth.verifyOtp({ type: "magiclink", token_hash: (await admin.auth.admin.generateLink({ type: "magiclink", email })).data.properties!.hashed_token });
    assert.ifError(webAuth.error);
    const webToken = webAuth.data.session!.access_token;
    const webFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${webToken}`);
      return dispatch(input, { ...init, headers });
    };
    const web = createReviewSync({ storage: (() => { const s = memoryStorage(); return () => s; })(), fetch: webFetch, uuid: randomUUID, readLocal: () => null, pushSnapshot: async () => true, lock: (fn) => fn() });

    const now = Date.now();
    const appended = await phone.route("/local/review-log", "POST", JSON.stringify({ branch: "lang", review: { card_id: "es:hola", rating: 3, level: "recall", reviewed_at: now - 3000, tz: "UTC", atoms_version: "lang" } }));
    assert.equal(appended?.status, 200);
    web.appendReview("lang", { card_id: "es:gracias", rating: 4, level: "recall", reviewed_at: now - 2000, tz: "UTC", atoms_version: "lang" });
    await web.flush();
    const pulled = (await (await phone.route("/local/review-log", "GET", null))!.json()) as { reviews: { card_id: string; device_id: string }[]; pending: number };
    assert.equal(pulled.pending, 0);
    assert.deepEqual(pulled.reviews.map((r) => r.card_id).sort(), ["es:gracias", "es:hola"]);
    assert.deepEqual((await web.pullLog())?.map((r) => r.card_id).sort(), ["es:gracias", "es:hola"]);
    assert.equal(sql(`select (data->'cards' ? 'es:hola') and (data->'cards' ? 'es:gracias') from bucket.academy_progress where user_id = '${uid}' and branch = 'lang'`).out, "t");

    const s = (await vault.get())!;
    await vault.set({ ...s, expires_at: Math.floor(Date.now() / 1000) - 5 });
    const fresh = await phone.accessToken();
    assert.ok(fresh && fresh !== s.access_token, "an expired token was refreshed through /api/academy/session");
    await admin.auth.admin.signOut(fresh!, "global");
    await vault.set({ ...(await vault.get())!, expires_at: Math.floor(Date.now() / 1000) - 5 });
    assert.equal(await phone.accessToken(), null);
    assert.equal(await vault.get(), null);
  } finally {
    await admin.auth.admin.deleteUser(uid);
  }
});
