import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "./facts";
import { roomCode, roomMeta } from "./room-meta";

test("room links carry their own canonical and og:url", () => {
  const m = roomMeta("play", "ab12cd");
  assert.equal(m.alternates?.canonical, `${SITE}/play/AB12CD`);
  const og = m.openGraph as { url?: string; title?: string; images?: { url: string; alt: string }[] };
  assert.equal(og.url, `${SITE}/play/AB12CD`);
  assert.match(og.title ?? "", /AB12CD/);
  assert.equal(og.images?.[0].alt, "Polingual room AB12CD");
  assert.ok(og.images?.[0].url.startsWith(SITE));
  assert.deepEqual(m.robots, { index: false, follow: true });
});

test("live quiz codes read as a live quiz", () => {
  const og = roomMeta("join", "QZ99").openGraph as { url?: string; title?: string };
  assert.equal(og.url, `${SITE}/join/QZ99`);
  assert.match(og.title ?? "", /live quiz/);
});

test("a bad code falls back to the lobby page", () => {
  assert.equal(roomCode("<script>"), null);
  assert.equal(roomMeta("play", "%3Cx%3E").alternates?.canonical, `${SITE}/play`);
});

test("a malformed percent escape falls back to the default room metadata", () => {
  for (const raw of ["%", "AB%ZZ", "%E0%A4%A"]) {
    assert.equal(roomCode(raw), null);
    const meta = roomMeta("play", raw);
    assert.deepEqual(meta.title, { absolute: "Play Polingual with friends · Polingual" });
    const live = roomMeta("join", raw);
    assert.deepEqual(live.title, { absolute: "Join a live Polingual quiz · Polingual" });
  }
});
