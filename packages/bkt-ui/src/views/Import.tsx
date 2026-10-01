import { useState } from "react";
import { ApiError, type Api } from "../api";
import { FILE_UNREADABLE } from "./file";
import { WorkQuizSources } from "./WorkQuiz";

export const ALREADY_IMPORTED = "Your progress from the website is already on this computer.";

export function ImportView({ api }: { api: Api }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<unknown>(null);

  const run = async (payload: unknown, force: boolean) => {
    setBusy(true);
    try {
      const r = await api.importWeb(payload, force);
      setPending(null);
      setStatus(`Brought over ${r.imported.length} ${r.imported.length === 1 ? "deck" : "decks"}.`);
    } catch (e) {
      if ((e as Error).message === "already imported") {
        setPending(payload);
        setStatus(ALREADY_IMPORTED);
      } else setStatus(e instanceof ApiError && e.status === 400 ? FILE_UNREADABLE : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    let payload: unknown;
    try {
      payload = JSON.parse(await f.text());
    } catch {
      return setStatus(FILE_UNREADABLE);
    }
    await run(payload, false);
  };

  const redo = () => {
    if (window.confirm("Import again? Cards merge by the most recent review, so nothing newer on this computer is lost.")) void run(pending, true);
  };

  return (
    <section>
      <header className="head">
        <h1>Import</h1>
        <p className="muted">Bring your progress over from the website.</p>
      </header>
      <article className="panel card">
        <p className="muted">On the website's Learn page, choose Export progress. Then choose that file here. Cards merge by the most recent review.</p>
        <label className="file">
          <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
          <span>{busy ? "Bringing it over…" : "Choose file"}</span>
        </label>
        {status && <p className="status">{status}</p>}
        {pending !== null && (
          <button className="primary" disabled={busy} onClick={redo}>
            Import again
          </button>
        )}
      </article>
      <WorkQuizSources api={api} />
    </section>
  );
}
