import type { Metadata } from "next";
import { listTranslationReports } from "@/lib/academy/translation-report-server";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { H2, Table, Unavailable, when } from "../AdminFrame";

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
          <Table
            head={["when", "lang", "item", "shown", "reason", "suggestion", "where", "from"]}
            rows={rows.map((r) => [
              when(r.created_at),
              r.root ? `${r.lang} from ${r.root}` : r.lang,
              r.item_id ?? r.text ?? "-",
              r.shown,
              r.reason,
              r.suggestion ?? "-",
              r.context ?? "-",
              r.user_id ? "account" : "device",
            ])}
          />
        </section>
      ) : (
        <Unavailable />
      )}
    </AdminFrame>
  );
}
