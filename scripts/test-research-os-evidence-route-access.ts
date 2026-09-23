import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function sql(statement: string): { status: number; out: string } {
  const run = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
  return { status: run.status ?? 1, out: (run.stdout || "").trim() + (run.stderr || "") };
}

function loadLocalEnv(): void {
  const file = path.join(__dirname, "..", ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadLocalEnv();

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const profiles = sql("select to_regclass('graph.learner_profiles') is not null");
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && profiles.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and graph.learner_profiles is missing");
if (REQUIRED && !keyed) throw new Error("RESEARCH_OS_REQUIRE_DB=1 and .env.local carries no Supabase URL and keys");
const skip = !reachable
  ? "no local database reachable"
  : profiles.out !== "t"
    ? "graph.learner_profiles is missing"
    : keyed
      ? false
      : "no local Supabase URL and keys in .env.local";

const RUN = randomUUID().slice(0, 8);
const URL_BASE = "http://127.0.0.1/api/research-os/evidence-search";

interface Account {
  id: string;
  email: string;
  token: string;
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "graph" },
  });
}

async function account(registry: string[], name: string, profile: { band: string | null; consent: string } | null): Promise<Account> {
  const svc = admin();
  const email = `ros-access-${RUN}-${name}@bucket.test`;
  const made = await svc.auth.admin.createUser({ email, email_confirm: true });
  if (made.error || !made.data.user) throw new Error(`creating ${email}: ${made.error?.message ?? "no user"}`);
  const id = made.data.user.id;
  registry.push(id);
  if (profile) {
    const row = {
      learner_id: id,
      role: "independent",
      birth_year_bucket: profile.band,
      consent_status: profile.consent,
      consent_source: profile.consent === "self" ? "adult" : null,
    };
    const written = await svc.from("learner_profiles").upsert(row, { onConflict: "learner_id" });
    if (written.error) throw new Error(`profile for ${email}: ${written.error.message}`);
  }

  const link = await svc.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data?.properties?.hashed_token) throw new Error(`link for ${email}: ${link.error?.message ?? "none"}`);
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  const token = session.data?.session?.access_token;
  if (session.error || !token) throw new Error(`session for ${email}: ${session.error?.message ?? "none"}`);
  return { id, email, token };
}

async function removeAccounts(ids: string[]): Promise<void> {
  const svc = admin();
  for (const id of ids) {
    await svc.from("learner_profiles").delete().eq("learner_id", id);
    await svc.auth.admin.deleteUser(id);
  }
}

interface Answer {
  status: number;
  body: Record<string, unknown>;
  cacheControl: string | null;
}

async function call(method: "GET" | "POST", token: string | null, body?: unknown): Promise<Answer> {
  const route = await import("../src/app/api/research-os/evidence-search/route");
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (method === "POST") headers["content-type"] = "application/json";
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers };
  if (method === "POST") init.body = JSON.stringify(body ?? { schemaVersion: 1, query: "why the sky is blue", branch: "02-physics", limit: 5 });
  const req = new NextRequest(URL_BASE, init as ConstructorParameters<typeof NextRequest>[1]);
  const res = method === "GET" ? await route.GET(req) : await route.POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, cacheControl: res.headers.get("cache-control") };
}

function saysNothing(answer: Answer, where: string): void {
  const text = JSON.stringify(answer.body);
  for (const leak of ["corpusRevision", "modelRevision", "sources", "cards", "requestId"]) {
    assert.equal(text.includes(leak), false, `${where} named ${leak} in a refusal`);
  }
  assert.equal(/[0-9a-f]{40,}/.test(text), false, `${where} carried a revision-looking hash in a refusal`);
  assert.equal(answer.cacheControl, "private, no-store", `${where} did not answer private, no-store`);
}

test("the route refuses everyone outside the pilot, and names each reason", { skip }, async (t) => {
  process.env.RESEARCH_OS_AI_SEARCH = "1";
  const made: string[] = [];
  try {
    const adult = await account(made, "adult", { band: "18plus", consent: "self" });
    const minor = await account(made, "minor", { band: "13to17", consent: "self" });
    const ageless = await account(made, "ageless", { band: null, consent: "self" });
    const unconsented = await account(made, "unconsented", { band: "13to17", consent: "none" });
    const profileless = await account(made, "profileless", null);
    const offlist = await account(made, "offlist", { band: "18plus", consent: "self" });
    process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS = [adult.id, minor.id, ageless.id, unconsented.id, profileless.id].join(",");

    await t.test("no session is 401, on both methods", async () => {
      for (const method of ["GET", "POST"] as const) {
        const answer = await call(method, null);
        assert.equal(answer.status, 401, `${method} with no token`);
        assert.equal(answer.body.error, "no_session");
        saysNothing(answer, `${method} anonymous`);
      }
    });

    await t.test("a token this stack never issued is 401, never a personalized answer", async () => {
      const forged = `${adult.token.split(".")[0]}.${adult.token.split(".")[1]}.${"a".repeat(43)}`;
      for (const token of ["not-a-token", forged, `${adult.token}x`]) {
        const answer = await call("GET", token);
        assert.equal(answer.status, 401, `token ${token.slice(0, 12)}…`);
        assert.equal(answer.body.error, "no_session");
        saysNothing(answer, "forged token");
      }
    });

    await t.test("a minor with no consent is 403 on consent, before the age answer", async () => {
      const answer = await call("GET", unconsented.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "consent_required");
      saysNothing(answer, "unconsented");
    });

    await t.test("an account that answered no age question at all is 403", async () => {
      const answer = await call("GET", profileless.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "no_profile");
      assert.equal(answer.body.needsProfile, true, "the refusal says the profile is what is missing");
      saysNothing(answer, "no profile row");
    });

    await t.test("the allowed account passes every gate and stops at the corpus", async () => {
      const before = process.env.RESEARCH_OS_EVIDENCE_DIR;
      process.env.RESEARCH_OS_EVIDENCE_DIR = path.join(__dirname, "..", `no-corpus-${RUN}`);
      try {
        const answer = await call("GET", adult.token);
        assert.equal(answer.status, 503, `the admitted account answered ${answer.status}`);
        assert.equal(answer.body.error, "corpus_unavailable");
        assert.equal(answer.cacheControl, "private, no-store");
      } finally {
        if (before === undefined) delete process.env.RESEARCH_OS_EVIDENCE_DIR;
        else process.env.RESEARCH_OS_EVIDENCE_DIR = before;
      }
    });

    await t.test("a minor is 403, consent notwithstanding", async () => {
      const answer = await call("GET", minor.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "adults_only");
      saysNothing(answer, "minor");
    });

    await t.test("an unanswered age question is 403, the same as a minor", async () => {
      const answer = await call("GET", ageless.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "adults_only");
      saysNothing(answer, "no age band");
    });

    await t.test("an adult with consent who is off the pilot list is 403", async () => {
      const answer = await call("GET", offlist.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "not_in_pilot");
      saysNothing(answer, "off the pilot list");
    });

    await t.test("POST refuses the same accounts as GET, so the write path is no way in", async () => {
      for (const who of [minor, ageless, unconsented, profileless, offlist]) {
        const get = await call("GET", who.token);
        const post = await call("POST", who.token);
        assert.equal(post.status, get.status, `${who.email} answered ${post.status} to POST and ${get.status} to GET`);
        assert.equal(post.body.error, get.body.error);
        saysNothing(post, `POST ${who.email}`);
      }
    });

    await t.test("the flag closes the route to the pilot too, and says no more than that", async () => {
      process.env.RESEARCH_OS_AI_SEARCH = "0";
      try {
        for (const who of [adult, offlist]) {
          const answer = await call("GET", who.token);
          assert.equal(answer.status, 404, `${who.email} with the flag off`);
          assert.equal(answer.body.error, "feature_off");
          saysNothing(answer, "flag off");
        }
      } finally {
        process.env.RESEARCH_OS_AI_SEARCH = "1";
      }
    });

    await t.test("an empty pilot list admits nobody", async () => {
      const list = process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS;
      process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS = "";
      try {
        const answer = await call("GET", adult.token);
        assert.equal(answer.status, 403);
        assert.equal(answer.body.error, "not_in_pilot");
      } finally {
        process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS = list;
      }
    });

    await t.test("another account's id on the pilot list does not carry this caller in", async () => {
      process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS = adult.id;
      const answer = await call("GET", offlist.token);
      assert.equal(answer.status, 403);
      assert.equal(answer.body.error, "not_in_pilot");
    });
  } finally {
    await removeAccounts(made);
  }
});

test("a refused caller is refused before the corpus is read", { skip }, async () => {
  process.env.RESEARCH_OS_AI_SEARCH = "1";
  const before = process.env.RESEARCH_OS_EVIDENCE_DIR;
  process.env.RESEARCH_OS_EVIDENCE_DIR = path.join(__dirname, "..", "no-corpus-here");
  try {
    const answer = await call("GET", null);
    assert.equal(answer.status, 401);
    assert.equal(answer.body.error, "no_session");
  } finally {
    if (before === undefined) delete process.env.RESEARCH_OS_EVIDENCE_DIR;
    else process.env.RESEARCH_OS_EVIDENCE_DIR = before;
  }
});
