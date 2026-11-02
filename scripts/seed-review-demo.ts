import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isReviewDemoUser } from "../src/lib/academy/review-demo";
import { REVIEW_DISPLAY_NAME, REVIEW_GROUP_KIND, REVIEW_GROUP_NAME, REVIEW_PEER_NAME, reviewInviteCode, reviewPeerEmail, reviewProgressRows } from "../src/lib/academy/review-demo-seed";

const PEER_WORDS = ["one", "two", "three", "red"];
const PAGE_SIZE = 1000;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function findUser(auth: SupabaseClient["auth"]["admin"], email: string): Promise<User | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`list users failed with status ${error.status}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < PAGE_SIZE) return null;
  }
}

async function ensureUser(auth: SupabaseClient["auth"]["admin"], email: string): Promise<string> {
  const existing = await findUser(auth, email);
  if (!existing) {
    const { data, error } = await auth.createUser({ email, email_confirm: true, app_metadata: { review_demo: true } });
    if (error || !data.user) throw new Error(`create user failed with status ${error?.status}`);
    return data.user.id;
  }
  if (isReviewDemoUser(existing)) return existing.id;
  if (existing.last_sign_in_at) throw new Error("that address belongs to a real account, choose another REVIEW_DEMO_EMAIL");
  const { error } = await auth.updateUserById(existing.id, { app_metadata: { review_demo: true } });
  if (error) throw new Error(`mark user failed with status ${error.status}`);
  return existing.id;
}

async function ensureGroup(bucket: SupabaseClient, ownerId: string, peerId: string): Promise<string> {
  const { data, error } = await bucket.from("learning_groups").select("id,owner_id").in("owner_id", [ownerId, peerId]).eq("name", REVIEW_GROUP_NAME).limit(1).maybeSingle();
  if (error) throw new Error(`read group failed: ${error.message}`);
  if (data) {
    const update = await bucket.from("learning_groups").update({ owner_id: ownerId }).eq("id", data.id);
    if (update.error) throw new Error(`update group failed: ${update.error.message}`);
    return data.id as string;
  }
  const insert = await bucket.from("learning_groups").insert({ name: REVIEW_GROUP_NAME, kind: REVIEW_GROUP_KIND, owner_id: ownerId, invite_code: reviewInviteCode() }).select("id").single();
  if (insert.error) throw new Error(`create group failed: ${insert.error.message}`);
  return insert.data.id as string;
}

async function main(): Promise<void> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const email = required("REVIEW_DEMO_EMAIL").toLowerCase();
  const auth = { persistSession: false, autoRefreshToken: false };
  const admin = createClient(url, key, { auth }).auth.admin;
  const bucket = createClient(url, key, { auth, db: { schema: "bucket" } }) as unknown as SupabaseClient;
  const graph = createClient(url, key, { auth, db: { schema: "graph" } }) as unknown as SupabaseClient;

  const demoId = await ensureUser(admin, email);
  const peerId = await ensureUser(admin, reviewPeerEmail(email));

  const profile = await graph.from("learner_profiles").upsert({ learner_id: demoId, birth_year_bucket: "18plus", consent_status: "self" }, { onConflict: "learner_id" });
  if (profile.error) throw new Error(`write profile failed: ${profile.error.message}`);

  const now = Date.now();
  const progress = await bucket.from("academy_progress").upsert([...reviewProgressRows(demoId, now), ...reviewProgressRows(peerId, now, PEER_WORDS)], { onConflict: "user_id,branch" });
  if (progress.error) throw new Error(`write progress failed: ${progress.error.message}`);

  const groupId = await ensureGroup(bucket, demoId, peerId);
  const members = await bucket.from("group_members").upsert(
    [
      { group_id: groupId, user_id: demoId, role: "owner", display_name: REVIEW_DISPLAY_NAME },
      { group_id: groupId, user_id: peerId, role: "member", display_name: REVIEW_PEER_NAME },
    ],
    { onConflict: "group_id,user_id" },
  );
  if (members.error) throw new Error(`write members failed: ${members.error.message}`);

  const blocks = await bucket.from("group_blocks").delete().eq("blocker_id", demoId);
  if (blocks.error) console.warn("blocks left in place: group_blocks is unavailable");

  console.log("review demo ready: account, language set, progress, one group, two members");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "seed failed");
  process.exit(1);
});
