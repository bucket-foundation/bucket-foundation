import type { Access } from "./plans";
import { local } from "../storage";

export const FIRST_LESSON_KEY = "polingual-first-lesson-done";
const EVENT = "polingual-first-lesson";

export type Gate = "checking" | "app" | "paywall";

export function appGate(access: Access["status"], firstLessonDone: boolean): Gate {
  if (access === "checking") return "checking";
  if (access === "open") return "app";
  return firstLessonDone ? "paywall" : "app";
}

export function firstLessonDone(store: Storage | null = local()): boolean {
  try {
    return store?.getItem(FIRST_LESSON_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstLesson(store: Storage | null = local(), target: EventTarget | null = typeof window === "undefined" ? null : window): void {
  try {
    store?.setItem(FIRST_LESSON_KEY, "1");
  } catch {
    return;
  }
  target?.dispatchEvent(new Event(EVENT));
}

export function notifyFirstLesson(target: EventTarget | null = typeof window === "undefined" ? null : window): void {
  target?.dispatchEvent(new Event(EVENT));
}

export function subscribeFirstLesson(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
