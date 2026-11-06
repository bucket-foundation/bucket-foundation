import type { Metadata } from "next";
import { RETENTION_DAYS } from "@/lib/academy/translation-report";
import { listTranslationReports } from "@/lib/academy/translation-report-server";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { H2, Table, Unavailable, when } from "../AdminFrame";
import { translationReportAction } from "./actions";

const ACTION = "px-3 min-h-[44px] text-[11px] small-caps tracking-[0.14em] border border-[color:var(--basalt-3)] text-[color:var(--basalt)]";

function Actions({ id, resolved }: { id: string; resolved: string | null }) {
  return (
    <form action={translationReportAction} className="flex gap-2">
      <input type="hidden" name="id" value={id} />
      {resolved ? <span className="text-[color:var(--basalt-3)] self-center">resolved</span> : (
        <button type="submit" name="action" value="resolve" className={ACTION}>resolve</button>
      )}
      <button type="submit" name="action" value="delete" className={ACTION}>delete</button>
    </form>
  );
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Translation reports", robots: { index: false, follow: false } };

export default async function TranslationReportsPage() {
  const staff = await requireStaff();
  const rows = await listTranslationReports(300).catch((err) => {
    console.error("[admin/translation-reports]", err instanceof Error ? err.message : err);
    return null;
  });
  return (
    <AdminFrame title="Translation reports" staff={staff.email}>
      {rows ? (
        <section>
          <h2 className={H2}>Newest {rows.length}</h2>
          <p className="mb-3 text-[12px] text-[color:var(--basalt-2)]">Resolved reports and reports older than {RETENTION_DAYS} days are deleted each night.</p>
          <Table
            head={["when", "lang", "item", "shown", "reason", "suggestion", "where", "from", ""]}
            rows={rows.map((r) => [
              when(r.created_at),
              r.root ? `${r.lang} from ${r.root}` : r.lang,
              r.item_id ?? r.text ?? "-",
              r.shown,
              r.reason,
              r.suggestion ?? "-",
              r.context ?? "-",
              r.user_id ? "account" : "device",
              <Actions key={r.id} id={r.id} resolved={r.resolved_at} />,
            ])}
          />
        </section>
      ) : (
        <Unavailable />
      )}
    </AdminFrame>
  );
}
