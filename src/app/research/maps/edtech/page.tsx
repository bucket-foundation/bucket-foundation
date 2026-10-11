import Link from "next/link";
import type { Metadata } from "next";
import { SEARCH_METHOD } from "@/lib/research-maps/edtech";
import { loadEdtech } from "@/lib/research-maps/edtech-data";
import MapFigure from "../MapFigure";
import EdtechMap from "./EdtechMap";
import EdtechTable from "./EdtechTable";

export const metadata: Metadata = { title: "Edtech market map", robots: { index: false, follow: false } };

const TAB = "border border-[color:var(--hairline)] px-3 py-1 text-[13px]";

export default function Page({ searchParams }: { searchParams?: { view?: string } }) {
  const data = loadEdtech();
  const table = searchParams?.view === "table";
  const footer = `${data.date}. ${data.players.length} players in ${data.segments.length} categories. ${SEARCH_METHOD} Logos are trademarks of their owners, shown for identification.`;
  return (
    <MapFigure
      eyebrow="Research map · market"
      title="Edtech market map"
      deck={
        table
          ? "Every player with its learner, mechanism, price and the efficacy evidence the research found."
          : "Who sells learning in 2026, grouped by category. The dot on each tile marks the strongest efficacy evidence the research found."
      }
      footer={footer}
      actions={
        <nav className="flex gap-2" aria-label="View">
          <Link href="/research/maps/edtech" className={`${TAB} ${table ? "text-[color:var(--basalt-3)]" : "bg-[color:var(--basalt)] text-[color:var(--bone)]"}`}>
            Map
          </Link>
          <Link href="/research/maps/edtech?view=table" className={`${TAB} ${table ? "bg-[color:var(--basalt)] text-[color:var(--bone)]" : "text-[color:var(--basalt-3)]"}`}>
            Table
          </Link>
        </nav>
      }
    >
      {table ? <EdtechTable players={data.players} segments={data.segments.map((s) => ({ id: s.id, label: s.label }))} /> : <EdtechMap segments={data.segments} />}
    </MapFigure>
  );
}
