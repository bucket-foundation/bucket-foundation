import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIRST_LESSON_KEY, appGate, firstLessonDone, markFirstLesson, notifyFirstLesson } from "./first-lesson";

function memory(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size; } } as Storage;
}

test("a locked learner reaches the app until the first lesson is done, then the paywall", () => {
  assert.equal(appGate("locked", false), "app");
  assert.equal(appGate("unknown", false), "app");
  assert.equal(appGate("locked", true), "paywall");
  assert.equal(appGate("unknown", true), "paywall");
});

test("subscribers and pending checks never see the paywall", () => {
  assert.equal(appGate("open", true), "app");
  assert.equal(appGate("open", false), "app");
  assert.equal(appGate("checking", true), "checking");
});

test("finishing the first lesson is stored and announced", () => {
  const store = memory();
  const target = new EventTarget();
  let heard = 0;
  target.addEventListener("polingual-first-lesson", () => heard++);
  assert.equal(firstLessonDone(store), false);
  markFirstLesson(store, null);
  assert.equal(store.getItem(FIRST_LESSON_KEY), "1");
  assert.equal(firstLessonDone(store), true);
  assert.equal(heard, 0);
  notifyFirstLesson(target);
  assert.equal(heard, 1);
});

test("a storage that throws reads as not done", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
  assert.equal(firstLessonDone(broken), false);
  assert.doesNotThrow(() => markFirstLesson(broken, null));
});

test("the shell gates on the first lesson and the session marks it on the done screen", () => {
  const shell = readFileSync(join(process.cwd(), "src/app/(site)/app/AppShell.tsx"), "utf8");
  assert.match(shell, /appGate\(access\.status, lessonDone\)/);
  assert.match(shell, /gate === "paywall" \? <Paywall/);
  const session = readFileSync(join(process.cwd(), "src/app/(site)/app/[system]/study/Session.tsx"), "utf8");
  assert.match(session, /function SessionDone[\s\S]*markFirstLesson\(/);
  assert.match(session, /notifyFirstLesson\(\); s\.restart\(\)/);
});
