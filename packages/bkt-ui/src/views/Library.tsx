import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Api, type LibraryBody, type LibraryRow } from "../api";
import { deckCount, sizeText } from "./Decks";

export const LIBRARY_NOTE = "Decks are sets of things to learn that Bucket Foundation has checked. A deck you add joins Learn.";
export const LIBRARY_FAILED = "The library did not load.";
export const OFFLINE_LIBRARY = "Bucket is set to stay offline on this computer. This is the list that came with it; adding a deck from a file still works.";
export const BUNDLED_LIST = "This is the list that came with this copy of Bucket. Bucket contacts bucket.foundation only when you choose Refresh or Download.";
export const REFRESHED_LIST = "Bucket contacts bucket.foundation only when you choose Refresh or Download.";
export const REFRESH_TROUBLE = "Bucket could not reach bucket.foundation. The list is unchanged.";
export const ACTION_TROUBLE = "That did not work. Try again.";
export const IMPORT_TROUBLE = "Bucket could not use that file. It is not a deck file, or it was changed after it was made.";
export const IMPORT_NO_LICENCE = "That deck does not say what licence it is shared under, so Bucket did not add it.";
export const UNSIGNED_LIST = "The deck list in this copy of Bucket is not signed yet, so Bucket shows none of it. Adding a deck from a file still works.";
export const NOTHING_REPLACED = "Nothing was replaced.";
export const POLL_MS = 700;

interface SaveHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}
type SavePicker = (o: { suggestedName: string }) => Promise<SaveHandle>;

export function fileNameFor(d: Pick<LibraryRow, "title">): string {
  return `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deck"}.bktdeck`;
}

export function replaceQuestion(d: Pick<LibraryRow, "title">): string {
  return `A file for ${d.title} is already in your Downloads folder. Replace it?`;
}

export type LibraryApi = Pick<Api, "library" | "libraryRefresh" | "libraryInstall" | "libraryRemove" | "libraryExport" | "libraryExportBytes" | "libraryImport">;

const STATE_WORDS: Record<LibraryRow["state"], string> = { available: "Not added", installed: "Added", update: "Newer version ready", downloading: "Downloading", failed: "Did not finish" };

export function percent(d: Pick<LibraryRow, "received" | "downloadBytes">): number {
  return Math.min(100, Math.round((100 * d.received) / Math.max(1, d.downloadBytes)));
}

export function listedLine(b: Pick<LibraryBody, "from" | "refreshedAt" | "built">): string {
  if (b.from === "refreshed" && b.refreshedAt !== null) return `List from bucket.foundation, read on ${new Date(b.refreshedAt).toISOString().slice(0, 10)}.`;
  return `List made on ${b.built}.`;
}

function Row({ d, busy, offline, act }: { d: LibraryRow; busy: boolean; offline: boolean; act: (what: "install" | "remove" | "export", d: LibraryRow) => void }) {
  const have = d.state === "installed" || d.state === "update";
  return (
    <li className="library-row" data-state={d.state}>
      <div className="library-main">
        <b>{d.title}</b>
        <span>{`${deckCount(d)} · ${sizeText(have ? d.installedBytes : d.downloadBytes)}${have ? " on this computer" : " to download"}`}</span>
        <span className="muted small">
          {`${d.source}, `}
          {d.licenceHref ? (
            <a href={d.licenceHref} target="_blank" rel="noreferrer noopener">
              {d.licence}
            </a>
          ) : (
            d.licence
          )}
          {` · curated by ${d.curator}`}
        </span>
        {d.state === "downloading" && (
          <span className="library-progress">
            <progress max={100} value={percent(d)} aria-label={`Downloading ${d.title}`} />
            <span className="muted small">{`${percent(d)} percent of ${sizeText(d.downloadBytes)}`}</span>
          </span>
        )}
        {d.state === "failed" && d.error && <span className="error small">{d.error}</span>}
      </div>
      <div className="library-actions">
        <span className="tag ghost">{STATE_WORDS[d.state]}</span>
        {(d.state === "available" || d.state === "failed") && d.inCatalog && (
          <button className="primary" disabled={busy || offline} onClick={() => act("install", d)}>
            {d.state === "failed" ? "Try again" : "Download"}
          </button>
        )}
        {d.state === "update" && (
          <button className="primary" disabled={busy || offline} onClick={() => act("install", d)}>
            Update
          </button>
        )}
        {have && (
          <>
            <button disabled={busy} onClick={() => act("export", d)}>
              Save as a file
            </button>
            <button disabled={busy} onClick={() => act("remove", d)}>
              Remove
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export const EMBEDDED_TITLE = "Decks you can add";

export function LibraryView({ api, embedded, onBody }: { api: LibraryApi; embedded?: boolean; onBody?: (body: LibraryBody) => void }) {
  const [body, setBody] = useState<LibraryBody | null>(null);
  useEffect(() => {
    if (body) onBody?.(body);
  }, [body]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const live = useRef(true);

  const load = useCallback(() => api.library().then((b) => live.current && setBody(b), () => live.current && setFailed(true)), [api]);

  useEffect(() => {
    live.current = true;
    void load();
    return () => {
      live.current = false;
    };
  }, [load]);

  const downloading = body?.decks.some((d) => d.state === "downloading") ?? false;
  useEffect(() => {
    if (!downloading) return;
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [downloading, load]);

  const run = async (work: () => Promise<string | null>, trouble: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const said = await work();
      if (live.current) setMsg(said);
    } catch {
      if (live.current) setMsg(trouble);
    } finally {
      if (live.current) setBusy(false);
    }
  };

  const act = (what: "install" | "remove" | "export", d: LibraryRow) =>
    void run(async () => {
      if (what === "export") {
        const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
        if (picker) {
          let handle: SaveHandle;
          try {
            handle = await picker({ suggestedName: fileNameFor(d) });
          } catch {
            return null;
          }
          const out = await handle.createWritable();
          await out.write(await api.libraryExportBytes(d.id));
          await out.close();
          return `Saved ${d.title}.`;
        }
        let made: { name: string; folder: string };
        try {
          made = await api.libraryExport(d.id);
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 409) throw e;
          if (!window.confirm(replaceQuestion(d))) return NOTHING_REPLACED;
          made = await api.libraryExport(d.id, true);
        }
        return `Saved ${d.title} as ${made.name} in ${made.folder}.`;
      }
      setBody(what === "install" ? await api.libraryInstall(d.id) : await api.libraryRemove(d.id));
      return what === "remove" ? `Removed ${d.title}.` : null;
    }, ACTION_TROUBLE);

  const refresh = () =>
    void run(async () => {
      setBody(await api.libraryRefresh());
      return "The list is up to date.";
    }, REFRESH_TROUBLE);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    api.libraryImport(file).then(
      (b) => {
        if (!live.current) return;
        setBody(b);
        setMsg(`Added ${b.installed}.`);
        setBusy(false);
      },
      (e: unknown) => {
        if (!live.current) return;
        setMsg(e instanceof ApiError && /licence/.test(e.code) ? IMPORT_NO_LICENCE : IMPORT_TROUBLE);
        setBusy(false);
      },
    );
  };

  return (
    <section>
      {embedded ? (
        <>
          <h2>{EMBEDDED_TITLE}</h2>
          <p className="muted">{LIBRARY_NOTE}</p>
        </>
      ) : (
        <header className="head">
          <h1>Library</h1>
          <p className="muted">{LIBRARY_NOTE}</p>
        </header>
      )}
      {failed && <p className="error">{LIBRARY_FAILED}</p>}
      {body && (
        <>
          <article className="panel card">
            <p className="muted">{!body.signed ? UNSIGNED_LIST : body.offline ? OFFLINE_LIBRARY : body.from === "refreshed" ? REFRESHED_LIST : BUNDLED_LIST}</p>
            <div className="toolbar">
              <button className="primary" disabled={busy || body.offline} onClick={refresh}>
                Refresh
              </button>
              <label className="file">
                <input type="file" accept=".bktdeck" aria-label="Add a deck from a file" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
                <span>Add a deck from a file</span>
              </label>
              <span className="muted small">{listedLine(body)}</span>
            </div>
            {msg && (
              <p className="status" aria-live="polite">
                {msg}
              </p>
            )}
          </article>
          <article className="panel card">
            <ul className="library-rows">
              {body.decks.map((d) => (
                <Row key={d.id} d={d} busy={busy} offline={body.offline} act={act} />
              ))}
            </ul>
          </article>
        </>
      )}
    </section>
  );
}
