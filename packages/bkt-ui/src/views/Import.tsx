import { useState } from "react";
import type { Api } from "../api";

export function ImportView({ api }: { api: Api }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const payload = JSON.parse(await f.text()) as unknown;
      const r = await api.importWeb(payload);
      setStatus(`Imported ${r.imported.length} decks: ${r.imported.join(", ")}.`);
    } catch (e) {
      setStatus((e as Error).message === "already imported" ? "Web progress was already imported on this computer." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <header className="head">
        <h1>Import web progress</h1>
        <p className="muted">One time, from bucket.foundation/research-os/learn.</p>
      </header>
      <article className="panel card">
        <ol className="steps">
          <li>On the web Learn page, choose export progress at the foot of the deck list.</li>
          <li>Pick the downloaded JSON file here. Cards merge by the most recent review.</li>
        </ol>
        <label className="file">
          <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
          <span>{busy ? "Importing…" : "Choose file"}</span>
        </label>
        {status && <p className="status">{status}</p>}
      </article>
    </section>
  );
}
