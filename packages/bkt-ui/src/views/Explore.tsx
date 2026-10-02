import { Component, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import ExploreClient from "@/app/explore/ExploreClient";
import { SAVED_KEY, parseStored, serializeSaved, type SavedState } from "@/lib/explore/saved";
import { CANON_TROUBLE, windowHref } from "../site-fetch";
import { plainError } from "../api";
import { webglAvailable } from "./CanonSearch";
import "../ros.css";

export interface ExploreApi {
  exploreSaved(): Promise<unknown>;
  putExploreSaved(state: unknown): Promise<unknown>;
  saveNote(note: { title: string; body: string; pinned: boolean }): Promise<unknown>;
  openLink(url: string): Promise<{ opened: string }>;
}

export const NO_GRAPHICS = "Bucket could not start 3D graphics on this computer, so Explore is hidden. Keyword search still works on the Canon screen.";
export const WINDOW_PLACEHOLDER = "Search papers, books, talks and canon excerpts";

export function hideAdvisors(root: Element): void {
  for (const label of Array.from(root.querySelectorAll<HTMLElement>("label"))) {
    if (/^Advisors\b/.test(label.textContent ?? "") && label.style.display !== "none") label.style.display = "none";
  }
  const source = root.querySelector<HTMLElement>('[data-testid="advisor-source"]');
  if (source && source.style.display !== "none") source.style.display = "none";
  const box = root.querySelector<HTMLInputElement>('[data-testid="explore-query"]');
  if (box && box.placeholder !== WINDOW_PLACEHOLDER) box.placeholder = WINDOW_PLACEHOLDER;
}

export const NOTES_TITLE = "Saved from Explore";

type Restore = () => void;

export function savedStorage(real: Storage | null, initial: string, push: (raw: string) => void): Storage {
  let saved = initial;
  const bridge = {
    get length() {
      return real?.length ?? 0;
    },
    key: (i: number) => real?.key(i) ?? null,
    getItem: (k: string) => (k === SAVED_KEY ? saved : (real?.getItem(k) ?? null)),
    setItem: (k: string, v: string) => {
      if (k !== SAVED_KEY) return real?.setItem(k, v);
      saved = String(v);
      push(saved);
    },
    removeItem: (k: string) => (k === SAVED_KEY ? void (saved = "") : real?.removeItem(k)),
    clear: () => real?.clear(),
  };
  return bridge as Storage;
}

export function installStorage(storage: Storage): Restore {
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  return () => {
    delete (window as { localStorage?: Storage }).localStorage;
  };
}

export function savedNote(state: SavedState): { title: string; body: string; pinned: boolean } {
  const lines = state.items.map((i) => `- ${i.citation || i.title}${i.url ? ` ${i.url}` : ""}`);
  return { title: NOTES_TITLE, body: lines.join("\n"), pinned: false };
}

function readLocal(): SavedState {
  try {
    return parseStored(window.localStorage.getItem(SAVED_KEY)).state;
  } catch {
    return parseStored(null).state;
  }
}

function realStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="muted">{NO_GRAPHICS}</p> : this.props.children;
  }
}

export function ExploreView({ api, webgl }: { api: ExploreApi; webgl?: boolean }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [drawable] = useState(() => webgl ?? webglAvailable());
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = frame.current;
    if (!root || !ready) return;
    hideAdvisors(root);
    const watch = new MutationObserver(() => hideAdvisors(root));
    watch.observe(root, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [ready]);

  useEffect(() => {
    let live = true;
    let restore: Restore | null = null;
    api.exploreSaved().then(
      (state) => {
        if (!live) return;
        const initial = serializeSaved(parseStored(JSON.stringify(state)).state);
        restore = installStorage(savedStorage(realStorage(), initial, (raw) => void api.putExploreSaved(JSON.parse(raw)).catch((e: Error) => setError(e.message))));
        setReady(true);
      },
      (e: Error) => {
        if (!live) return;
        setError(e.message);
        setReady(true);
      },
    );
    return () => {
      live = false;
      restore?.();
    };
  }, [api]);

  useEffect(() => {
    const on = (e: Event) => setError(plainError((e as CustomEvent<{ status: number }>).detail.status));
    window.addEventListener(CANON_TROUBLE, on);
    return () => window.removeEventListener(CANON_TROUBLE, on);
  }, []);

  const onLink = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as Element).closest("a");
    const to = a?.getAttribute("href") ?? "";
    if (!a || to.startsWith("#/")) return;
    e.preventDefault();
    if (/^https:\/\//.test(to)) return void api.openLink(to).catch((err: Error) => setError(err.message));
    if (to.endsWith("#saved")) return void document.getElementById("saved")?.scrollIntoView();
    const local = windowHref(to);
    if (local) window.location.hash = local;
  };

  const toNotes = async () => {
    const state = readLocal();
    if (state.items.length === 0) return setSent("Nothing is saved yet.");
    try {
      await api.saveNote(savedNote(state));
      setSent(`${state.items.length} saved ${state.items.length === 1 ? "item is" : "items are"} in Notes as “${NOTES_TITLE}”.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section>
      <header className="head slim">
        <h1>Explore</h1>
        <p className="muted">Papers, books, talks and canon excerpts on this computer. Search works with the network off.</p>
        <p className="links">
          <button className="link" onClick={() => void toNotes()}>
            Send my saved list to Notes
          </button>
          {sent && <span className="muted"> {sent}</span>}
        </p>
      </header>
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
      <div className="explore-site" ref={frame} onClickCapture={onLink}>
        {!drawable ? <p className="muted">{NO_GRAPHICS}</p> : ready ? <Guard><ExploreClient /></Guard> : <p className="muted">Opening Explore…</p>}
      </div>
    </section>
  );
}
