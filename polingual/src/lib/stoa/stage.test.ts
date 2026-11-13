import { test } from "node:test";
import assert from "node:assert/strict";
import { Stage } from "./stage";

type Utter = { text: string; voice?: unknown; lang?: string; rate?: number; pitch?: number; onstart?: () => void; onend?: () => void; onerror?: () => void };

function fakeSpeech() {
  const spoken: string[] = [];
  let live: Utter[] = [];
  const synth = {
    getVoices: () => [{ lang: "en-US", name: "Samantha" }, { lang: "es-ES", name: "Monica" }],
    speak: (u: Utter) => {
      spoken.push(u.text);
      live.push(u);
    },
    cancel: () => {
      const dead = live;
      live = [];
      for (const u of dead) u.onerror?.();
    },
  };
  const g = globalThis as Record<string, unknown>;
  g.speechSynthesis = synth;
  g.SpeechSynthesisUtterance = class {
    text: string;
    constructor(t: string) {
      this.text = t;
    }
  };
  const finish = () => {
    const u = live.shift();
    u?.onend?.();
  };
  return { spoken, finish };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("a new line set cancels the old one without the stale chain speaking", async () => {
  const f = fakeSpeech();
  const s = new Stage({ music: true, voice: true, sfx: true });
  s.say([{ text: "one" }, { text: "two" }, { text: "three" }]);
  s.say([{ text: "alpha" }, { text: "beta" }]);
  await wait(200);
  f.finish();
  await wait(200);
  f.finish();
  await wait(200);
  assert.deepEqual(f.spoken, ["one", "alpha", "beta"]);
});

test("stop silences the queue", async () => {
  const f = fakeSpeech();
  const s = new Stage({ music: true, voice: true, sfx: true });
  s.say([{ text: "one" }, { text: "two" }]);
  s.stop();
  await wait(200);
  assert.deepEqual(f.spoken, ["one"]);
});

test("a word speaks in its own language voice and skips when none exists", async () => {
  const f = fakeSpeech();
  const s = new Stage({ music: true, voice: true, sfx: true });
  s.say([{ text: "agua", lang: "es", word: true }, { text: "Wasser", lang: "de", word: true }, { text: "done" }]);
  await wait(50);
  f.finish();
  await wait(450);
  assert.deepEqual(f.spoken, ["agua", "done"]);
});

test("narrator off says nothing", () => {
  const f = fakeSpeech();
  const s = new Stage({ music: true, voice: false, sfx: true });
  s.say([{ text: "one" }]);
  assert.deepEqual(f.spoken, []);
});
