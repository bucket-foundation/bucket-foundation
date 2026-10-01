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

export type Shape = readonly (string | readonly [string, Shape])[];

export const JSON_SHAPES = {
  version: ["version"],
  whoami: ["device", "publicKey", "newDevice", "keyring", "pack", "imported", "journal"],
  stats: ["items", "seen", "due", "attempts"],
  analyses: [["analyses", ["name", "dir", "mtime"]]],
  update: ["status", "version", "tag", "asset", "sha256", "url", "error"],
  "hai export": [
    ["probes", ["id", "bank_version", "seed", "started_at", "completed_at", "due_at", "retest_completed_at"]],
    ["answers", ["id", "probeId", "pairId", "itemId", "condition", "phase", "choice", "correct", "acceptedAi", "elapsedMs", "at"]],
  ],
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

export function textRows(pairs: [string, string | number | boolean][]): string {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}
