import { test } from "node:test";
import assert from "node:assert/strict";
import { seatAllowed, wantsScreen } from "@academy/lobbies";
import { tvPath } from "./tv";

test("wantsScreen reads only a literal true screen flag", () => {
  assert.equal(wantsScreen({ screen: true }), true);
  assert.equal(wantsScreen({ screen: "true" }), false);
  assert.equal(wantsScreen({}), false);
  assert.equal(wantsScreen(null), false);
});

test("a screen seat reads state and nothing else", () => {
  assert.equal(seatAllowed("player", false), true);
  assert.equal(seatAllowed("player", true), true);
  assert.equal(seatAllowed("screen", true), true);
  assert.equal(seatAllowed("screen", false), false);
  assert.equal(seatAllowed(null, true), false);
});

test("tvPath points at the TV screen for a room", () => {
  assert.equal(tvPath("ABC123"), "/play/tv/ABC123");
});
