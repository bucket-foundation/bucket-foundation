/**
 * Whether /sign-in takes sign-ins or launch-list signups.
 *
 * Production shows the launch list until Research OS opens. Preview
 * deployments and local dev keep the sign-in form so the app can be tested.
 * BUCKET_SIGNIN_OPEN overrides both ways: "1" opens sign-in on production at
 * launch, "0" shows the launch list anywhere (useful to test it locally).
 * Read at build time for static pages, so a change needs a redeploy.
 */
export function signInOpen(env: Record<string, string | undefined> = process.env): boolean {
  const flag = env.BUCKET_SIGNIN_OPEN?.trim();
  if (flag === "1") return true;
  if (flag === "0") return false;
  return env.VERCEL_ENV !== "production";
}
