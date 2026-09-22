"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";
import { IMPORT_BUCKET, MAX_IMPORT_BYTES, sha256Hex, storagePathFor } from "@/lib/research-os/import-storage";
import { detectType, IMPORT_KINDS, MAX_NOTE, MAX_TITLE, validateMetadata, type ImportKind } from "@/lib/research-os/import-types";

/**
 * Bring a file in (ros-import 2). Drop files, name the import, and each
 * one is hashed here, uploaded to storage under this account, and
 * recorded by the route once it has read the bytes back.
 *
 * The hash is computed before the upload because the object's path is
 * that hash: the same file uploaded twice is one object, and a second
 * upload answers that the object is already there, which is success.
 *
 * Nothing is extracted yet. A file keeps its bytes and its metadata, and
 * the page says which types a later slice will read.
 */
type Stage = "waiting" | "hashing" | "uploading" | "recording" | "done" | "failed";

interface Picked {
  file: File;
  sha256: string | null;
  stage: Stage;
  message: string | null;
}

const KB = 1024;
const size = (bytes: number) => (bytes < KB ? `${bytes} B` : bytes < KB * KB ? `${(bytes / KB).toFixed(0)} KB` : `${(bytes / KB / KB).toFixed(1)} MB`);

/**
 * What to say when storage refuses the upload itself.
 *
 * The bucket's insert policy caps how many uploaded objects an owner may
 * hold that no import row records, so a person who uploaded files that
 * never finished recording meets that cap here. Postgres answers with its
 * own sentence about row-level security, which names nothing a person can
 * act on. Any other refusal keeps the message storage gave.
 */
function uploadRefusal(message: string): string {
  if (/row-level security|violates|not authorized|unauthorized/i.test(message)) {
    return "Storage refused this file. Files that were uploaded but never recorded count against a limit; open your imports and finish or remove those first.";
  }
  return message;
}

export default function ImportPage() {
  const [kind, setKind] = useState<ImportKind>("dataset");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<{ importId: string; nodeSlug: string | null; files: number } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const dropping = useRef(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const add = useCallback((files: FileList | null) => {
    if (!files) return;
    setDone(null);
    setPicked((current) => {
      const names = new Set(current.map((p) => `${p.file.name}:${p.file.size}`));
      const next = Array.from(files)
        .filter((f) => !names.has(`${f.name}:${f.size}`))
        .map((file) => ({
          file,
          sha256: null,
          stage: "waiting" as Stage,
          message: file.size > MAX_IMPORT_BYTES ? `Larger than ${size(MAX_IMPORT_BYTES)}, which is the limit for a browser upload.` : null,
        }));
      return [...current, ...next];
    });
  }, []);

  const update = (index: number, patch: Partial<Picked>) => setPicked((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  async function run() {
    const meta = validateMetadata({ kind, title, note });
    if (!meta.ok) {
      setProblem(meta.error === "title_missing" ? "Give the import a title." : "That title or note is too long.");
      return;
    }
    const usable = picked.filter((p) => p.file.size > 0 && p.file.size <= MAX_IMPORT_BYTES);
    if (!usable.length) {
      setProblem("Add at least one file inside the size limit.");
      return;
    }
    if (!token) {
      setProblem("Your session expired. Sign in again.");
      return;
    }
    setBusy(true);
    setProblem(null);
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    try {
      const created = await fetch("/api/research-os/access", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "import", kind: meta.value.kind, title: meta.value.title, source: { note: meta.value.note, files: usable.length } }),
      });
      if (!created.ok) {
        setProblem("The import could not be created.");
        setBusy(false);
        return;
      }
      const { importId } = (await created.json()) as { importId: string };
      const supabase = getBrowserSupabase();
      const ownerId = (await supabase.auth.getUser()).data.user?.id ?? "";
      let recorded = 0;
      let nodeSlug: string | null = null;

      for (let index = 0; index < picked.length; index += 1) {
        const item = picked[index];
        if (item.file.size === 0 || item.file.size > MAX_IMPORT_BYTES) continue;
        update(index, { stage: "hashing", message: null });
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const sha256 = await sha256Hex(bytes);
        const path = storagePathFor(ownerId, sha256);
        if (!path.ok) {
          update(index, { stage: "failed", message: "This file could not be named for storage." });
          continue;
        }
        const detected = detectType(item.file.name, item.file.type);
        update(index, { sha256, stage: "uploading" });
        const upload = await supabase.storage.from(IMPORT_BUCKET).upload(path.value, item.file, { upsert: false, contentType: detected.mediaType });
        // The path is the hash of the bytes, so an object already there
        // holds this file. A conflict is the file arriving twice.
        const already = Boolean(upload.error && /exists/i.test(upload.error.message));
        if (upload.error && !already) {
          update(index, { stage: "failed", message: uploadRefusal(upload.error.message) });
          continue;
        }
        update(index, { stage: "recording" });
        const attached = await fetch("/api/research-os/import", {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "attach", importId, filename: item.file.name, mediaType: detected.mediaType, bytes: item.file.size, sha256 }),
        });
        if (!attached.ok) {
          const body = (await attached.json().catch(() => null)) as { message?: string } | null;
          update(index, { stage: "failed", message: body?.message ?? `The file could not be recorded (${attached.status}).` });
          continue;
        }
        const body = (await attached.json().catch(() => null)) as { nodeSlug?: string | null } | null;
        nodeSlug = body?.nodeSlug ?? nodeSlug;
        recorded += 1;
        update(index, { stage: "done", message: already ? "Already in storage; recorded." : "Recorded." });
      }
      setDone({ importId, nodeSlug, files: recorded });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "The import did not finish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <div>
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">Research OS · import</div>
        <h1 className="font-display uppercase text-[clamp(1.4rem,3.5vw,2.2rem)] leading-[1.1] text-[color:var(--basalt)]">bring a file in</h1>
        <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Any format, up to {size(MAX_IMPORT_BYTES)} a file. It stays private to you, and it keeps its bytes under the hash of those bytes, so a run that read it can read the same file again.
        </p>
      </div>

      <section className="border border-[color:var(--hairline)] p-4 flex flex-col gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">what it is</span>
            <select id="import-kind" value={kind} onChange={(e) => setKind(e.target.value as ImportKind)} className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60">
              {IMPORT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">title</span>
            <input
              id="import-title"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="what this import holds"
              className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">note</span>
          <textarea
            id="import-note"
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="where it came from, and what you mean to do with it"
            className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60"
          />
        </label>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          if (!dropping.current) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          dropping.current = true;
          setOver(false);
          add(e.dataTransfer.files);
          dropping.current = false;
        }}
        className={`border border-dashed p-6 text-center ${over ? "border-[color:var(--gold-deep)] bg-[color:var(--bone)]" : "border-[color:var(--hairline)]"}`}
      >
        <p className="text-[13px] text-[color:var(--basalt-2)]">Drop files here</p>
        <label htmlFor="import-files" className="mt-2 inline-block text-[12px] small-caps underline underline-offset-4 cursor-pointer">
          or choose files
        </label>
        <input id="import-files" type="file" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
      </section>

      {picked.length > 0 && (
        <section className="flex flex-col gap-2">
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {picked.map((p, i) => {
              const detected = detectType(p.file.name, p.file.type);
              return (
                <li key={`${p.file.name}:${p.file.size}`} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[color:var(--basalt)] truncate">{p.file.name}</div>
                    <div className="text-[11px] text-[color:var(--basalt-3)]">
                      {detected.structured} · {detected.mediaType} · {size(p.file.size)}
                      {detected.extractable ? "" : " · kept as bytes for now"}
                    </div>
                    {p.message && <div className="text-[11px] text-[color:var(--basalt-2)]">{p.message}</div>}
                  </div>
                  <div className="text-[11px] small-caps tracking-[0.18em] text-[color:var(--basalt-3)]">
                    {p.stage === "waiting" ? "" : p.stage}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-4">
            <button onClick={run} disabled={busy || !token} className="text-[12px] small-caps underline underline-offset-4 disabled:no-underline disabled:opacity-60">
              {busy ? "importing…" : "import these files"}
            </button>
            <button onClick={() => setPicked([])} disabled={busy} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]">
              clear
            </button>
          </div>
        </section>
      )}

      <p aria-live="polite" className="text-[12px] text-[color:var(--basalt-2)]">
        {problem ?? (done ? `${done.files} of ${picked.length} files recorded.` : "")}
      </p>
      {done?.nodeSlug && (
        <p className="text-[12px]">
          <Link href={`/research-os/n/${done.nodeSlug}`} className="underline underline-offset-4">
            open the import
          </Link>
        </p>
      )}
    </main>
  );
}
