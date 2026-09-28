"use client";

import { useState } from "react";
import { DELETE_CONFIRM_TOKEN } from "@/lib/research-os/types";
import { deleteConfirmed, exportFileName, requestDelete, requestExport } from "@/lib/research-os/privacy-actions";

export default function PrivacySection({ token, onDeleted }: { token: string | null; onDeleted: () => Promise<void> | void }) {
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  if (!token) return null;

  async function exportMine() {
    if (!token) return;
    setBusy("export");
    setNotice(null);
    const out = await requestExport(token);
    setBusy(null);
    if (!out.ok) {
      setNotice(out.error);
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(out.data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice("Export downloaded.");
  }

  async function deleteMine() {
    if (!token || !deleteConfirmed(typed)) return;
    setBusy("delete");
    setNotice(null);
    const out = await requestDelete(token, typed);
    setBusy(null);
    if (!out.ok) {
      setNotice(out.error);
      return;
    }
    setNotice("Your data has been deleted.");
    setConfirmOpen(false);
    setTyped("");
    await onDeleted();
  }

  return (
    <section aria-label="your data" className="mt-10 pt-6 border-t border-[color:var(--hairline)] flex flex-col gap-3">
      <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">§ your data</div>
      <div className="flex flex-wrap gap-3 items-start">
        <button
          onClick={exportMine}
          disabled={busy === "export"}
          className="px-4 py-2 text-[12px] small-caps border border-[color:var(--basalt)] text-[color:var(--basalt)] disabled:opacity-50"
        >
          {busy === "export" ? "exporting…" : "export my data"}
        </button>
        {!confirmOpen ? (
          <button onClick={() => setConfirmOpen(true)} className="px-4 py-2 text-[12px] small-caps border border-red-700 text-red-700">
            delete my data
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3 border border-red-700 bg-white/60 w-full max-w-sm">
            <p className="text-[12px] text-[color:var(--basalt-2)]">
              This removes every record of your work, and it cannot be undone. Type <strong>{DELETE_CONFIRM_TOKEN}</strong> to confirm.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={DELETE_CONFIRM_TOKEN}
                aria-label="type the confirm word"
                className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] bg-white/60 w-[120px]"
              />
              <button
                onClick={deleteMine}
                disabled={!deleteConfirmed(typed) || busy === "delete"}
                className="px-3 py-2 text-[12px] small-caps bg-red-700 text-white disabled:opacity-50"
              >
                {busy === "delete" ? "deleting…" : "confirm delete"}
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setTyped("");
                }}
                className="text-[12px] small-caps underline underline-offset-4"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {notice && <p className="text-[12px] text-[color:var(--basalt-2)]">{notice}</p>}
    </section>
  );
}
