import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY, SITE_URL = "http://127.0.0.1:3000", GITHUB_ENV } = process.env;
if (!API_URL || !ANON_KEY || !SERVICE_ROLE_KEY) throw new Error("API_URL, ANON_KEY and SERVICE_ROLE_KEY come from supabase status -o env");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(API_URL, SERVICE_ROLE_KEY, opts);
const anon = createClient(API_URL, ANON_KEY, opts);
const graph = createClient(API_URL, SERVICE_ROLE_KEY, { ...opts, db: { schema: "graph" } });

async function session(email) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const v = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  if (v.error || !v.data.session) throw v.error ?? new Error("no session");
  return v.data.session;
}

const email = `android-smoke-${randomUUID()}@bucket.test`;
const created = await admin.auth.admin.createUser({ email, email_confirm: true });
if (created.error) throw created.error;
const uid = created.data.user.id;
const profile = await graph.from("learner_profiles").upsert({ learner_id: uid, birth_year_bucket: "18plus" });
if (profile.error) throw profile.error;

const web = await session(email);
const res = await fetch(`${SITE_URL}/api/academy/review-log`, {
  method: "POST",
  headers: { authorization: `Bearer ${web.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ reviews: [{ review_id: randomUUID(), branch: "lang", card_id: "es:smoke-web", rating: 3, level: "recall", reviewed_at: Date.now() - 60_000, tz: "UTC", atoms_version: "lang", device_id: "web-smoke" }] }),
});
if (res.status !== 200) throw new Error(`web review answered ${res.status}: ${await res.text()}`);

const phone = await session(email);
const lines = [`SMOKE_USER=${uid}`, `SMOKE_REFRESH_TOKEN=${phone.refresh_token}`];
if (GITHUB_ENV) appendFileSync(GITHUB_ENV, lines.join("\n") + "\n");
else console.log(lines.join("\n"));
console.log(`smoke user ${uid} ready with one web review`);
