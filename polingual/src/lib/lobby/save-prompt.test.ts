import { test } from "node:test";
import assert from "node:assert/strict";
import { markSavePrompt, savePromptDue } from "./save-prompt";
import { roomControls } from "./room";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("save prompt shows once for guests and never for signed-in players", () => {
  const s = memory();
  assert.equal(savePromptDue(s, false), false);
  assert.equal(savePromptDue(s, true), true);
  markSavePrompt(s);
  assert.equal(savePromptDue(s, true), false);
  assert.equal(savePromptDue(null, true), false);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(savePromptDue(broken, true), false);
  assert.doesNotThrow(() => markSavePrompt(broken));
});

test("a joined player sees no host controls in any room phase", () => {
  for (const status of ["lobby", "playing", "done"] as const) {
    const c = roomControls({ isHost: false, status, botsEnabled: true, botFill: false, standing: false, canEnd: true });
    assert.deepEqual({ ...c, invite: false }, { start: false, fillBots: false, bigScreen: false, settings: false, nextNow: false, end: false, invite: false });
    assert.equal(c.invite, true);
  }
});

test("the host gets each control in its phase", () => {
  const lobby = roomControls({ isHost: true, status: "lobby", botsEnabled: true, botFill: false, standing: false });
  assert.equal(lobby.start && lobby.fillBots && lobby.settings && lobby.bigScreen, true);
  assert.equal(lobby.nextNow, false);
  const done = roomControls({ isHost: true, status: "done", botsEnabled: true, botFill: false, standing: false });
  assert.equal(done.nextNow, true);
  assert.equal(done.start || done.settings, false);
  assert.equal(roomControls({ isHost: true, status: "lobby", botsEnabled: true, botFill: true, standing: false }).fillBots, false);
});

test("only the host ends a game, during play or results, and never twice", () => {
  const base = { isHost: true, botsEnabled: false, botFill: false, standing: false, canEnd: true };
  assert.equal(roomControls({ ...base, status: "playing" }).end, true);
  assert.equal(roomControls({ ...base, status: "done" }).end, true);
  assert.equal(roomControls({ ...base, status: "lobby" }).end, false);
  assert.equal(roomControls({ ...base, status: "done", ended: true }).end, false);
  assert.equal(roomControls({ ...base, status: "playing", canEnd: false }).end, false);
  assert.equal(roomControls({ ...base, isHost: false, status: "playing" }).end, false);
});
