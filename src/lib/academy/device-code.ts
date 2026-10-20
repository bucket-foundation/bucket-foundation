export const USER_CODE_RE = /^[A-Z0-9]{8}$/;

export function deviceCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("code");
  const code = raw?.replace(/[\s-]/g, "").toUpperCase() ?? "";
  return USER_CODE_RE.test(code) ? code : null;
}

export async function isSignedOut(r: Response): Promise<boolean> {
  if (r.status !== 401) return false;
  const j = (await r.clone().json().catch(() => ({}))) as { error?: string };
  return j.error === "unauthorized";
}
