type Env = Record<string, string | undefined>;

export interface Tty {
  stdin: boolean;
  stdout: boolean;
}

export function interactive(env: Env, tty: Tty): boolean {
  return tty.stdin && tty.stdout && env.TERM !== "dumb";
}

export function colorEnabled(env: Env, tty: Tty): boolean {
  return !env.NO_COLOR && tty.stdout && env.TERM !== "dumb";
}

export function applyColor(env: Env, enabled: boolean): void {
  if (!enabled) env.FORCE_COLOR = "0";
}

export type Shape = readonly (string | readonly [string, Shape | "open"])[];

export const JSON_SHAPES = {
  version: ["version"],
  whoami: ["device", "publicKey", "newDevice", "keyring", "pack", "imported", "journal"],
  stats: ["items", "seen", "due", "attempts"],
  analyses: [["analyses", ["name", "dir", "mtime"]]],
  update: ["status", "version", "tag", "asset", "sha256", "url", "error"],
  analyze: [
    "schema",
    "name",
    "created",
    "dir",
    "forced",
    [
      "form",
      ["ok", "format", "rows", ["errors", ["code", "where", "message"]], ["warnings", ["code", "where", "message"]], ["columns", ["name", "type", "unit"]]],
    ],
    ["analysis", "open"],
    ["helix", ["status", "reason", "run_dir"]],
  ],
  doctor: ["ok", ["checks", ["id", "name", "status", "result", "fix"]]],
  "hai export": [
    ["probes", ["id", "bank_version", "seed", "started_at", "completed_at", "due_at", "retest_completed_at"]],
    ["answers", ["id", "probeId", "pairId", "itemId", "condition", "phase", "choice", "correct", "acceptedAi", "elapsedMs", "at"]],
  ],
  search: ["query", "mode", ["results", ["id", "branch", "concept", "title", "score", "url", "excerpt", "evidence"]]],
  "canon show": ["id", "branch", "concept", "title", "text", "url", ["evidence", ["title", "author", "kind", "url", "score", "text"]]],
} as const satisfies Record<string, Shape>;

export type ShapeName = keyof typeof JSON_SHAPES;

const scalar = (v: unknown) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

export function pick(shape: Shape, value: unknown): Record<string, unknown> {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const field of shape) {
    const [name, inner] = typeof field === "string" ? [field, null] : field;
    const v = source[name];
    if (inner === null) {
      if (scalar(v)) out[name] = v;
    } else if (inner === "open") {
      if (v !== undefined) out[name] = v;
    } else if (Array.isArray(v)) out[name] = v.map((row) => pick(inner, row));
    else if (v && typeof v === "object") out[name] = pick(inner, v);
  }
  return out;
}

export function jsonBody(name: ShapeName, body: unknown): Record<string, unknown> {
  return { v: 1, ...pick(JSON_SHAPES[name], body) };
}

export function jsonLine(name: ShapeName, body: unknown): string {
  return JSON.stringify(jsonBody(name, body));
}

export function textRows(pairs: [string, string | number][]): string {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}

export interface Counts {
  items: number;
  seen: number;
  due: number;
  attempts: number;
}

export function statRows(s: Counts, waiting?: number): [string, number][] {
  const rows: [string, number][] = [
    ["Items", s.items],
    ["Cards seen", s.seen],
    ["Due now", s.due],
    ["Attempts", s.attempts],
  ];
  return waiting === undefined ? rows : [...rows, ["Waiting to sync", waiting]];
}

export const KEY_STORES: Record<string, string> = {
  libsecret: "login keyring",
  keychain: "login keychain",
  dpapi: "Windows account",
  passphrase: "passphrase vault",
  memory: "memory",
};

const JOURNALS: Record<string, string> = { wal: "write-ahead log" };

export interface Who {
  device: string;
  publicKey: string;
  newDevice: boolean;
  keyring: string;
  pack: string;
  imported: number;
  journal: string;
}

export function whoRows(w: Who): [string, string | number][] {
  return [
    ["This device", w.device],
    ["Public key", w.publicKey],
    ["New device", w.newDevice ? "yes" : "no"],
    ["Key store", KEY_STORES[w.keyring] ?? w.keyring],
    ["Content version", w.pack],
    ["Items added", w.imported],
    ["Database mode", JOURNALS[w.journal] ?? w.journal],
  ];
}

const two = (n: number) => String(n).padStart(2, "0");

export function stamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export function analysisRows(items: { name: string; dir: string; mtime: number }[], where: boolean): string {
  const width = Math.max(...items.map((a) => a.name.length));
  return items.map((a) => `${a.name.padEnd(width)}  ${stamp(a.mtime)}${where ? `  ${a.dir}` : ""}`).join("\n");
}
