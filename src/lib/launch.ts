export function signInOpen(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === "production") return env.SIGN_IN_OPEN?.trim() === "1";
  const flag = env.BUCKET_SIGNIN_OPEN?.trim();
  if (flag === "0") return false;
  return true;
}
