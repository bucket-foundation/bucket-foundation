import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAPH_BASE, missingEnv, sendPost, TIKTOK_INIT_URL, TIKTOK_TOKEN_URL } from "./send";
import { memWriter, post, POST_ID } from "./fixtures";
import { parseCarousel, SLIDE_PATH, slidePath } from "./carousel";

const ADMIN = "gianyrox@gmail.com";
const NOW = new Date("2026-11-26T12:00:00Z");
const TT = { TIKTOK_CLIENT_KEY: "ck", TIKTOK_CLIENT_SECRET: "cs", TIKTOK_REFRESH_TOKEN: "rt", TIKTOK_PUBLIC_BASE: "https://polingual.com/media/social/" };
const IG = { INSTAGRAM_USER_ID: "17841", INSTAGRAM_ACCESS_TOKEN: "igt", POLINGUAL_DB_URL: "https://db.test" };
const approved = () => post({ approved_at: NOW.toISOString(), approved_by: ADMIN });

function fake(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; body: string }[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body ?? "") });
    return handler(url, init);
  };
  return { send, calls };
}

const none = () => fake(() => { throw new Error("no network expected"); });

test("missing credentials name each env var and make no call", async () => {
  assert.deepEqual(missingEnv("tiktok", {}), ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN", "TIKTOK_PUBLIC_BASE"]);
  assert.deepEqual(missingEnv("instagram", { INSTAGRAM_USER_ID: "1" }), ["INSTAGRAM_ACCESS_TOKEN", "POLINGUAL_DB_URL"]);
  const f = none();
  const r = await sendPost(memWriter([approved()]), ADMIN, POST_ID, "instagram", { INSTAGRAM_USER_ID: "1" }, f.send);
  assert.deepEqual(r, { ok: false, error: "missing_env", missing: ["INSTAGRAM_ACCESS_TOKEN", "POLINGUAL_DB_URL"] });
  assert.equal(f.calls.length, 0);
});

test("send refuses unapproved, skipped, resent and anonymous requests", async () => {
  const f = none();
  assert.deepEqual(await sendPost(memWriter([post()]), ADMIN, POST_ID, "tiktok", TT, f.send), { ok: false, error: "not_approved" });
  assert.deepEqual(await sendPost(memWriter([post({ status: "skipped", approved_at: "x" })]), ADMIN, POST_ID, "tiktok", TT, f.send), { ok: false, error: "skipped" });
  assert.deepEqual(await sendPost(memWriter([post({ approved_at: "x", sent: { tiktok: { id: "1", at: "x", mode: "MEDIA_UPLOAD", state: "sent" } } })]), ADMIN, POST_ID, "tiktok", TT, f.send), { ok: false, error: "already_sent" });
  assert.deepEqual(await sendPost(memWriter([approved()]), null, POST_ID, "tiktok", TT, f.send), { ok: false, error: "forbidden" });
  assert.deepEqual(await sendPost(memWriter([approved()]), ADMIN, POST_ID, "youtube", TT, f.send), { ok: false, error: "bad_platform" });
  assert.equal(f.calls.length, 0);
});

test("TikTok send refreshes the token and posts a MEDIA_UPLOAD draft", async () => {
  const rows = [approved()];
  const f = fake((url) => {
    if (url === TIKTOK_TOKEN_URL) return new Response(JSON.stringify({ access_token: "at" }), { status: 200 });
    if (url === TIKTOK_INIT_URL) return new Response(JSON.stringify({ data: { publish_id: "pub_1" }, error: { code: "ok" } }), { status: 200 });
    throw new Error(url);
  });
  const r = await sendPost(memWriter(rows), ADMIN, POST_ID, "tiktok", TT, f.send, NOW);
  assert.deepEqual(r, { ok: true, id: "pub_1", mode: "MEDIA_UPLOAD" });
  assert.match(f.calls[0].body, /grant_type=refresh_token/);
  const payload = JSON.parse(f.calls[1].body);
  assert.equal(payload.post_mode, "MEDIA_UPLOAD");
  assert.equal(payload.post_info.privacy_level, "SELF_ONLY");
  assert.deepEqual(payload.source_info.photo_images, ["https://polingual.com/media/social/night/slide-1.jpg", "https://polingual.com/media/social/night/slide-2.jpg"]);
  assert.equal(payload.post_info.description, "Night, Nacht, noche.\n\n#etymology #spanish");
  assert.equal(rows[0].status, "draft_delivered");
  assert.deepEqual(rows[0].sent.tiktok, { id: "pub_1", at: NOW.toISOString(), mode: "MEDIA_UPLOAD", state: "sent" });
});

test("TikTok errors come back with the platform message", async () => {
  const rows = [approved()];
  const f = fake((url) => (url === TIKTOK_TOKEN_URL ? new Response(JSON.stringify({ access_token: "at" })) : new Response(JSON.stringify({ error: { code: "url_ownership_unverified", message: "verify the domain" } }), { status: 403 })));
  const r = await sendPost(memWriter(rows), ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.error === "platform_error" && /verify the domain/.test(r.detail ?? ""));
  assert.deepEqual(rows[0].sent, {});
});

test("TikTok token failure stops before the post call", async () => {
  const f = fake(() => new Response(JSON.stringify({ error: "invalid_grant", error_description: "refresh token expired" }), { status: 400 }));
  const r = await sendPost(memWriter([approved()]), ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.ok(!r.ok && /refresh token expired/.test(r.detail ?? ""));
  assert.equal(f.calls.length, 1);
});

test("a TikTok human check stops the send", async () => {
  const f = fake((url) => (url === TIKTOK_TOKEN_URL ? new Response(JSON.stringify({ access_token: "at" })) : new Response("please complete the captcha", { status: 403 })));
  const r = await sendPost(memWriter([approved()]), ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.ok(!r.ok && r.error === "human_check");
});

test("Instagram send builds items, a carousel, then publishes", async () => {
  const rows = [approved()];
  let n = 0;
  const f = fake((url) => {
    if (url === `${GRAPH_BASE}/17841/media`) return new Response(JSON.stringify({ id: `c${++n}` }));
    if (url === `${GRAPH_BASE}/17841/media_publish`) return new Response(JSON.stringify({ id: "media_9" }));
    throw new Error(url);
  });
  const r = await sendPost(memWriter(rows), ADMIN, POST_ID, "instagram", IG, f.send, NOW);
  assert.deepEqual(r, { ok: true, id: "media_9", mode: "PUBLISH" });
  assert.equal(f.calls.length, 4);
  const first = new URLSearchParams(f.calls[0].body);
  assert.equal(first.get("image_url"), "https://db.test/storage/v1/object/public/polingual-social/night/slide-1.jpg");
  assert.equal(first.get("is_carousel_item"), "true");
  const carousel = new URLSearchParams(f.calls[2].body);
  assert.equal(carousel.get("media_type"), "CAROUSEL");
  assert.equal(carousel.get("children"), "c1,c2");
  assert.equal(new URLSearchParams(f.calls[3].body).get("creation_id"), "c3");
  assert.equal(rows[0].status, "posted");
});

test("TikTok still sends after Instagram marked the row posted", async () => {
  const rows = [approved()];
  rows[0].status = "posted";
  rows[0].sent = { instagram: { id: "m", at: "x", mode: "PUBLISH", state: "sent" } };
  const f = fake((url) => (url === TIKTOK_TOKEN_URL ? new Response(JSON.stringify({ access_token: "at" })) : new Response(JSON.stringify({ data: { publish_id: "p2" } }))));
  const r = await sendPost(memWriter(rows), ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.ok(r.ok);
  assert.equal(rows[0].status, "posted");
  assert.ok(rows[0].sent.instagram && rows[0].sent.tiktok);
});

test("Instagram item failure reports the step", async () => {
  const f = fake(() => new Response(JSON.stringify({ error: { message: "Only photo or video can be accepted" } }), { status: 400 }));
  const r = await sendPost(memWriter([approved()]), ADMIN, POST_ID, "instagram", IG, f.send);
  assert.ok(!r.ok && r.detail === "instagram item 400: Only photo or video can be accepted");
});

test("parseCarousel reads the folder contract", () => {
  const c = parseCarousel("001-night", {
    meta: JSON.stringify({ slug: "night", post_date: "2026-12-01", platform: "tiktok" }),
    caption: "Night grew from one word.\n\n#languagelearning #polyglot\n",
    hashtags: "#languagelearning #polyglot\n",
    slides: ["slide-10.png", "slide-2.png", "slide-1.png", "notes.txt"],
  });
  assert.equal(c.caption, "Night grew from one word.");
  assert.equal(c.hashtags, "#languagelearning #polyglot");
  assert.deepEqual(c.slideNumbers, [1, 2, 10]);
  const p = slidePath("night", 10, "ab".repeat(32));
  assert.equal(p, "night/slide-10-abababababab.jpg");
  assert.ok(SLIDE_PATH.test(p));
  assert.ok(!SLIDE_PATH.test("night/slide-1.jpg"));
  assert.ok(!SLIDE_PATH.test("../x/slide-1-abababababab.jpg"));
  assert.throws(() => parseCarousel("002-x", { meta: "{}", caption: "", hashtags: "", slides: ["slide-1.png"] }), /post_date/);
});

const ttOk = () => fake((url) => (url === TIKTOK_TOKEN_URL ? new Response(JSON.stringify({ access_token: "at" })) : new Response(JSON.stringify({ data: { publish_id: "pub" } }))));

test("a double submit publishes once", async () => {
  const rows = [approved()];
  const w = memWriter(rows);
  const f = ttOk();
  const [a, b] = await Promise.all([sendPost(w, ADMIN, POST_ID, "tiktok", TT, f.send), sendPost(w, ADMIN, POST_ID, "tiktok", TT, f.send)]);
  assert.equal([a, b].filter((r) => r.ok).length, 1);
  assert.ok([a, b].some((r) => !r.ok && r.error === "already_sent"));
  assert.equal(f.calls.filter((c) => c.url === TIKTOK_INIT_URL).length, 1);
});

test("a failed stamp after publish keeps the claim so a retry never republishes", async () => {
  const rows = [approved()];
  const w = memWriter(rows);
  w.update = async () => false;
  const f = ttOk();
  const r = await sendPost(w, ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.ok(!r.ok && r.error === "update_failed" && /pub/.test(r.detail ?? ""));
  assert.equal(rows[0].sent.tiktok?.state, "sending");
  const again = await sendPost(memWriter(rows), ADMIN, POST_ID, "tiktok", TT, f.send);
  assert.deepEqual(again, { ok: false, error: "already_sent" });
  assert.equal(f.calls.filter((c) => c.url === TIKTOK_INIT_URL).length, 1);
});

test("a lost claim race makes no platform call", async () => {
  const w = memWriter([approved()]);
  w.claim = async () => false;
  const f = none();
  assert.deepEqual(await sendPost(w, ADMIN, POST_ID, "instagram", IG, f.send), { ok: false, error: "already_sent" });
  assert.equal(f.calls.length, 0);
});
