import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { LogGuard } from "./log-guard";

export const JOB_MARKER = ".bkt-job";
export const DEFAULT_TIMEOUT_MS = 30 * 60_000;
export const DEFAULT_LOG_BYTES = 64 * 1024;
export const KILL_GRACE_MS = 5_000;

export type JobState = "running" | "done" | "failed" | "cancelled" | "timeout";

export interface JobDirs {
  dir: string;
  inputs: Record<string, string>;
  out: string;
}

export type JobPlan = { argv: string[]; env?: Record<string, string> } | { error: string; install?: string };

export interface JobSpec {
  label: string;
  inputs: Record<string, { label: string; maxBytes: number; exts: string[] }>;
  options?: Record<string, { min: number; max: number; integer: boolean }>;
  plan(dirs: JobDirs, options: Record<string, number>): JobPlan;
  after?(dirs: JobDirs): unknown;
  failed?(dirs: JobDirs): unknown;
}

export interface JobView {
  id: string;
  kind: string;
  state: JobState;
  startedAt: number;
  endedAt: number | null;
  code: number | null;
  log: string;
  logTruncated: boolean;
  result: unknown;
  error: string | null;
  install: string | null;
}

export class JobError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface Running {
  view: JobView;
  proc: ChildProcess | null;
  timer: ReturnType<typeof setTimeout> | null;
  killTimer: ReturnType<typeof setTimeout> | null;
  stop: JobState | null;
}

export interface JobRunnerOptions {
  root: string;
  specs: Record<string, JobSpec>;
  timeoutMs?: number;
  logBytes?: number;
  now?: () => number;
  keep?: number;
  killGraceMs?: number;
}

const INPUT_NAME = /^[a-z][a-z0-9-]{0,31}$/;

export type JobFile = string | { text: string; ext?: string };

export class JobRunner {
  private jobs: Running[] = [];
  private root: string;

  constructor(private o: JobRunnerOptions) {
    this.root = resolve(o.root);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    chmodSync(this.root, 0o700);
  }

  kinds() {
    return Object.entries(this.o.specs).map(([kind, s]) => ({ kind, label: s.label, inputs: Object.entries(s.inputs).map(([name, i]) => ({ name, label: i.label, exts: i.exts })) }));
  }

  list(): JobView[] {
    return this.jobs.map((j) => ({ ...j.view })).reverse();
  }

  get(id: string): JobView | null {
    const j = this.jobs.find((x) => x.view.id === id);
    return j ? { ...j.view } : null;
  }

  busy(): boolean {
    return this.jobs.some((j) => j.view.state === "running");
  }

  start(kind: string, files: Record<string, JobFile>, options: Record<string, unknown> = {}): JobView {
    const spec = Object.hasOwn(this.o.specs, kind) ? this.o.specs[kind] : undefined;
    if (!spec) throw new JobError(`unknown job ${kind}`, 404);
    if (this.busy()) throw new JobError("another job is running; cancel it or wait", 409);
    for (const name of Object.keys(files)) if (!Object.hasOwn(spec.inputs, name)) throw new JobError(`${kind} takes no input named ${name}`, 400);
    const opts: Record<string, number> = {};
    for (const [k, v] of Object.entries(options)) {
      const rule = spec.options && Object.hasOwn(spec.options, k) ? spec.options[k] : undefined;
      if (!rule) throw new JobError(`${kind} takes no option ${k}`, 400);
      if (typeof v !== "number" || !Number.isFinite(v) || v < rule.min || v > rule.max || (rule.integer && !Number.isInteger(v)))
        throw new JobError(`${k} must be ${rule.integer ? "a whole number" : "a number"} from ${rule.min} to ${rule.max}`, 400);
      opts[k] = v;
    }
    const named: Record<string, { text: string; file: string }> = {};
    for (const [name, input] of Object.entries(spec.inputs)) {
      const f = files[name];
      const text = typeof f === "string" ? f : f?.text;
      if (typeof text !== "string" || text.length === 0) throw new JobError(`${input.label} is required`, 400);
      if (Buffer.byteLength(text) > input.maxBytes) throw new JobError(`${input.label} is larger than ${Math.round(input.maxBytes / 1048576)} MB`, 413);
      if (!INPUT_NAME.test(name)) throw new JobError(`bad input name ${name}`, 400);
      const ext = typeof f === "string" || !f.ext ? input.exts[0] : f.ext.toLowerCase();
      if (!input.exts.includes(ext)) throw new JobError(`${input.label} must be one of ${input.exts.join(", ")}`, 400);
      named[name] = { text, file: `${name}${ext}` };
    }
    const now = this.o.now ?? Date.now;
    const id = `${new Date(now()).toISOString().replace(/[-:]/g, "").slice(0, 15)}-${randomBytes(4).toString("hex")}`;
    const dir = join(this.root, id);
    mkdirSync(dir, { mode: 0o700 });
    writeFileSync(join(dir, JOB_MARKER), `${id}\n`, { mode: 0o600, flag: "wx" });
    const inDir = join(dir, "inputs");
    const out = join(dir, "out");
    mkdirSync(inDir, { mode: 0o700 });
    mkdirSync(out, { mode: 0o700 });
    const inputs: Record<string, string> = {};
    for (const [name, { text, file }] of Object.entries(named)) {
      inputs[name] = join(inDir, file);
      writeFileSync(inputs[name], text, { mode: 0o600, flag: "wx" });
    }
    const dirs: JobDirs = { dir, inputs, out };
    const view: JobView = { id, kind, state: "running", startedAt: now(), endedAt: null, code: null, log: "", logTruncated: false, result: null, error: null, install: null };
    const job: Running = { view, proc: null, timer: null, killTimer: null, stop: null };
    this.jobs.push(job);
    this.jobs = this.jobs.slice(-(this.o.keep ?? 20));

    const finish = (state: JobState, error: string | null = null) => {
      rmSync(inDir, { recursive: true, force: true });
      if (job.timer) clearTimeout(job.timer);
      if (job.killTimer) clearTimeout(job.killTimer);
      view.state = state;
      view.error = error;
      view.endedAt = now();
    };

    let plan: JobPlan;
    try {
      plan = spec.plan(dirs, opts);
    } catch (e) {
      plan = { error: e instanceof Error ? e.message : String(e) };
    }
    if ("error" in plan) {
      view.install = plan.install ?? null;
      finish("failed", plan.error);
      return { ...view };
    }

    const cap = this.o.logBytes ?? DEFAULT_LOG_BYTES;
    const guard = new LogGuard(Object.values(named).map((n) => n.text));
    const append = (line: string) => {
      const next = view.log + guard.line(line) + "\n";
      if (Buffer.byteLength(next) > cap) {
        view.log = next.slice(next.length - cap);
        view.logTruncated = true;
      } else view.log = next;
    };
    const lines = (stream: NodeJS.ReadableStream | null) =>
      new Promise<void>((done) => {
        if (!stream) return done();
        let rest = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk: string) => {
          const parts = (rest + chunk).split(/\r?\n/);
          rest = parts.pop() ?? "";
          if (rest.length > 8192) {
            parts.push(rest);
            rest = "";
          }
          for (const l of parts) append(l);
        });
        stream.on("end", () => {
          if (rest) append(rest);
          done();
        });
        stream.on("error", () => done());
      });

    let proc: ChildProcess;
    try {
      proc = spawn(plan.argv[0], plan.argv.slice(1), {
        cwd: dir,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? dir, LANG: "C.UTF-8", ...plan.env },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });
    } catch (e) {
      finish("failed", `could not start: ${e instanceof Error ? e.message : String(e)}`);
      return { ...view };
    }
    job.proc = proc;
    const exited = new Promise<number | null>((done) => {
      proc.on("error", (e) => {
        append(`could not start: ${e.message}`);
        done(null);
      });
      proc.on("exit", (code) => done(code));
    });
    job.timer = setTimeout(() => this.halt(job, "timeout"), this.o.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    void (async () => {
      const [code] = await Promise.all([exited, lines(proc.stdout), lines(proc.stderr)]);
      this.signalGroup(proc, "SIGKILL");
      view.code = code;
      if (job.stop) return finish(job.stop, job.stop === "timeout" ? "the job ran past its time limit" : null);
      if (code !== 0) {
        try {
          view.result = code !== null && spec.failed ? ((await spec.failed(dirs)) ?? null) : null;
        } catch {
          view.result = null;
        }
        return finish("failed", code === null ? "the job could not start" : `exited with code ${code}`);
      }
      try {
        view.result = spec.after ? ((await spec.after(dirs)) ?? null) : null;
        finish("done");
      } catch (e) {
        finish("failed", e instanceof Error ? e.message : String(e));
      }
    })();
    return { ...view };
  }

  cancel(id: string): JobView {
    const job = this.jobs.find((j) => j.view.id === id);
    if (!job) throw new JobError("no such job", 404);
    if (job.view.state !== "running") throw new JobError("the job is not running", 409);
    this.halt(job, "cancelled");
    return { ...job.view };
  }

  private signalGroup(proc: ChildProcess, sig: NodeJS.Signals) {
    if (!proc.pid) return;
    try {
      process.kill(-proc.pid, sig);
    } catch {
      return;
    }
  }

  private halt(job: Running, why: JobState) {
    const proc = job.proc;
    if (!proc || job.stop) return;
    job.stop = why;
    this.signalGroup(proc, "SIGTERM");
    job.killTimer = setTimeout(() => this.signalGroup(proc, "SIGKILL"), this.o.killGraceMs ?? KILL_GRACE_MS);
  }

  remove(id: string): void {
    if (!/^[0-9T]{15}-[0-9a-f]{8}$/.test(id)) throw new JobError("bad job id", 400);
    const job = this.jobs.find((j) => j.view.id === id);
    if (job?.view.state === "running") throw new JobError("cancel the job first", 409);
    const dir = join(this.root, id);
    const rel = relative(this.root, dir);
    if (rel.startsWith("..") || rel.includes("/")) throw new JobError("bad job id", 400);
    if (!existsSync(dir)) throw new JobError("no such job", 404);
    if (lstatSync(dir).isSymbolicLink()) throw new JobError("refusing a symlinked job folder", 409);
    const marker = join(dir, JOB_MARKER);
    if (!existsSync(marker) || lstatSync(marker).isSymbolicLink() || readFileSync(marker, "utf8").trim() !== id) throw new JobError("the folder has no matching job marker", 409);
    rmSync(dir, { recursive: true, force: true });
    this.jobs = this.jobs.filter((j) => j.view.id !== id);
  }

  stopAll() {
    for (const j of this.jobs) if (j.view.state === "running") this.halt(j, "cancelled");
  }
}
