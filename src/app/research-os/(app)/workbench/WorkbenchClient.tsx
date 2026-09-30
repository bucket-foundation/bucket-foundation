"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Prop {
  type: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  description?: string;
}

interface ToolRow {
  id: string;
  group: string;
  title: string;
  description: string;
  scope: string;
  writes: string;
  status: string;
  bead: string;
  blocked_by: string;
  input_schema: { properties?: Record<string, Prop>; required?: string[] };
}

interface RunRow {
  run_id: string;
  tool: string;
  state: string;
  position: number | null;
  result: { ok?: boolean; meaning?: string; run_dir?: string; outputs?: Record<string, string>; exit_code?: number } | null;
}

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const H1 = "font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]";
const FIELD = "w-full border border-[color:var(--hairline)] bg-transparent px-2 py-1 text-[13px] text-[color:var(--basalt)]";

async function call(body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch("/api/research-os/workbench", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

function coerce(prop: Prop, raw: string): unknown {
  if (prop.type === "integer") return Number.parseInt(raw, 10);
  if (prop.type === "number") return Number(raw);
  return raw;
}

function ToolForm({ tool, onRun }: { tool: ToolRow; onRun: (args: Record<string, unknown>) => void }) {
  const props = tool.input_schema.properties ?? {};
  const required = new Set(tool.input_schema.required ?? []);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const live = tool.status === "live";
  const submit = () => {
    const args: Record<string, unknown> = {};
    for (const [name, prop] of Object.entries(props)) {
      const v = values[name];
      if (v === undefined || v === "") continue;
      args[name] = typeof v === "boolean" ? v : coerce(prop, v);
    }
    onRun(args);
  };
  return (
    <div className="mt-2 grid gap-2">
      {Object.entries(props).map(([name, prop]) => (
        <label key={name} className="grid gap-1 text-[12px] text-[color:var(--basalt-2)]">
          <span>
            {name}
            {required.has(name) ? " *" : ""} <span className="text-[color:var(--basalt-3)]">{prop.type}</span>
          </span>
          {prop.type === "boolean" ? (
            <input type="checkbox" disabled={!live} checked={values[name] === true} onChange={(e) => setValues({ ...values, [name]: e.target.checked })} />
          ) : prop.enum ? (
            <select className={FIELD} disabled={!live} value={String(values[name] ?? "")} onChange={(e) => setValues({ ...values, [name]: e.target.value })}>
              <option value="">default</option>
              {prop.enum.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input className={FIELD} disabled={!live} value={String(values[name] ?? "")} onChange={(e) => setValues({ ...values, [name]: e.target.value })} />
          )}
        </label>
      ))}
      <button type="button" disabled={!live} onClick={submit} className="justify-self-start border border-[color:var(--basalt)] px-3 py-1 text-[12px] disabled:opacity-40">
        {live ? "Run" : `Pending: ${tool.blocked_by}`}
      </button>
    </div>
  );
}

export default function WorkbenchClient() {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const refreshRuns = useCallback(async () => {
    const { status, data } = await call({ action: "runs" });
    if (status === 200) setRuns(((data.runs as RunRow[]) ?? []).slice().reverse());
  }, []);

  useEffect(() => {
    void (async () => {
      const { status, data } = await call({ action: "tools" });
      if (status === 200) setTools((data.tools as ToolRow[]) ?? []);
      else setMessage(status === 503 ? "The local workbench service is not running." : `Tools unavailable (${status}).`);
    })();
    void refreshRuns();
    const t = setInterval(() => void refreshRuns(), 3000);
    return () => clearInterval(t);
  }, [refreshRuns]);

  const groups = useMemo(() => {
    const out = new Map<string, ToolRow[]>();
    for (const t of tools) out.set(t.group, [...(out.get(t.group) ?? []), t]);
    return Array.from(out.entries()).map(([group, rows]) => ({ group, label: group.replace(/_/g, " "), rows }));
  }, [tools]);

  const run = async (tool: string, args: Record<string, unknown>) => {
    const { status, data } = await call({ action: "run", tool, args });
    setMessage(status === 202 ? `Queued ${tool}.` : `${tool}: ${String(data.message ?? data.error ?? status)}`);
    void refreshRuns();
  };

  const cancel = async (runId: string) => {
    await call({ action: "cancel", run_id: runId });
    void refreshRuns();
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <h1 className={H1}>Workbench</h1>
      <p className="mt-2 max-w-[70ch] text-[13px] text-[color:var(--basalt-2)]">
        Every Bucket tool, run on this machine. Outputs land in your own data folder, versioned per run.
      </p>
      {message ? <p className="mt-3 text-[13px] text-[color:var(--basalt)]">{message}</p> : null}
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_360px]">
        <div>
          {groups.map(({ group, label, rows }) => (
            <section key={group} className="mt-6 first:mt-0">
              <h2 className={LABEL}>{label}</h2>
              <ul className="mt-2 border-t border-[color:var(--hairline)]">
                {rows.map((t) => (
                  <li key={t.id} className="border-b border-[color:var(--hairline)] py-2">
                    <button type="button" className="flex w-full flex-wrap items-baseline gap-x-3 text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                      <span className="text-[14px] text-[color:var(--basalt)]">{t.title}</span>
                      <span className="text-[11px] text-[color:var(--basalt-3)]">
                        {t.id} · {t.scope}
                        {t.status === "pending" ? ` · pending ${t.bead}` : ""}
                      </span>
                    </button>
                    {open === t.id ? (
                      <div className="mt-1">
                        <p className="text-[12px] text-[color:var(--basalt-2)]">{t.description}</p>
                        <ToolForm tool={t} onRun={(args) => void run(t.id, args)} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside>
          <h2 className={LABEL}>Runs</h2>
          {runs.length === 0 ? <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">None yet.</p> : null}
          <ol className="mt-2 border-t border-[color:var(--hairline)]">
            {runs.map((r) => (
              <li key={r.run_id} className="border-b border-[color:var(--hairline)] py-2 text-[12px] text-[color:var(--basalt)]">
                <div className="flex items-baseline justify-between gap-2">
                  <span>{r.tool}</span>
                  <span className="text-[color:var(--basalt-3)]">
                    {r.state}
                    {r.position ? ` #${r.position}` : ""}
                  </span>
                </div>
                {r.result?.meaning ? <div className="text-[color:var(--basalt-2)]">{r.result.meaning}</div> : null}
                {r.result?.run_dir ? <div className="break-all text-[11px] text-[color:var(--basalt-3)]">{r.result.run_dir}</div> : null}
                {r.result?.outputs ? (
                  <ul className="mt-1 text-[11px] text-[color:var(--basalt-3)]">
                    {Object.keys(r.result.outputs).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : null}
                {r.state === "queued" || r.state === "running" ? (
                  <button type="button" className="mt-1 underline underline-offset-2" onClick={() => void cancel(r.run_id)}>
                    Cancel
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
