import { useState } from "react";
import type { Api } from "../api";

export function ImportView({ api }: { api: Api }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<unknown>(null);

  const run = async (payload: unknown, force: boolean) => {
    setBusy(true);
    try {
      const r = await api.importWeb(payload, force);
      setPending(null);
      setStatus(`Imported ${r.imported.length} decks: ${r.imported.join(", ")}.`);
    } catch (e) {
      if ((e as Error).message === "already imported") {
        setPending(payload);
        setStatus("Web progress was already imported on this computer.");
      } else setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      await run(JSON.parse(await f.text()) as unknown, false);
    } catch {
      setStatus("That file is not valid JSON.");
    }
  };

  const redo = () => {
    if (window.confirm("Import again? Cards merge by the most recent review, so nothing newer on this computer is lost.")) void run(pending, true);
  };

  return (
    <section>
      <header className="head">
        <h1>Import web progress</h1>
        <p className="muted">One time, from bucket.foundation/research-os/learn.</p>
      </header>
      <article className="panel card">
        <ol className="steps">
          <li>On the web Learn page, choose Export progress at the foot of the deck list.</li>
          <li>Pick the downloaded JSON file here. Cards merge by the most recent review.</li>
        </ol>
        <label className="file">
          <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
          <span>{busy ? "Importing…" : "Choose file"}</span>
        </label>
        {status && <p className="status">{status}</p>}
        {pending !== null && (
          <button className="primary" disabled={busy} onClick={redo}>
            Import again
          </button>
        )}
      </article>
    </section>
  );
}
