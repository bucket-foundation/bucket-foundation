import type { Metadata } from "next";
import { FUNNEL_STEPS, funnelReport, outreachSummary, todayQueue, viewSeries, type FunnelCounts } from "@/lib/admin/polingual-ops";
import { polingualOpsSource } from "@/lib/admin/polingual-ops-store";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { BUTTON, H2, pct, Stat, Table, Unavailable, when } from "../AdminFrame";
import { approvePost, skipPost } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Polingual ops", robots: { index: false, follow: false } };

const FUNNEL_DAYS = 30;
const SOCIAL_DAYS = 30;
const DAY_MS = 86_400_000;

function rate(c: FunnelCounts): string {
  return pct(c.visits ? c.paid / c.visits : null);
}

function funnelCells(c: FunnelCounts) {
  return [...FUNNEL_STEPS.map((s) => c[s]), rate(c)];
}

function Spark({ points }: { points: { day: string; views: number }[] }) {
  if (points.length < 2) return <span className="text-[color:var(--basalt-3)]">-</span>;
  const max = Math.max(...points.map((p) => p.views), 1);
  const w = 120;
  const h = 28;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - (p.views / max) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`views from ${points[0].views} to ${points.at(-1)!.views}`}>
      <path d={d} fill="none" stroke="var(--gold-deep)" strokeWidth={1.5} />
    </svg>
  );
}

export default async function PolingualOpsPage({ searchParams }: { searchParams: { result?: string } }) {
  const staff = await requireStaff();
  const source = polingualOpsSource();
  const now = new Date();
  const since = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const [posts, metrics, outreach, events] = source
    ? await Promise.all([source.posts(since(SOCIAL_DAYS)), source.metrics(since(SOCIAL_DAYS)), source.outreach(), source.funnel(since(FUNNEL_DAYS))])
    : [[], [], [], []];
  const today = todayQueue(posts, now);
  const pipeline = outreachSummary(outreach, now);
  const funnel = funnelReport(events);
  const series = viewSeries(posts, metrics);
  const funnelHead = ["visits", "signup", "trial", "paid", "visit to paid"];

  return (
    <AdminFrame title="Polingual ops" staff={staff.email}>
      {!source && <Unavailable />}
      {searchParams.result && (
        <p role="status" className="text-[13px] text-[color:var(--basalt-2)]">
          Result: {searchParams.result.replaceAll("_", " ")}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className={H2}>Today</h2>
        {today.length === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">Nothing scheduled today.</p>}
        <ul className="flex flex-col gap-4">
          {today.map((p) => (
            <li key={p.id} className="border border-[color:var(--hairline)] p-3 flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2 text-[12px] text-[color:var(--basalt-3)]">
                <span className="small-caps tracking-[0.14em]">{p.platform}</span>
                <span>{when(p.scheduled_for)}</span>
                <span className="small-caps tracking-[0.14em]">{p.status.replaceAll("_", " ")}</span>
              </div>
              <p className="text-[14px] text-[color:var(--basalt)] break-words">{p.caption || p.slug}</p>
              {p.preview_url && (
                <a href={p.preview_url} target="_blank" rel="noreferrer" className="text-[13px] underline underline-offset-4 min-h-[44px] inline-flex items-center">
                  Preview
                </a>
              )}
              {p.approved_by && <p className="text-[12px] text-[color:var(--basalt-3)]">Approved by {p.approved_by}</p>}
              {p.status !== "posted" && p.status !== "skipped" && (
                <div className="flex gap-3">
                  {!p.approved_at && (
                    <form action={approvePost}>
                      <input type="hidden" name="postId" value={p.id} />
                      <button type="submit" className={BUTTON}>approve</button>
                    </form>
                  )}
                  <form action={skipPost}>
                    <input type="hidden" name="postId" value={p.id} />
                    <button type="submit" className={`${BUTTON} bg-transparent border border-[color:var(--hairline)]`}>skip</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={H2}>Outreach pipeline</h2>
        <div className="flex flex-wrap gap-6">
          {Object.entries(pipeline.byStatus).map(([s, n]) => (
            <Stat key={s} label={s.replaceAll("_", " ")} value={n} />
          ))}
        </div>
        <Table
          head={["contact", "kind", "channel", "status", "next touch"]}
          rows={pipeline.due.map((r) => [
            r.thread_url ? <a key="c" href={r.thread_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{r.contact}{r.org ? `, ${r.org}` : ""}</a> : `${r.contact}${r.org ? `, ${r.org}` : ""}`,
            r.kind,
            r.channel,
            r.status.replaceAll("_", " "),
            when(r.next_touch),
          ])}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={H2}>Funnel</h2>
        <p className="text-[12px] text-[color:var(--basalt-3)]">Unique visitors per step, last {FUNNEL_DAYS} days, source is the first utm_source seen.</p>
        <div className="flex flex-wrap gap-6">
          {FUNNEL_STEPS.map((s) => (
            <Stat key={s} label={s} value={funnel.totals[s]} />
          ))}
          <Stat label="visit to paid" value={rate(funnel.totals)} />
        </div>
        <Table head={["source", ...funnelHead]} rows={funnel.bySource.map((r) => [r.source, ...funnelCells(r)])} />
        <Table head={["day", ...funnelHead]} rows={funnel.byDay.map((r) => [r.day, ...funnelCells(r)])} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={H2}>Social</h2>
        <Table head={["post", "platform", "views", "trend"]} rows={series.map((s) => [s.slug, s.platform, s.latest, <Spark key="s" points={s.points} />])} />
      </section>
    </AdminFrame>
  );
}
