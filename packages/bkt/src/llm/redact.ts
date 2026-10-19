import { LogGuard } from "../log-guard";
import { scanLines } from "../secret-scan";

export const REDACTED = "[redacted]";
export const MAX_ERROR_CHARS = 600;

export function redact(text: string, secrets: string[]): string {
  const live = secrets.filter((s) => s.length >= 4);
  let out = text;
  for (const s of live) out = out.split(s).join(REDACTED);
  const guard = new LogGuard(live);
  const { kept, dropped } = scanLines(out);
  const lines = kept.map((l) => guard.line(l));
  if (dropped) lines.push(`[${dropped} line${dropped === 1 ? "" : "s"} hidden: they looked like a secret]`);
  const joined = lines.join("\n");
  return joined.length > MAX_ERROR_CHARS ? `${joined.slice(0, MAX_ERROR_CHARS)}...` : joined;
}
