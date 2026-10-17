export const LIST_MAX = 160;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Signup = { email: string; speaks: string; learning: string };
export type ParsedSignup = { ok: true; signup: Signup; suspect: boolean } | { ok: false; error: string };

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const printable = Array.from(value, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("");
  return printable.replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseSignup(body: unknown): ParsedSignup {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = clean(b.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const speaks = clean(b.speaks, LIST_MAX);
  const learning = clean(b.learning, LIST_MAX);
  return { ok: true, signup: { email, speaks, learning }, suspect: clean(b.website, 200) !== "" };
}
