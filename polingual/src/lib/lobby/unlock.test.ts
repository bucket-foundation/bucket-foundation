import assert from "node:assert/strict";
import { test } from "node:test";
import { installAudioUnlock, UNLOCK_EVENTS } from "./unlock";
import { resetSound, unlockSound } from "./sound";
import { resetPlayer, unlockSpeech } from "../speak";

const tick = () => new Promise((r) => setTimeout(r, 0));

function fakeTarget() {
  const handlers = new Map<string, () => void>();
  return {
    handlers,
    addEventListener: (type: string, fn: () => void) => void handlers.set(type, fn),
    removeEventListener: (type: string, fn: () => void) => {
      if (handlers.get(type) === fn) handlers.delete(type);
    },
    fire: (type: string) => handlers.get(type)?.(),
  };
}

test("the unlock listens for every gesture and stays armed until audio runs", async () => {
  const t = fakeTarget();
  const results = [false, true];
  let calls = 0;
  installAudioUnlock(t, () => Promise.resolve(results[calls++]));
  assert.deepEqual([...t.handlers.keys()].sort(), [...UNLOCK_EVENTS].sort());
  t.fire("touchend");
  await tick();
  assert.equal(calls, 1);
  assert.equal(t.handlers.size, UNLOCK_EVENTS.length);
  t.fire("click");
  await tick();
  assert.equal(calls, 2);
  assert.equal(t.handlers.size, 0);
});

test("a gesture during a pending unlock does not start a second one, and a rejection keeps it armed", async () => {
  const t = fakeTarget();
  let calls = 0;
  let fail!: () => void;
  installAudioUnlock(t, () => {
    calls++;
    return new Promise<boolean>((_, reject) => (fail = () => reject(new Error("blocked"))));
  });
  t.fire("pointerup");
  t.fire("click");
  assert.equal(calls, 1);
  fail();
  await tick();
  assert.equal(t.handlers.size, UNLOCK_EVENTS.length);
  t.fire("keydown");
  assert.equal(calls, 2);
});

class FakeContext {
  static made = 0;
  static startRunning = false;
  static resumeOk = true;
  state: string;
  started = 0;
  destination = {};
  constructor() {
    FakeContext.made++;
    this.state = FakeContext.startRunning ? "running" : "suspended";
  }
  resume() {
    if (!FakeContext.resumeOk) return Promise.reject(new Error("not allowed"));
    this.state = "running";
    return Promise.resolve();
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    return { buffer: null, connect: () => undefined, start: () => void this.started++ };
  }
}

test("unlockSound resumes a suspended context and reports when it runs", async () => {
  FakeContext.made = 0;
  FakeContext.resumeOk = true;
  (globalThis as Record<string, unknown>).window = { AudioContext: FakeContext };
  resetSound();
  assert.equal(await unlockSound(), true);
  assert.equal(await unlockSound(), true);
  assert.equal(FakeContext.made, 1);
});

test("unlockSound reports false when the browser refuses to resume", async () => {
  FakeContext.resumeOk = false;
  (globalThis as Record<string, unknown>).window = { AudioContext: FakeContext };
  resetSound();
  assert.equal(await unlockSound(), false);
  FakeContext.resumeOk = true;
});

test("unlockSound reports false when the context throws", async () => {
  (globalThis as Record<string, unknown>).window = {
    AudioContext: class {
      constructor() {
        throw new Error("no audio");
      }
    },
  };
  resetSound();
  assert.equal(await unlockSound(), false);
});

class FakeAudio {
  static plays = 0;
  static reject = false;
  src = "";
  paused = true;
  preload = "";
  play() {
    FakeAudio.plays++;
    if (FakeAudio.reject) return Promise.reject(new Error("NotAllowedError"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

function installSpeech() {
  const spoken: { text: string; volume: number }[] = [];
  const g = globalThis as Record<string, unknown>;
  g.Audio = FakeAudio;
  g.SpeechSynthesisUtterance = class {
    text: string;
    volume = 1;
    constructor(text: string) {
      this.text = text;
    }
  };
  g.window = { speechSynthesis: { speaking: false, pending: false, speak: (u: { text: string; volume: number }) => spoken.push(u), cancel: () => undefined, getVoices: () => [] } };
  return spoken;
}

test("unlockSpeech primes the shared player once with silence and a muted empty utterance", async () => {
  const spoken = installSpeech();
  resetPlayer();
  FakeAudio.plays = 0;
  FakeAudio.reject = false;
  unlockSpeech();
  await tick();
  unlockSpeech();
  await tick();
  assert.equal(FakeAudio.plays, 1);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "");
  assert.equal(spoken[0].volume, 0);
});

test("unlockSpeech tries again on the next gesture when the first play is refused", async () => {
  installSpeech();
  resetPlayer();
  FakeAudio.plays = 0;
  FakeAudio.reject = true;
  unlockSpeech();
  await tick();
  FakeAudio.reject = false;
  unlockSpeech();
  await tick();
  unlockSpeech();
  await tick();
  assert.equal(FakeAudio.plays, 2);
});
