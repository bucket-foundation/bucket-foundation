import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const REGISTRY_PATH = "tools/generations/registry.json";
const NAME = /^[a-z][a-z0-9-]{0,63}$/;
const VALUE = /^[A-Za-z0-9 ._,'-]{1,120}$/;

export interface Generation {
  name: string;
  script: string;
  about: string;
  inputs: Record<string, string>;
  needs?: string[];
  data: string[];
  outputs: string[];
}

export interface Registry {
  version: number;
  generations: Generation[];
}

export interface RunRecord {
  name: string;
  params: Record<string, string>;
  script_sha256: string;
  data_sha256: Record<string, string | null>;
  outputs: string[];
  created: string;
  needs: RunRecord[];
}

export class GenerateError extends Error {}

export function findRepo(start: string): string | null {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, REGISTRY_PATH))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

export function loadRegistry(repo: string): Registry {
  const r = JSON.parse(readFileSync(join(repo, REGISTRY_PATH), "utf8")) as Registry;
  const names = new Set<string>();
  for (const g of r.generations) {
    if (!NAME.test(g.name) || names.has(g.name)) throw new GenerateError(`the registry lists ${g.name} twice or under a bad name`);
    names.add(g.name);
    if (!existsSync(join(repo, "tools/generations", g.script))) throw new GenerateError(`${g.name} names a script that is not in tools/generations`);
  }
  for (const g of r.generations) for (const n of g.needs ?? []) if (!names.has(n)) throw new GenerateError(`${g.name} needs ${n}, which the registry does not list`);
  return r;
}

const sha = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

function dataPath(repo: string, p: string): string {
  return p.startsWith("~/") ? join(homedir(), p.slice(2)) : join(repo, p);
}

export function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (_, k: string) => params[k] ?? `{${k}}`);
}

export function checkParams(g: Generation, params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!(k in g.inputs)) throw new GenerateError(`${g.name} takes no input named ${k}; it takes ${Object.keys(g.inputs).join(", ") || "nothing"}`);
    if (!VALUE.test(v)) throw new GenerateError(`the ${k} value holds characters a generation does not take`);
    out[k] = v;
  }
  return out;
}

export interface RunOptions {
  repo: string;
  out: string;
  python?: string;
  now?: () => Date;
  spawn?: (cmd: string[], env: Record<string, string>, cwd: string) => { code: number; stderr: string };
}

function defaultSpawn(cmd: string[], env: Record<string, string>, cwd: string): { code: number; stderr: string } {
  const p = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env }, stdout: "ignore", stderr: "pipe" });
  return { code: p.exitCode ?? 1, stderr: p.stderr ? p.stderr.toString() : "" };
}

export function runGeneration(reg: Registry, name: string, params: Record<string, string>, o: RunOptions, seen: Set<string> = new Set()): RunRecord {
  const g = reg.generations.find((x) => x.name === name);
  if (!g) throw new GenerateError(`no generation named ${name}; bkt generate --list shows them`);
  if (seen.has(name)) throw new GenerateError(`${name} needs itself`);
  seen.add(name);
  const p = checkParams(g, params);
  mkdirSync(o.out, { recursive: true, mode: 0o700 });
  const needs = (g.needs ?? []).map((n) => {
    const dep = reg.generations.find((x) => x.name === n)!;
    const depParams = Object.fromEntries(Object.entries(p).filter(([k]) => k in dep.inputs));
    return runGeneration(reg, n, depParams, o, new Set(seen));
  });
  const script = join(o.repo, "tools/generations", g.script);
  const env: Record<string, string> = { BKT_GEN_OUT: o.out };
  for (const [k, v] of Object.entries(p)) env[`BKT_GEN_${k.toUpperCase()}`] = v;
  const run = (o.spawn ?? defaultSpawn)([o.python ?? process.env.BKT_PYTHON ?? "python3", script], env, o.repo);
  if (run.code !== 0) throw new GenerateError(`${name} did not finish (exit ${run.code}): ${run.stderr.trim().split("\n").slice(-3).join(" ")}`);
  const outputs = g.outputs.map((t) => fill(t, p));
  const missing = outputs.filter((f) => !existsSync(join(o.out, f)));
  if (missing.length) throw new GenerateError(`${name} finished without writing ${missing.join(", ")}`);
  const data = Object.fromEntries(g.data.map((d) => [d, existsSync(dataPath(o.repo, d)) ? sha(readFileSync(dataPath(o.repo, d))) : null]));
  const record: RunRecord = { name, params: p, script_sha256: sha(readFileSync(script)), data_sha256: data, outputs, created: (o.now ?? (() => new Date()))().toISOString(), needs };
  writeFileSync(join(o.out, `${name}.run.json`), JSON.stringify(record, null, 2), { mode: 0o600 });
  return record;
}

export function runFolder(home: string, name: string, params: Record<string, string>, now: Date): string {
  const key = sha(Buffer.from(JSON.stringify([name, Object.entries(params).sort()]))).slice(0, 8);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
  return join(home, "generations", name, `${stamp}-${key}`);
}

export function pastRuns(home: string, name?: string): { name: string; folder: string; record: RunRecord }[] {
  const root = join(home, "generations");
  if (!existsSync(root)) return [];
  const out: { name: string; folder: string; record: RunRecord }[] = [];
  for (const n of readdirSync(root)) {
    if (name && n !== name) continue;
    const dir = join(root, n);
    if (!statSync(dir).isDirectory()) continue;
    for (const run of readdirSync(dir).sort()) {
      const file = join(dir, run, `${n}.run.json`);
      if (existsSync(file)) out.push({ name: n, folder: join(dir, run), record: JSON.parse(readFileSync(file, "utf8")) as RunRecord });
    }
  }
  return out;
}
