import { useCallback, useEffect, useRef, useState } from "react";
import type { Api, JobKind, JobView } from "../api";

const MAX_TEXT_BYTES = 64 * 1024 * 1024;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i).toLowerCase() : "";
}

function when(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "";
}

export function JobsView({ api }: { api: Api }) {
  const [kinds, setKinds] = useState<JobKind[]>([]);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [kind, setKind] = useState<string>("");
  const [files, setFiles] = useState<Record<string, { text: string; ext: string; name: string }>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.jobs();
      setKinds(r.kinds);
      setJobs(r.jobs);
      setKind((k) => k || r.kinds[0]?.kind || "");
      return r.jobs;
    } catch (e) {
      setStatus((e as Error).message);
      return [];
    }
  }, [api]);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => {
      void load();
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const spec = kinds.find((k) => k.kind === kind);
  const running = jobs.find((j) => j.state === "running");

  const pick = async (name: string, f: File | undefined, exts: string[]) => {
    if (!f) return;
    const ext = extOf(f.name);
    if (!exts.includes(ext)) return setStatus(`${f.name}: use ${exts.join(", ")}`);
    if (f.size > MAX_TEXT_BYTES) return setStatus(`${f.name} is larger than 64 MB`);
    setFiles((cur) => ({ ...cur, [name]: { text: "", ext, name: f.name } }));
    const text = await f.text();
    setFiles((cur) => ({ ...cur, [name]: { text, ext, name: f.name } }));
  };

  const start = async () => {
    if (!spec) return;
    try {
      const j = await api.startJob(kind, Object.fromEntries(Object.entries(files).filter(([n]) => spec.inputs.some((i) => i.name === n)).map(([n, f]) => [n, { text: f.text, ext: f.ext }])));
      setStatus(j.state === "failed" ? j.error : "Started.");
      setFiles({});
      setOpen(j.id);
      void load();
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const ready = !!spec && spec.inputs.every((i) => files[i.name]?.text);

  return (
    <section>
      <header className="head">
        <h1>Jobs</h1>
        <p className="muted">Runs on this computer with its Python. One job at a time; inputs are deleted when a job ends.</p>
      </header>
      <article className="panel card">
        <div className="toolbar">
          <select value={kind} onChange={(e) => (setKind(e.target.value), setFiles({}))}>
            {kinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        {spec?.inputs.map((i) => (
          <label key={`${kind}-${i.name}`} className="file row">
            <input type="file" accept={i.exts.join(",")} onChange={(e) => void pick(i.name, e.target.files?.[0], i.exts)} />
            <span>{i.label}</span>
            <em className="muted small">{files[i.name]?.name ?? i.exts.join(" ")}</em>
          </label>
        ))}
        <div className="toolbar">
          <button className="primary" disabled={!ready || !!running} onClick={() => void start()}>
            {running ? "A job is running" : "Start"}
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </article>
      <ol className="jobs">
        {jobs.map((j) => (
          <li key={j.id} className="panel">
            <button className="job-head" onClick={() => setOpen(open === j.id ? null : j.id)}>
              <span className={`tag ${j.state === "done" ? "" : "ghost"}`}>{j.state}</span>
              <b>{kinds.find((k) => k.kind === j.kind)?.label ?? j.kind}</b>
              <span className="muted small">{when(j.startedAt)}</span>
            </button>
            {j.error && <p className="error">{j.error}</p>}
            {open === j.id && (
              <>
                {j.result !== null && <pre className="result">{JSON.stringify(j.result, null, 2)}</pre>}
                <pre className="log">{(j.logTruncated ? "…\n" : "") + (j.log || "no output yet")}</pre>
                <div className="toolbar">
                  {j.state === "running" ? (
                    <button className="ghost" onClick={() => void api.cancelJob(j.id).then(load)}>
                      Cancel
                    </button>
                  ) : (
                    <button className="ghost" onClick={() => window.confirm("Delete this job and its output folder?") && void api.deleteJob(j.id).then(load)}>
                      Delete output
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
