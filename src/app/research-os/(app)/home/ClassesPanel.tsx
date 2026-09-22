"use client";

import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, ErrorState, LoadingState, Panel } from "@/components/ui";

interface ClassSummary {
  id: string;
  name: string;
  role: string;
  joinCode: string | null;
}

const ROLE_LABEL: Record<string, string> = { teacher: "teacher", librarian: "librarian", parent: "parent", peer: "peer", reviewer: "reviewer", learner: "learner" };
const INPUT = "border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 min-w-0";

/** The person's classes, a join-code box, and a create form for anyone who teaches. */
export default function ClassesPanel() {
  const [rows, setRows] = useState<ClassSummary[] | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/research-os/classes", { cache: "no-store" });
      if (!res.ok) {
        // The code is read before any setState, so no render happens
        // with the status set and the code still null, which showed
        // one frame of the permanent copy for a passing outage.
        const outageCode = res.ok ? null : await readErrorCode(res);
        setErrorCode(outageCode);
        setStatus(res.status);
        return;
      }
      setRows(((await res.json()) as { classes: ClassSummary[] }).classes);
      setStatus(200);
    } catch {
      setStatus(0);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/research-os/classes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { class?: ClassSummary; error?: string };
      if (!res.ok) {
        setNote(j.error === "not_found" ? "No class has that code." : j.error === "bad_code" ? "A code is 6 to 12 letters and digits." : j.error === "bad_name" ? "Give the class a name of 2 to 80 characters." : "Could not save. Try again.");
        return;
      }
      setNote(body.action === "create" ? `Created ${j.class?.name}. Share the code ${j.class?.joinCode} with your class.` : `Joined ${j.class?.name}.`);
      setCode("");
      setName("");
      setCreating(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function join(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) void act({ action: "join", code });
  }
  function create(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) void act({ action: "create", name });
  }

  return (
    <Panel title="your classes" meta={rows ? `${rows.length}` : undefined}>
      {status === null ? (
        <LoadingState />
      ) : isTransientOutage(status, errorCode) ? (
        <ErrorState title={OUTAGE_COPY.title} body={OUTAGE_COPY.body} retry={() => location.reload()} />
      ) : status === 503 ? (
        <ErrorState title={UNCONFIGURED_COPY.title} body={UNCONFIGURED_COPY.body} />
      ) : status !== 200 ? (
        <ErrorState body="Could not load your classes." retry={() => void load()} />
      ) : (
        <>
          {rows && rows.length > 0 ? (
            <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
              {rows.map((c) => (
                <li key={c.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={c.role === "teacher" || c.role === "librarian" ? "/research-os/class" : `/research-os/workspace`} className="text-[14px] text-[color:var(--basalt)] hover:underline underline-offset-4">
                      {c.name}
                    </Link>
                    <div className="text-[12px] text-[color:var(--basalt-3)]">
                      {ROLE_LABEL[c.role] ?? c.role}
                      {c.joinCode ? (
                        <>
                          {" · code "}
                          <span className="font-mono tracking-[0.12em] text-[color:var(--basalt)]">{c.joinCode}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">No class yet. Enter the code your teacher gave you, or create a class if you teach one.</p>
          )}

          <form onSubmit={join} className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="join-code" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
              join with a code
            </label>
            <input id="join-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" className={INPUT + " font-mono tracking-[0.12em] w-[140px]"} autoComplete="off" />
            <button type="submit" disabled={busy || !code.trim()} className={BTN_PRIMARY}>
              join
            </button>
            {!creating && (
              <button type="button" onClick={() => setCreating(true)} className={BTN_SECONDARY}>
                create a class
              </button>
            )}
          </form>

          {creating && (
            <form onSubmit={create} className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="class-name" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
                class name
              </label>
              <input id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Period 3 physics" className={INPUT + " flex-1 min-w-[200px]"} />
              <button type="submit" disabled={busy || !name.trim()} className={BTN_PRIMARY}>
                create
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
                cancel
              </button>
            </form>
          )}

          {note && (
            <p role="status" className="mt-3 text-[13px] text-[color:var(--basalt-2)]">
              {note}
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
