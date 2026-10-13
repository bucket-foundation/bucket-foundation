"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_SAVED,
  SAVED_KEY,
  bibtex,
  changeSaved,
  citable,
  safeUrl,
  buildSavedItem,
  exportFileName,
  exportSaved,
  hasSaved,
  readSaved,
  type CiteFields,
  type SavedChange,
  type SavedItem,
  type SavedState,
  type StorageLike,
} from "@/lib/explore/saved";

export const COPY = {
  cite: "Cite",
  save: "Save",
  saved: "Saved",
  remove: "Remove",
  citeCopied: "Citation copied.",
  citeFailed: "Copy did not work. Select the citation and copy it by hand.",
  reference: "Copy for a reference manager",
  referenceCopied: "Copied for your reference manager.",
  panelTitle: "Saved",
  empty: "Nothing saved yet. Press Save on a result to keep it here.",
  download: "Download my saved list",
  downloaded: "Your saved list is in your downloads.",
  firstNotice: "Saved on this device, in this browser. Download your list to keep a copy.",
  gotIt: "Got it",
  blockedNotice: "This browser is not keeping saves. Your list lasts until you leave this page. Download it to keep a copy.",
  full: "Your saved list is full. Remove an item to save another.",
  noAuthor: "No author is listed for this item, so it has no citation.",
  seeSaved: "See your saved list",
} as const;

const mono = { fontFamily: "var(--font-jetbrains)" };
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gold)]";
const BUTTON = `border hairline px-2 py-1 text-xs ${FOCUS}`;

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export interface SavedApi {
  state: SavedState;
  kept: boolean;
  ready: boolean;
  full: boolean;
  has: (id: string) => boolean;
  save: (item: SavedItem) => void;
  remove: (id: string) => void;
  dismissNotice: () => void;
}

export function useSaved(): SavedApi {
  const [state, setState] = useState<SavedState>(EMPTY_SAVED);
  const [kept, setKept] = useState(true);
  const [ready, setReady] = useState(false);
  const [full, setFull] = useState(false);
  const current = useRef<SavedState>(EMPTY_SAVED);

  const put = useCallback((next: SavedState, ok: boolean) => {
    current.current = next;
    setState(next);
    setKept(ok);
  }, []);

  useEffect(() => {
    const sync = () => {
      const r = readSaved(browserStorage());
      if (r.ok) put(r.state, true);
      else setKept(false);
      setReady(true);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SAVED_KEY) sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [put]);

  const change = useCallback(
    (c: SavedChange) => {
      const r = changeSaved(browserStorage(), current.current, c);
      put(r.state, r.kept);
      return r.state;
    },
    [put],
  );

  const save = useCallback((item: SavedItem) => setFull(!hasSaved(change({ add: item }), item.id)), [change]);
  const remove = useCallback(
    (id: string) => {
      setFull(false);
      change({ remove: id });
    },
    [change],
  );
  const dismissNotice = useCallback(() => void change({ noticeSeen: true }), [change]);
  const has = useCallback((id: string) => hasSaved(state, id), [state]);

  return { state, kept, ready, full, has, save, remove, dismissNotice };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SaveButton({ fields, saved, className = BUTTON }: { fields: CiteFields; saved: SavedApi; className?: string }) {
  const on = saved.has(fields.id);
  return (
    <button
      type="button"
      data-testid="save-button"
      aria-pressed={on}
      aria-label={`${on ? COPY.saved : COPY.save}: ${fields.title}`}
      className={className}
      style={mono}
      onClick={() => (on ? saved.remove(fields.id) : saved.save(buildSavedItem(fields, new Date())))}
    >
      {on ? COPY.saved : COPY.save}
    </button>
  );
}

export function ResultActions({ fields, saved }: { fields: CiteFields; saved: SavedApi }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const item = buildSavedItem(fields, new Date(0));
  const canCite = citable(fields);

  const cite = async () => {
    setOpen(true);
    setStatus((await copyText(item.citation)) ? COPY.citeCopied : COPY.citeFailed);
  };
  const reference = async () => {
    setStatus((await copyText(bibtex(item))) ? COPY.referenceCopied : COPY.citeFailed);
  };

  return (
    <div data-testid="result-actions" className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {canCite && <button type="button" data-testid="cite-button" aria-expanded={open} aria-label={`${COPY.cite}: ${fields.title}`} className={BUTTON} style={mono} onClick={cite}>
          {COPY.cite}
        </button>}
        <SaveButton fields={fields} saved={saved} />
        <span role="status" aria-live="polite" data-testid="cite-status" className="text-xs" style={{ color: "var(--parchment-dim)" }}>
          {status}
        </span>
      </div>
      {open && canCite && (
        <div className="mt-2 text-sm">
          <p data-testid="cite-text" className="border hairline px-2 py-1 select-all break-words">
            {item.citation}
          </p>
          <button type="button" data-testid="reference-button" className={`${BUTTON} mt-2`} style={mono} onClick={reference}>
            {COPY.reference}
          </button>
        </div>
      )}
    </div>
  );
}

function download(state: SavedState): boolean {
  try {
    const now = new Date();
    const blob = new Blob([JSON.stringify(exportSaved(state, now), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = exportFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return true;
  } catch {
    return false;
  }
}

export function SavedPanel({ saved }: { saved: SavedApi }) {
  const [status, setStatus] = useState("");
  const { items, noticeSeen } = saved.state;
  return (
    <section id="saved" data-testid="saved-panel" aria-labelledby="saved-heading" className="border hairline p-4 mt-6">
      <h2 id="saved-heading" className="text-xs uppercase" style={{ ...mono, color: "var(--parchment-dim)" }}>
        {COPY.panelTitle} ({items.length})
      </h2>
      {saved.ready && !saved.kept && (
        <p data-testid="saved-blocked" role="status" className="text-sm mt-2">
          {COPY.blockedNotice}
        </p>
      )}
      {saved.kept && items.length > 0 && !noticeSeen && (
        <p data-testid="saved-notice" role="status" className="text-sm mt-2">
          {COPY.firstNotice}{" "}
          <button type="button" className={BUTTON} style={mono} onClick={saved.dismissNotice}>
            {COPY.gotIt}
          </button>
        </p>
      )}
      {saved.full && (
        <p role="alert" className="text-sm mt-2">
          {COPY.full}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm mt-2">{COPY.empty}</p>
      ) : (
        <>
          <ul data-testid="saved-list" className="mt-2 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} data-testid="saved-item" className="flex items-start justify-between gap-3">
                <span className="break-words min-w-0">
                  {i.url && safeUrl(i.url) ? (
                    <a className={`underline ${FOCUS}`} href={i.url} target="_blank" rel="noreferrer">
                      {i.title}
                    </a>
                  ) : (
                    i.title
                  )}
                  <span className="block" style={{ color: "var(--parchment-dim)" }}>
                    {citable(i) ? i.citation : COPY.noAuthor}
                  </span>
                </span>
                <button type="button" aria-label={`${COPY.remove}: ${i.title}`} className={BUTTON} style={mono} onClick={() => saved.remove(i.id)}>
                  {COPY.remove}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="saved-download"
            className={`${BUTTON} mt-3`}
            style={mono}
            onClick={() => setStatus(download(saved.state) ? COPY.downloaded : "")}
          >
            {COPY.download}
          </button>
        </>
      )}
      <span role="status" aria-live="polite" className="block text-xs mt-2" style={{ color: "var(--parchment-dim)" }}>
        {status}
      </span>
    </section>
  );
}

export function DrawerSave({ fields, className }: { fields: CiteFields; className: string }) {
  const saved = useSaved();
  const on = saved.has(fields.id);
  return (
    <>
      <SaveButton fields={fields} saved={saved} className={`${className} ${FOCUS}`} />
      {on && (
        <a href="/explore#saved" className={`${className} ${FOCUS}`}>
          {COPY.seeSaved}
        </a>
      )}
      <span role="status" aria-live="polite" data-testid="drawer-save-status" className="basis-full text-xs" style={{ color: "var(--parchment-dim)" }}>
        {saved.full ? COPY.full : on ? (saved.kept ? COPY.firstNotice : COPY.blockedNotice) : ""}
      </span>
    </>
  );
}
