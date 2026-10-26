export interface Plan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  note?: string;
}

export const PLANS: Plan[] = [
  { id: "monthly", name: "Monthly", price: "$9.99", cadence: "a month" },
  { id: "yearly", name: "Yearly", price: "$59.99", cadence: "a year", note: "3 days free, then $59.99 a year" },
  { id: "family", name: "Family", price: "$89.99", cadence: "a year", note: "Up to 6 people" },
  { id: "lifetime", name: "Lifetime", price: "$149.99", cadence: "once" },
  { id: "student", name: "Student", price: "$29.99", cadence: "a year" },
];

export const TESTFLIGHT_URL = "https://testflight.apple.com/join/HfeRBKr8";
export const MANAGE_URL = "https://apps.apple.com/account/subscriptions";
export const APP_STORE_URL = "https://apps.apple.com/app/id6825177856";

export interface Access {
  status: "checking" | "open" | "locked" | "unknown";
  productId?: string | null;
  expiresAt?: string | null;
  trial?: boolean;
}

export function accessFrom(res: { status: number; body: unknown } | null): Access {
  if (!res) return { status: "unknown" };
  if (res.status !== 200 || !res.body || typeof res.body !== "object") return res.status === 401 ? { status: "locked" } : { status: "unknown" };
  const b = res.body as { active?: unknown; productId?: unknown; expiresAt?: unknown; trial?: unknown };
  if (b.active !== true) return { status: "locked" };
  return { status: "open", productId: typeof b.productId === "string" ? b.productId : null, expiresAt: typeof b.expiresAt === "string" ? b.expiresAt : null, trial: b.trial === true };
}

export async function fetchAccess(f: typeof fetch = fetch): Promise<Access> {
  try {
    const r = await f("/api/academy/entitlement", { cache: "no-store" });
    return accessFrom({ status: r.status, body: await r.json().catch(() => null) });
  } catch {
    return accessFrom(null);
  }
}
