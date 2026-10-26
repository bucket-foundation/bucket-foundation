import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { H2 } from "./AdminFrame";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const LINKS = [
  { href: "/admin/users", label: "Users", body: "Search learners, open a profile, disable or delete an account." },
  { href: "/admin/revenue", label: "Revenue", body: "MRR, trials, refunds and plan mix from App Store notifications." },
  { href: "/admin/tracking", label: "Tracking", body: "Event funnels, experiment readouts and pixel consent." },
  { href: "/admin/activity", label: "Activity", body: "DAU, WAU, reviews a day and retention cohorts." },
  { href: "/admin/waitlist", label: "Launch list", body: "Signups and invites." },
  { href: "/admin/whats-new", label: "What's New", body: "Drafts waiting to publish." },
];

export default async function AdminHome() {
  const staff = await requireStaff();
  return (
    <AdminFrame title="Admin" staff={staff.email}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <li key={l.href} className="border border-[color:var(--hairline)] p-4">
            <Link href={l.href} className={H2 + " block underline-offset-4 hover:underline"}>{l.label}</Link>
            <p className="text-[13px] text-[color:var(--basalt-2)]">{l.body}</p>
          </li>
        ))}
      </ul>
    </AdminFrame>
  );
}
