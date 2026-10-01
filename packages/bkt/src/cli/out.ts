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

const SECRET_NAME = /private|secret|token|passphrase|password|sealed|nonce|pem|datakey|data_key|^key$/i;
const SECRET_VALUE = /PRIVATE KEY/;

export function redact(value: unknown): unknown {
  if (typeof value === "string") return SECRET_VALUE.test(value) ? "[redacted]" : value;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !SECRET_NAME.test(k))
        .map(([k, v]) => [k, redact(v)]),
    );
  }
  return value;
}

export function jsonLine(body: Record<string, unknown>): string {
  return JSON.stringify(redact({ v: 1, ...body }));
}

export function textRows(pairs: [string, string | number | boolean][]): string {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}
