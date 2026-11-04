import test from "node:test";
import assert from "node:assert/strict";
import { moderationToken, normalizeShare, reportEmailText, shareRpcError, toSharedItem, verifyModerationToken, visibleItems, MAX_SHARE_IMAGE, MODERATION_TOKEN_TTL_MS, type SharedItemRow } from "../src/lib/academy/group-shares";
import type { MemberRow } from "../src/lib/academy/groups";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");

test("a web link passes with an optional note", () => {
  assert.deepEqual(normalizeShare({ kind: "url", url: "https://polingual.com/w?x=1", text: "  look  " }), { kind: "url", url: "https://polingual.com/w?x=1", body: "look", image: null });
});

test("links must be http or https", () => {
  assert.equal(normalizeShare({ kind: "url", url: "javascript:alert(1)" }), "bad_request");
  assert.equal(normalizeShare({ kind: "url", url: "file:///etc/passwd" }), "bad_request");
  assert.equal(normalizeShare({ kind: "url", url: "https://x.test/" + "a".repeat(2100) }), "bad_request");
});

test("text needs one to a thousand characters", () => {
  assert.equal(normalizeShare({ kind: "text", text: "   " }), "bad_request");
  assert.equal(normalizeShare({ kind: "text", text: "a".repeat(1001) }), "bad_request");
  assert.equal(normalizeShare({ kind: "text", text: 7 }), "bad_request");
  assert.deepEqual(normalizeShare({ kind: "text", text: "ciao" }), { kind: "text", url: null, body: "ciao", image: null });
});

test("the name filter runs over text and links", () => {
  assert.equal(normalizeShare({ kind: "text", text: "you sh1t" }), "text_not_allowed");
  assert.equal(normalizeShare({ kind: "url", url: "https://x.test/f%75ck" }), "text_not_allowed");
  assert.equal(normalizeShare({ kind: "url", url: "https://x.test/", text: "merde" }), "text_not_allowed");
  assert.equal(normalizeShare({ kind: "image", image: jpeg, text: "puta" }), "text_not_allowed");
});

test("images must be jpeg and under the size cap", () => {
  const share = normalizeShare({ kind: "image", image: jpeg });
  assert.ok(typeof share !== "string" && share.image?.length === 7);
  assert.equal(normalizeShare({ kind: "image", image: Buffer.from("GIF89a").toString("base64") }), "bad_request");
  assert.equal(normalizeShare({ kind: "image", image: "not base64!" }), "bad_request");
  const big = Buffer.alloc(MAX_SHARE_IMAGE + 10, 0xff).toString("base64");
  assert.equal(normalizeShare({ kind: "image", image: big }), "image_too_large");
});

test("unknown kinds and missing bodies are bad requests", () => {
  assert.equal(normalizeShare(null), "bad_request");
  assert.equal(normalizeShare({ kind: "video", url: "https://x.test" }), "bad_request");
});

const row = (over: Partial<SharedItemRow>): SharedItemRow => ({
  id: "i1",
  group_id: "g1",
  sender_id: "u1",
  recipient_id: null,
  kind: "text",
  url: null,
  body: "hi",
  image_path: null,
  created_at: "2026-11-04T10:00:00Z",
  held_at: null,
  removed_at: null,
  ...over,
});

test("visible items drop blocked senders, reported items and other people's direct items", () => {
  const rows = [
    row({ id: "a" }),
    row({ id: "b", sender_id: "blocked" }),
    row({ id: "c", recipient_id: "u3" }),
    row({ id: "d", recipient_id: "me" }),
    row({ id: "e", sender_id: "me", recipient_id: "u3" }),
    row({ id: "f" }),
    row({ id: "g", removed_at: "2026-11-04T11:00:00Z" }),
    row({ id: "h", held_at: "2026-11-04T11:00:00Z" }),
  ];
  const shown = visibleItems(rows, "me", new Set(["blocked"]), new Set(["f"]));
  assert.deepEqual(shown.map((r) => r.id), ["a", "d", "e"]);
});

test("items carry the sender name and mark my own", () => {
  const members: MemberRow[] = [{ group_id: "g1", user_id: "u1", role: "owner", display_name: "Gia", joined_at: "" }];
  const item = toSharedItem(row({}), members, "u1", "https://signed");
  assert.equal(item.fromName, "Gia");
  assert.equal(item.mine, true);
  assert.equal(item.imageUrl, "https://signed");
  assert.equal(toSharedItem(row({ sender_id: "gone" }), members, "u1").fromName, "");
});

test("database errors map to client codes", () => {
  assert.deepEqual(shareRpcError("ERROR: share_limit"), { error: "share_limit", status: 429 });
  assert.deepEqual(shareRpcError("not_member"), { error: "not_found", status: 404 });
  assert.equal(shareRpcError("boom"), null);
});

const ITEM = "0b6f1f0e-8a52-4c1e-9b8e-6d6f5b0a1c2d";

test("moderation tokens verify, expire and resist tampering", () => {
  const now = 1_800_000_000_000;
  const t = moderationToken(ITEM, "remove", "s3cret", now);
  assert.deepEqual(verifyModerationToken(t, "s3cret", now + 1000), { itemId: ITEM, action: "remove" });
  assert.equal(verifyModerationToken(t, "other", now), null);
  assert.equal(verifyModerationToken(t, undefined, now), null);
  assert.equal(verifyModerationToken(t, "s3cret", now + MODERATION_TOKEN_TTL_MS + 1), null);
  const [body, mac] = t.split(".");
  const forged = Buffer.from(`${ITEM}.restore.${now + MODERATION_TOKEN_TTL_MS}`).toString("base64url");
  assert.equal(verifyModerationToken(`${forged}.${mac}`, "s3cret", now), null);
  assert.equal(verifyModerationToken(`${body}.${mac}.x`, "s3cret", now), null);
  assert.equal(verifyModerationToken(42, "s3cret", now), null);
});

test("the report email carries ids and links only", () => {
  const text = reportEmailText({ itemId: ITEM, groupId: "g1", senderId: "u1", reporterId: "u2", reason: "harassment", reports: 1, removeUrl: "https://x/remove", restoreUrl: "https://x/restore" });
  assert.match(text, new RegExp(ITEM));
  assert.match(text, /hidden from everyone/);
  assert.match(text, /https:\/\/x\/remove/);
  assert.doesNotMatch(text, /ciao|https:\/\/polingual/);
  assert.match(reportEmailText({ itemId: ITEM, groupId: "g1", senderId: "u1", reporterId: "u2", reason: "spam", reports: 1, removeUrl: null, restoreUrl: null }), /MODERATION_SECRET is unset/);
});
