export type WebPlan = "monthly" | "yearly";

export type BillingResult = { ok: true; url: string } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  checkout_unavailable: "Web checkout is not open yet. Subscribe in the app for now.",
  portal_unavailable: "Billing management is not open yet.",
  no_web_subscription: "Your plan was bought in the app. Manage it in your Apple account settings.",
  unauthorized: "Sign in again to continue.",
};

export function billingMessage(error: string): string {
  return MESSAGES[error] ?? "Something went wrong. Try again in a minute.";
}

export function isAppleDevice(ua: string, touchPoints = 0): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}

export function isWebProduct(productId: string | null | undefined): boolean {
  return typeof productId === "string" && productId.startsWith("web.polingual.");
}

async function post(f: typeof fetch, path: string, body: unknown): Promise<BillingResult> {
  try {
    const r = await f(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const j = (await r.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
    if (r.ok && typeof j?.url === "string" && j.url.startsWith("https://")) return { ok: true, url: j.url };
    return { ok: false, error: typeof j?.error === "string" ? j.error : "failed" };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export async function startCheckout(plan: WebPlan, f: typeof fetch = fetch): Promise<BillingResult> {
  const r = await post(f, "/api/polingual/checkout", { plan, return_to: "app" });
  return !r.ok && r.error === "already_subscribed" ? openPortal(f) : r;
}

export function openPortal(f: typeof fetch = fetch): Promise<BillingResult> {
  return post(f, "/api/polingual/portal", {});
}
