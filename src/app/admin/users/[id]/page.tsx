import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";
import { userTimeline } from "@/lib/admin/tracking";
import { toProfile } from "@/lib/admin/users";
import AdminFrame, { BUTTON, H2, INPUT, Stat, Table, Unavailable, when } from "../../AdminFrame";
import { userAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User", robots: { index: false, follow: false } };

const RESULTS: Record<string, string> = {
  disable_ok: "Account disabled.",
  enable_ok: "Account enabled.",
  reason_required: "Write a reason of at least 3 characters.",
  confirm_mismatch: "Type the user's email or id to confirm the delete.",
  self_action: "Staff cannot act on their own account.",
  not_found: "No such user.",
  action_failed: "The action failed. The audit log has the error.",
  audit_failed: "The action ran but the audit row did not save. Check the server log.",
  store_unavailable: "The data store is not configured on this deploy.",
  bad_action: "Unknown action.",
};

export default async function UserPage({ params, searchParams }: { params: { id: string }; searchParams: { result?: string } }) {
  const staff = await requireStaff();
  const source = adminSource();
  if (!source) {
    return (
      <AdminFrame title="User" staff={staff.email}>
        <Unavailable />
      </AdminFrame>
    );
  }
  const row = await source.user(params.id);
  if (!row) notFound();
  const p = toProfile(row);
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [events, audit, assignments] = await Promise.all([source.beta.events(since), source.audit(20, p.id), source.beta.assignments(p.id)]);
  const timeline = userTimeline(events.rows, p.id, 100);
  const message = searchParams.result ? RESULTS[searchParams.result] : null;
  return (
    <AdminFrame title={p.email ?? p.id} staff={staff.email}>
      {message && <p role="status" className="text-[13px] text-[color:var(--basalt)] border border-[color:var(--hairline)] p-3">{message}</p>}
      <div className="flex flex-wrap gap-6">
        <Stat label="app" value={p.app} />
        <Stat label="plan" value={p.plan} />
        <Stat label="streak" value={p.streak.label} />
        <Stat label="level" value={p.level} />
        <Stat label="languages" value={p.languages.join(", ") || "-"} />
        <Stat label="last active" value={when(p.lastActive)} />
        <Stat label="status" value={p.disabled ? "disabled" : "active"} />
      </div>
      <p className="text-[12px] text-[color:var(--basalt-3)] break-all">id {p.id}, joined {when(p.joined)}, cohort {p.cohort ?? "-"}</p>
      <div>
        <h2 className={H2}>Experiments</h2>
        <Table head={["experiment", "arm", "source", "assigned"]} rows={assignments.map((a) => [a.experiment, a.arm, a.source, when(a.assignedAt)])} />
      </div>
      <div>
        <h2 className={H2}>Timeline</h2>
        <Table head={["when", "app", "event", "props"]} rows={timeline.map((t) => [when(t.ts), t.app, t.name, t.detail || "-"])} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <form action={userAction} className="flex flex-col gap-3 border border-[color:var(--hairline)] p-4">
          <h2 className={H2}>{p.disabled ? "Enable account" : "Disable account"}</h2>
          <input type="hidden" name="userId" value={p.id} />
          <input type="hidden" name="action" value={p.disabled ? "enable" : "disable"} />
          <label htmlFor="toggle-reason" className="text-[12px] text-[color:var(--basalt-2)]">reason</label>
          <input id="toggle-reason" name="reason" required minLength={3} maxLength={500} className={INPUT} />
          <button type="submit" className={BUTTON}>{p.disabled ? "enable" : "disable"}</button>
        </form>
        <form action={userAction} className="flex flex-col gap-3 border border-[color:var(--crimson)] p-4">
          <h2 className={H2}>Delete on request</h2>
          <input type="hidden" name="userId" value={p.id} />
          <input type="hidden" name="action" value="delete" />
          <label htmlFor="delete-reason" className="text-[12px] text-[color:var(--basalt-2)]">request reference and reason</label>
          <input id="delete-reason" name="reason" required minLength={3} maxLength={500} className={INPUT} />
          <label htmlFor="delete-confirm" className="text-[12px] text-[color:var(--basalt-2)]">type the email or id to confirm</label>
          <input id="delete-confirm" name="confirm" required autoComplete="off" className={INPUT} />
          <button type="submit" className={BUTTON + " bg-[color:var(--crimson)] text-white"}>delete account</button>
        </form>
      </div>
      <div>
        <h2 className={H2}>Audit log for this user</h2>
        <Table head={["when", "staff", "action", "reason", "outcome"]} rows={audit.map((a) => [when(a.createdAt), a.actorEmail, a.action, a.reason, a.outcome])} />
      </div>
    </AdminFrame>
  );
}
