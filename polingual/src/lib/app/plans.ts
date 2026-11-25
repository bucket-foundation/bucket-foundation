export interface Plan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  note?: string;
  productId: string | null;
}

export const PLANS: Plan[] = [
  { id: "monthly", name: "Monthly", price: "$9.99", cadence: "a month", productId: "com.polingual.monthly" },
  { id: "yearly", name: "Yearly", price: "$59.99", cadence: "a year", note: "7 days free, then $59.99 a year", productId: "com.polingual.yearly" },
  { id: "family", name: "Family", price: "$89.99", cadence: "a year", note: "Up to 6 people", productId: "com.polingual.family.yearly" },
  { id: "lifetime", name: "Lifetime", price: "$149.99", cadence: "once", note: "Pay once, keep it for good", productId: "com.polingual.lifetime" },
  { id: "student", name: "Student", price: "$29.99", cadence: "a year", productId: null },
];

export const WINBACK = { id: "winback", name: "Welcome back", price: "$44.99", cadence: "for your first year", note: "25% off, then $59.99 a year" } as const;

export const UPSELL_KEY = "polingual-web/upsell-shown/v1";

export function upsellDue(search: string, access: Access, seen: boolean): boolean {
  return !seen && new URLSearchParams(search).get("checkout") === "done" && access.status === "open" && access.trial === true;
}

export { APP_STORE_URL } from "../facts";

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
