export function signInOpen(env: Record<string, string | undefined> = process.env): boolean {
  const flag = env.BUCKET_SIGNIN_OPEN?.trim();
  if (flag === "1") return true;
  if (flag === "0") return false;
  return env.VERCEL_ENV !== "production";
}
