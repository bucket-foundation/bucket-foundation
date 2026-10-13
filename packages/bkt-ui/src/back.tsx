import { useEffect, useState } from "react";
import { flushPendingSaves } from "./pending-saves";

export const BACK_LABEL = "Back";
export const BACK_NAME = "Back to the last screen";
export const BACK_HINT = "Back to the last screen. Alt with the left arrow key does the same.";
export const BACK_WAIT_MS = 80;

const KEY = "bucketDepth";

type Hist = Pick<History, "state" | "replaceState" | "pushState" | "back">;
type Later = (run: () => void, ms: number) => unknown;

function depthOf(state: unknown): number | null {
  const d = state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : null;
  return typeof d === "number" && Number.isInteger(d) && d >= 0 ? d : null;
}

function withDepth(state: unknown, depth: number): Record<string, unknown> {
  return { ...(state && typeof state === "object" ? (state as Record<string, unknown>) : {}), [KEY]: depth };
}

export class BackTrail {
  private depth: number;
  private moves = 0;
  private wentBack = false;
  private listeners = new Set<() => void>();

  constructor(
    private history: Hist,
    private later: Later = (run, ms) => setTimeout(run, ms),
  ) {
    this.depth = depthOf(history.state) ?? 0;
    const replace = history.replaceState.bind(history);
    const push = history.pushState.bind(history);
    history.replaceState = (state, unused, url) => replace(withDepth(state, this.depth), unused, url);
    history.pushState = (state, unused, url) => {
      this.depth += 1;
      this.moves += 1;
      push(withDepth(state, this.depth), unused, url);
      this.tell();
    };
    history.replaceState(history.state, "");
  }

  get canGoBack(): boolean {
    return this.depth > 0;
  }

  moved(): void {
    const seen = depthOf(this.history.state);
    const next = seen ?? this.depth + 1;
    this.moves += 1;
    if (seen === null) {
      this.depth = next;
      this.history.replaceState(this.history.state, "");
    } else this.depth = next;
    this.tell();
  }

  back(): boolean {
    if (!this.canGoBack) return false;
    flushPendingSaves();
    this.wentBack = true;
    this.history.back();
    return true;
  }

  takeBack(): boolean {
    const went = this.wentBack;
    this.wentBack = false;
    return went;
  }

  backUnlessMoved(): void {
    const before = this.moves;
    this.later(() => {
      if (this.moves === before) this.back();
    }, BACK_WAIT_MS);
  }

  watch(on: () => void): () => void {
    this.listeners.add(on);
    return () => void this.listeners.delete(on);
  }

  private tell(): void {
    for (const on of this.listeners) on();
  }
}

function editable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && typeof el.closest === "function" && !!el.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])");
}

export function isBackKey(e: Pick<KeyboardEvent, "key" | "code" | "altKey" | "metaKey" | "ctrlKey" | "shiftKey" | "target">): boolean {
  if (editable(e.target)) return false;
  if (e.key === "BrowserBack") return true;
  if (e.ctrlKey || e.shiftKey) return false;
  if (e.altKey && !e.metaKey && e.key === "ArrowLeft") return true;
  return e.metaKey && !e.altKey && e.code === "BracketLeft";
}

export const isBackMouse = (e: Pick<MouseEvent, "button">): boolean => e.button === 3;

export function attachBack(trail: BackTrail, win: Pick<Window, "addEventListener" | "removeEventListener">): () => void {
  const moved = () => trail.moved();
  const key = (e: KeyboardEvent) => {
    if (!isBackKey(e)) return;
    e.preventDefault();
    trail.backUnlessMoved();
  };
  const mouse = (e: MouseEvent) => {
    if (!isBackMouse(e)) return;
    e.preventDefault();
    if (e.type === "mouseup") trail.backUnlessMoved();
  };
  win.addEventListener("hashchange", moved);
  win.addEventListener("popstate", moved);
  win.addEventListener("keydown", key as EventListener);
  win.addEventListener("mousedown", mouse as EventListener);
  win.addEventListener("mouseup", mouse as EventListener);
  return () => {
    win.removeEventListener("hashchange", moved);
    win.removeEventListener("popstate", moved);
    win.removeEventListener("keydown", key as EventListener);
    win.removeEventListener("mousedown", mouse as EventListener);
    win.removeEventListener("mouseup", mouse as EventListener);
  };
}

export function focusScreen(doc: Pick<Document, "querySelector">): void {
  const target = doc.querySelector<HTMLElement>(".main h1") ?? doc.querySelector<HTMLElement>(".main");
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus();
}

let shared: BackTrail | null = null;

export function windowTrail(): BackTrail {
  shared ??= new BackTrail(window.history);
  return shared;
}

export function replaceHash(hash: string): void {
  windowTrail();
  window.history.replaceState(window.history.state, "", hash);
  window.dispatchEvent(new Event("hashchange"));
}

export function BackButton({ trail }: { trail: BackTrail }) {
  const [can, setCan] = useState(trail.canGoBack);
  useEffect(() => {
    setCan(trail.canGoBack);
    return trail.watch(() => setCan(trail.canGoBack));
  }, [trail]);
  return (
    <button type="button" className="go-back" aria-label={BACK_NAME} title={BACK_HINT} disabled={!can} onClick={() => trail.back()}>
      {BACK_LABEL}
    </button>
  );
}
