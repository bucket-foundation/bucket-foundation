import type { Metadata } from "next";
import Link from "next/link";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";
import { parseUserQuery, toProfile } from "@/lib/admin/users";
import AdminFrame, { BUTTON, H2, INPUT, Table, Unavailable, when } from "../AdminFrame";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

export default async function UsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const staff = await requireStaff();
  const source = adminSource();
  const raw = typeof searchParams.q === "string" ? searchParams.q : "";
  const now = new Date();
  const [rows, audit] = source ? await Promise.all([source.users(parseUserQuery(raw), 100), source.audit(50)]) : [[], []];
  const profiles = rows.map((r) => toProfile(r, now));
  return (
    <AdminFrame title="Users" staff={staff.email}>
      {!source && <Unavailable />}
      <form method="get" className="flex flex-col sm:flex-row gap-3 max-w-[560px]">
        <label htmlFor="user-q" className="sr-only">email or user id</label>
        <input id="user-q" name="q" defaultValue={raw} placeholder="email or user id" className={INPUT} />
        <button type="submit" className={BUTTON}>search</button>
      </form>
      <div>
        <h2 className={H2}>{profiles.length} users{raw ? ` matching ${raw}` : ""}</h2>
        <Table
          head={["email", "app", "plan", "languages", "streak", "level", "last active", "status"]}
          rows={profiles.map((p) => [
            <Link key="e" href={`/admin/users/${p.id}`} className="underline underline-offset-4 break-all">{p.email ?? p.id}</Link>,
            p.app,
            p.plan,
            p.languages.join(", ") || "-",
            p.streak.label,
            p.level,
            when(p.lastActive),
            p.disabled ? "disabled" : "active",
          ])}
        />
      </div>
      <div>
        <h2 className={H2}>Audit log</h2>
        <Table
          head={["when", "staff", "action", "user", "reason", "outcome"]}
          rows={audit.map((a) => [when(a.createdAt), a.actorEmail, a.action, a.targetEmail ?? a.targetUserId, a.reason, a.outcome + (a.detail ? `: ${a.detail}` : "")])}
        />
      </div>
    </AdminFrame>
  );
}
