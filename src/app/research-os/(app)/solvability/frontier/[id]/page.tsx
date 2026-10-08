import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";
import records from "@/lib/research-os/solvability-records-data.json";
import { neighbourPositions, recordFor, type NeighbourRef, type PackedRecords } from "@/lib/research-os/solvability-records";
import { recordGlyph } from "@/lib/research-os/solvability-record-render";
import { ZONE_LABEL } from "@/lib/research-os/solvability-frontier";

export const metadata: Metadata = { title: "Solvability problem record", robots: { index: false, follow: false } };

const P = "text-[13px] leading-[1.7] text-[color:var(--basalt-2)]";
const TD = "px-2 py-1 align-top text-[12px] text-[color:var(--basalt)] border-b border-[color:var(--hairline)]";
const f3 = (x: number) => x.toFixed(3);
const FRONTIER = "/research-os/solvability/frontier";

function Neighbours({ rows }: { rows: readonly NeighbourRef[] }) {
  if (rows.length === 0) return <p className={P}>none among the stored neighbours</p>;
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((n) => (
          <tr key={n.id}>
            <td className={TD}>
              <Link href={`${FRONTIER}/${encodeURIComponent(n.id)}`} className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
                {n.title}
              </Link>
              <span className="block font-mono text-[10px] text-[color:var(--basalt-3)]">{n.id}</span>
            </td>
            <td className={`${TD} font-mono tabular-nums text-right`}>{f3(n.similarity)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SolvabilityRecordPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const data = records as unknown as PackedRecords;
  const rec = recordFor(data, decodeURIComponent(id));
  if (!rec) notFound();
  const svg = recordGlyph(rec, neighbourPositions(data, rec));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${rec.branch} · ${rec.form}`}
        title={rec.title}
        lede={`${ZONE_LABEL[rec.zone]}. Reach ${f3(rec.reach)} against a frontier at ${f3(data.threshold)}; status ${rec.status}, read as ${rec.coding}.`}
        actions={<Link href={FRONTIER} className="text-[12px] underline underline-offset-4 text-[color:var(--aegean-deep)]">back to the frontier report</Link>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Panel title="position" meta={rec.zone}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="text-[11px] text-[color:var(--basalt-3)] mt-2">Dashed ring: solved core. Black ring: the frontier. Filled dots are the six nearest solved rows, hollow dots the six nearest open rows. Angle {rec.theta.toFixed(3)} rad, radius {f3(rec.radius)}.</p>
        </Panel>
        <Panel title="statement" meta={rec.id}>
          <p className={P}>{rec.statement || "No statement stored."}</p>
          {rec.statementCut && <p className="text-[11px] text-[color:var(--basalt-3)] mt-1">Cut at 200 characters; the full text sits at the statement source.</p>}
          <dl className="mt-3 grid grid-cols-[130px_1fr] gap-y-1 text-[12px] text-[color:var(--basalt)]">
            <dt className="text-[color:var(--basalt-3)]">posed</dt>
            <dd>{rec.posed ?? "no year"}{rec.posedEvidence ? `, ${rec.posedEvidence}` : ""}</dd>
            <dt className="text-[color:var(--basalt-3)]">resolved</dt>
            <dd>{rec.resolved ?? "not resolved"}</dd>
            <dt className="text-[color:var(--basalt-3)]">status source</dt>
            <dd>{rec.statusSource || "none stored"}</dd>
            <dt className="text-[color:var(--basalt-3)]">statement source</dt>
            <dd className="break-all">{rec.statementSource}</dd>
            <dt className="text-[color:var(--basalt-3)]">source</dt>
            <dd className="break-all">{rec.source}</dd>
            <dt className="text-[color:var(--basalt-3)]">licence</dt>
            <dd>{rec.licence}</dd>
            <dt className="text-[color:var(--basalt-3)]">keywords</dt>
            <dd>{rec.keywords.join(", ") || "none"}</dd>
            <dt className="text-[color:var(--basalt-3)]">market</dt>
            <dd>{rec.market.join(", ") || "none"}</dd>
            {rec.variantOf && (
              <>
                <dt className="text-[color:var(--basalt-3)]">variant of</dt>
                <dd>
                  <Link href={`${FRONTIER}/${encodeURIComponent(rec.variantOf.id)}`} className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
                    {rec.variantOf.title}
                  </Link>
                </dd>
              </>
            )}
          </dl>
        </Panel>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="nearest solved" meta="cosine similarity">
          <Neighbours rows={rec.nearestSolved} />
        </Panel>
        <Panel title="nearest open" meta="cosine similarity">
          <Neighbours rows={rec.nearestOpen} />
        </Panel>
      </div>
      <Panel title="principal components" meta={`${data.axes.length} axes of the embeddings`}>
        <table className="w-full border-collapse">
          <tbody>
            {data.axes.map((a, k) => (
              <tr key={a.component}>
                <td className={`${TD} font-mono`}>PC{a.component}</td>
                <td className={`${TD} font-mono tabular-nums text-right`}>{rec.pc[k].toFixed(3)}</td>
                <td className={TD}>
                  <span className="text-[color:var(--basalt-3)]">toward </span>
                  {a.positive.slice(0, 4).join(", ")}
                  <span className="text-[color:var(--basalt-3)]"> · away </span>
                  {a.negative.slice(0, 4).join(", ")}
                  <span className="block text-[10px] text-[color:var(--basalt-3)]">{(a.explained * 100).toFixed(1)}% of the variance</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {rec.hand && (
        <Panel title="hand-written record" meta={`quality ${rec.hand.quality_status}`}>
          {rec.hand.aliases.length > 0 && <p className={P}>Also known as {rec.hand.aliases.join(", ")}.</p>}
          {rec.hand.history.length > 0 && (
            <ul className={`${P} list-disc pl-5 mt-2`}>
              {rec.hand.history.map((h) => (
                <li key={`${h.year}-${h.event}`}>
                  {h.year}: {h.event}
                </li>
              ))}
            </ul>
          )}
          {rec.hand.key_works.length > 0 && (
            <ul className={`${P} list-disc pl-5 mt-2`}>
              {rec.hand.key_works.map((w) => (
                <li key={w.title}>
                  {w.title}
                  {w.year ? ` (${w.year})` : ""}, {w.role}, {w.cited_by_count} citations
                </li>
              ))}
            </ul>
          )}
          <p className={`${P} mt-2`}>
            Formal status {rec.hand.formal.status}. {rec.hand.activity_total} works mention it on OpenAlex.
            {rec.hand.people.length > 0 ? ` Most frequent authors: ${rec.hand.people.map((p) => p.name).join(", ")}.` : ""}
          </p>
        </Panel>
      )}
    </div>
  );
}
