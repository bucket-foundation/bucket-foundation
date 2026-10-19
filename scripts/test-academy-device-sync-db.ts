import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { loadLocalEnv, sql } from "./lib/test-harness";

loadLocalEnv();
process.env.ACADEMY_REVIEW_LOG = "on";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const migrated = sql("select to_regprocedure('bucket.register_device(uuid,text,text,text,text,uuid)') is not null").out === "t";
const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";

async function authUp(): Promise<boolean> {
  if (!SB || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    return (await fetch(`${SB}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } })).ok;
  } catch {
    return false;
  }
}

type Handler = (req: Request) => Promise<Response> | Response;

async function routes(): Promise<Record<string, Record<string, Handler>>> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    "/api/academy/review-log": require("../src/app/api/academy/review-log/route"),
    "/api/academy/progress": require("../src/app/api/academy/progress/route"),
    "/api/academy/device/start": require("../src/app/api/academy/device/start/route"),
    "/api/academy/device/approve": require("../src/app/api/academy/device/approve/route"),
    "/api/academy/device/token": require("../src/app/api/academy/device/token/route"),
    "/api/academy/device/revoke": require("../src/app/api/academy/device/revoke/route"),
    "/api/academy/devices": require("../src/app/api/academy/devices/route"),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

const ORIGIN = "https://bucket.test";

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

test("web and desktop sync one account through local Supabase, and revocation cuts the desktop off", async (t) => {
  if (!migrated || !(await authUp())) {
    if (REQUIRED) throw new Error("RESEARCH_OS_REQUIRE_DB=1 and local Supabase auth or the devices migration is missing");
    t.skip("local Supabase auth is not running or the devices migration is not applied");
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const { createReviewSync } = await import("../src/lib/academy/review-sync");
  const { corpusAtomsVersion } = await import("../src/lib/academy/replay");
  const { createRemoteSync } = await import("../src/lib/academy/remote-sync");
  const { MemoryVault } = await import("../src/lib/academy/token-store");
  const { deviceIdFor } = await import("../src/lib/academy/device-flow");
  const table = await routes();

  const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `device-sync-${randomUUID()}@bucket.test`;
  const password = `pw-${randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  const uid = created.data.user!.id;
  try {
    assert.equal(sql(`insert into graph.learner_profiles (learner_id, birth_year_bucket) values ('${uid}', '18plus') on conflict (learner_id) do update set birth_year_bucket = '18plus'`).status, 0);
    const anon = createClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const signedIn = await anon.auth.signInWithPassword({ email, password });
    assert.ifError(signedIn.error);
    const webToken = signedIn.data.session!.access_token;

    const dispatch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(String(input), ORIGIN);
      if (url.origin !== ORIGIN) return fetch(input, init);
      const mod = table[url.pathname];
      const handler = mod?.[(init?.method ?? "GET").toUpperCase()];
      if (!handler) return new Response("no route", { status: 404 });
      const res = await handler(new Request(url, init));
      return res;
    };
    const webFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${webToken}`);
      return dispatch(input, { ...init, headers });
    };

    const web = createReviewSync({
      storage: (() => {
        const s = memoryStorage();
        return () => s;
      })(),
      fetch: webFetch,
      uuid: randomUUID,
      readLocal: () => null,
      pushSnapshot: async (branch, state) => (await webFetch("/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch, data: state }) })).ok,
      lock: (fn) => fn(),
    });
    web.setUser(uid);

    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const der = publicKey.export({ type: "spki", format: "der" });
    const pub = Buffer.from(der.subarray(der.length - 32)).toString("base64");
    const desktopStorage = memoryStorage();
    const vault = new MemoryVault();
    const desktop = createRemoteSync({
      base: ORIGIN,
      storage: () => desktopStorage,
      vault,
      device: { id: deviceIdFor(pub), publicKey: pub, sign: (m) => sign(null, Buffer.from(m), privateKey).toString("base64") },
      readLocal: () => null,
      fetch: dispatch,
      sleep: async () => undefined,
    });

    const session = await desktop.login("cli", "e2e laptop", (p) => {
      void webFetch("/api/academy/device/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_code: p.user_code }) });
    });
    assert.equal(session.user_id, uid);
    assert.equal(sql(`select count(*) from bucket.devices where user_id = '${uid}' and public_key = '${pub}' and session_id is not null`).out, "1");

    const ev = (card: string, at: number) => ({ card_id: card, rating: 3 as const, level: "recall" as const, reviewed_at: at, tz: "UTC", atoms_version: corpusAtomsVersion("lang") });
    const now = Date.now();
    web.appendReview("lang", { ...ev("ru:privet", now - 5000), atoms_version: "lang" });
    await web.flush();
    desktop.sync.appendReview("lang", { ...ev("ru:da", now - 4000), atoms_version: "lang" });
    await desktop.sync.flush();
    assert.equal(web.pending().length, 0);
    assert.equal(desktop.sync.pending().length, 0);

    const fromDesktop = await desktop.sync.pullLog();
    const fromWeb = await web.pullLog();
    assert.deepEqual(fromDesktop?.map((r) => r.card_id).sort(), ["ru:da", "ru:privet"]);
    assert.deepEqual(fromWeb?.map((r) => r.card_id).sort(), ["ru:da", "ru:privet"]);
    assert.equal(sql(`select string_agg(device_id, ',' order by seq) from bucket.academy_review_log where user_id = '${uid}'`).out.split(",")[1], deviceIdFor(pub));
    const fold = sql(`select (data->'cards' ? 'ru:privet') and (data->'cards' ? 'ru:da') from bucket.academy_progress where user_id = '${uid}' and branch = 'lang'`).out;
    assert.equal(fold, "t");

    const bare = await dispatch("/api/academy/review-log?since=0&limit=1", { headers: { authorization: `Bearer ${(await vault.get())!.access_token}` } });
    assert.equal(bare.status, 401);
    assert.equal(((await bare.json()) as { reason: string }).reason, "header_required");

    const revoked = await webFetch("/api/academy/device/revoke", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device_id: deviceIdFor(pub) }) });
    assert.equal(revoked.status, 200);
    assert.equal(((await revoked.json()) as { signed_out_others: boolean }).signed_out_others, true);
    const cut = await dispatch("/api/academy/review-log?since=0&limit=1", {
      headers: { authorization: `Bearer ${(await vault.get())!.access_token}` },
    });
    assert.equal(cut.status, 401);
    const after = await desktop.signedFetch("/api/academy/review-log?since=0&limit=1");
    assert.equal(after.status, 401);
    assert.equal(await vault.get(), null);
    const again = await desktop
      .login("cli", "e2e laptop", (p) => {
        void webFetch("/api/academy/device/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_code: p.user_code }) });
      })
      .then(
        () => "signed in",
        (e: Error) => e.message,
      );
    assert.match(again, /device_revoked/);
    assert.equal((await web.pullLog())?.length ?? -1, 0);
  } finally {
    await admin.auth.admin.deleteUser(uid);
    assert.equal(sql(`select count(*) from bucket.devices where user_id = '${uid}'`).out, "0");
  }
});
