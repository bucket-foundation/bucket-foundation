import { useCallback, useEffect, useRef, useState } from "react";
import type { Api, JobView } from "../api";

export const ANALYZE = "analyze";
export const MAX_DATA_BYTES = 16 * 1024 * 1024;
export const WRONG_KIND = "Bucket cannot read that kind of file. Choose a table saved from a spreadsheet.";
export const TOO_LARGE = "That file is larger than 16 MB.";
export const NEEDS_PIECE = "Bucket needs one more piece to do this";
export const COPIED = "Copied. Paste it into a terminal and run it, then choose your data again.";

export const STATE_WORDS: Record<JobView["state"], string> = { running: "Working", done: "Finished", failed: "Did not finish", cancelled: "Stopped", timeout: "Did not finish" };

const KIND_WORDS: Record<string, string> = { integer: "whole number", float: "number", datetime: "date", bool: "yes or no", string: "text", mixed: "mixed", empty: "empty" };

interface Note {
  code: string;
  where: string;
  message: string;
}

interface Card {
  rows: number;
  truncated: boolean;
  time: string | null;
  columns: { name: string; kind: string; unit: string | null; missing: number; low: number | null; high: number | null }[];
  warnings: Note[];
  problems: Note[];
}

const plainName = (s: string) => s.replace(/_/g, " ").trim();
const count = (n: number) => n.toLocaleString("en-US");
const firstNumber = (s: string) => {
  const m = s.match(/\d+/);
  return m ? count(Number(m[0])) : null;
};

export function noteSentence(n: Note): string {
  const col = `"${plainName(n.where)}"`;
  const k = firstNumber(n.message);
  switch (n.code) {
    case "W_MISSING":
      return k ? `${col} has ${k} empty cells.` : `${col} has empty cells.`;
    case "W_TIME_ORDER":
      return `The dates in ${col} are out of order. Bucket sorted them.`;
    case "W_TIME_DUP":
      return k ? `${col} repeats ${k} dates.` : `${col} repeats some dates.`;
    case "W_MIXED":
      return `${col} mixes kinds of values.`;
    case "W_EMPTY_COLUMN":
      return `${col} is empty.`;
    case "W_CONSTANT":
      return `${col} holds the same value in every row.`;
    case "W_NO_TIME":
      return "Bucket found no column of dates, so it skipped trends over time.";
    case "W_DUP_ROWS":
      return k ? `${k} rows appear more than once.` : "Some rows appear more than once.";
    case "W_TRUNCATED":
      return k ? `Bucket read the first ${k} rows.` : "Bucket read the first part of the table.";
    case "W_PREAMBLE":
      return k ? `Bucket skipped ${k} rows above the column names.` : "Bucket skipped the rows above the column names.";
    case "E_HEADER":
      return "Some columns have no name.";
    case "E_DUP_COLUMN":
      return "Two columns share a name.";
    case "E_EMPTY":
      return "The table has column names and no rows.";
    case "E_NO_NUMERIC":
      return "The table has no column of numbers to analyze.";
    case "E_RAGGED":
      return "Some rows have more or fewer cells than there are columns.";
    case "E_KEYS":
      return "Some records are missing fields.";
    case "E_READ":
      return "Bucket could not read that file.";
    default:
      return "Bucket noticed something else about this table. Show details has it.";
  }
}

function cardOf(result: unknown): Card | null {
  const card = (result as { card?: Card | null } | null)?.card;
  return card && Array.isArray(card.columns) && Array.isArray(card.warnings) && Array.isArray(card.problems) ? card : null;
}

function unique(lines: string[]): string[] {
  return Array.from(new Set(lines));
}

function when(ms: number): string {
  return new Date(ms).toLocaleString();
}

function CardView({ card }: { card: Card }) {
  const range = (c: Card["columns"][number]) => (c.low === null || c.high === null ? "" : `${count(c.low)} to ${count(c.high)}`);
  return (
    <>
      <p className="big-line">
        {`${count(card.rows)} ${card.rows === 1 ? "row" : "rows"}, ${count(card.columns.length)} ${card.columns.length === 1 ? "column" : "columns"}`}
      </p>
      {card.time && <p className="muted">{`Time runs along "${plainName(card.time)}".`}</p>}
      <table className="columns">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Kind</th>
            <th scope="col">Unit</th>
            <th scope="col">Empty cells</th>
            <th scope="col">Range</th>
          </tr>
        </thead>
        <tbody>
          {card.columns.map((c, i) => (
            <tr key={i}>
              <th scope="row">{plainName(c.name)}</th>
              <td>{KIND_WORDS[c.kind] ?? "other"}</td>
              <td>{c.unit ?? ""}</td>
              <td>{c.missing > 0 ? count(c.missing) : ""}</td>
              <td>{range(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Analysis({ api, job, onChange }: { api: Api; job: JobView; onChange: () => void }) {
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const card = cardOf(job.result);
  const problems = unique((card?.problems ?? []).map(noteSentence));
  const warnings = unique((card?.warnings ?? []).map(noteSentence));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(job.install ?? "");
      setCopied(true);
    } catch {
      setDetails(true);
    }
  };

  return (
    <div className="job-body">
      {job.state === "running" && <p className="muted">Bucket is reading your data.</p>}
      {job.state === "cancelled" && <p className="muted">You stopped this one.</p>}
      {job.state === "timeout" && <p className="muted">This took longer than Bucket allows.</p>}
      {job.state === "failed" && job.install && (
        <>
          <h3>{NEEDS_PIECE}</h3>
          <div className="toolbar">
            <button className="primary" onClick={() => void copy()}>
              Copy the install line
            </button>
          </div>
          {copied && <p className="status">{COPIED}</p>}
        </>
      )}
      {job.state === "failed" && !job.install && problems.length === 0 && <p className="muted">Bucket could not finish this.</p>}
      {problems.length > 0 && (
        <ul className="notes">
          {problems.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      {card && job.state === "done" && <CardView card={card} />}
      {card && job.state === "done" && warnings.length > 0 && (
        <>
          <h3>Worth knowing</h3>
          <ul className="notes">
            {warnings.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
      <div className="toolbar">
        {job.state === "running" ? (
          <button className="ghost" onClick={() => void api.cancelJob(job.id).then(onChange, onChange)}>
            Stop
          </button>
        ) : (
          <>
            <button className="ghost" onClick={() => setDetails((d) => !d)}>
              {details ? "Hide details" : "Show details"}
            </button>
            <button className="ghost" onClick={() => window.confirm("Remove this analysis from this computer?") && void api.deleteJob(job.id).then(onChange, onChange)}>
              Remove
            </button>
          </>
        )}
      </div>
      {details && job.state !== "running" && (
        <div className="details">
          {job.error && <pre className="result">{job.error}</pre>}
          {job.result !== null && <pre className="result">{JSON.stringify(job.result, null, 2)}</pre>}
          <pre className="log">{(job.logTruncated ? "…\n" : "") + (job.log || "no output")}</pre>
        </div>
      )}
    </div>
  );
}

export function JobsView({ api }: { api: Api }) {
  const [exts, setExts] = useState<string[] | null>(null);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.jobs();
      setExts(r.kinds.find((k) => k.kind === ANALYZE)?.inputs[0]?.exts ?? []);
      setJobs(r.jobs.filter((j) => j.kind === ANALYZE));
    } catch (e) {
      setStatus((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const running = jobs.some((j) => j.state === "running");
  const busy = running || sending;

  const choose = async (f: File | undefined) => {
    if (!f || !exts) return;
    const dot = f.name.lastIndexOf(".");
    const ext = dot > 0 ? f.name.slice(dot).toLowerCase() : "";
    if (!exts.includes(ext)) return setStatus(WRONG_KIND);
    if (f.size > MAX_DATA_BYTES) return setStatus(TOO_LARGE);
    setSending(true);
    setStatus(null);
    try {
      await api.startJob(ANALYZE, { data: { text: await f.text(), ext } });
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setSending(false);
      void load();
    }
  };

  const isOpen = (j: JobView, i: number) => (i === 0 ? !closed.has(j.id) : opened.has(j.id));
  const toggle = (j: JobView, i: number) => {
    const flip = (s: Set<string>) => {
      const next = new Set(s);
      if (next.has(j.id)) next.delete(j.id);
      else next.add(j.id);
      return next;
    };
    if (i === 0) setClosed(flip);
    else setOpened(flip);
  };

  return (
    <section>
      <header className="head">
        <h1>Analyze data</h1>
        <p className="muted">Find patterns in your own data.</p>
      </header>
      <article className="panel card">
        <p className="muted">Choose a table of your own, such as one saved from a spreadsheet. Bucket reads it on this computer and removes its copy when it is done.</p>
        <label className="file">
          <input type="file" accept={(exts ?? []).join(",")} disabled={busy || !exts?.length} onChange={(e) => (void choose(e.target.files?.[0]), (e.target.value = ""))} />
          <span>{busy ? "Working…" : "Choose data"}</span>
        </label>
        {status && <p className="status">{status}</p>}
      </article>
      <ol className="jobs">
        {jobs.map((j, i) => (
          <li key={j.id} className="panel">
            <button className="job-head" onClick={() => toggle(j, i)}>
              <span className={`tag ${j.state === "done" ? "" : "ghost"}`}>{STATE_WORDS[j.state]}</span>
              <span className="muted small">{when(j.startedAt)}</span>
            </button>
            {isOpen(j, i) && <Analysis api={api} job={j} onChange={() => void load()} />}
          </li>
        ))}
      </ol>
    </section>
  );
}
