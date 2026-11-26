import { Badge, Button, Card, Eyebrow, Title } from "@/ui";
import { FUNNEL_STEPS, funnelReport, outreachSummary, PLATFORMS, reviewQueue, todayQueue, viewSeries, CAPTION_MAX, type FunnelCounts, type FunnelRow, type OutreachRow, type Platform, type SocialMetric, type SocialPost } from "@/lib/ops/ops";
import { missingEnv, storageUrl } from "@/lib/ops/send";
import { missingStoreEnv, postgrestOps, type OpsSource } from "@/lib/ops/store";
import { approvePost, saveCaption, sendToPlatform, signOut, skipPost } from "./actions";
import { requireAdmin } from "./session";
import s from "./ops.module.css";

export const dynamic = "force-dynamic";

const FUNNEL_DAYS = 30;
const SOCIAL_DAYS = 30;
const QUEUE_DAYS = 90;
const DAY_MS = 86_400_000;
const LABEL: Record<Platform, string> = { tiktok: "Send to TikTok", instagram: "Send to Instagram" };

function pct(n: number | null): string {
  return n === null ? "-" : `${(n * 100).toFixed(1)}%`;
}

function rate(c: FunnelCounts): string {
  return pct(c.visits ? c.paid / c.visits : null);
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "-";
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <p className={s.dim}>No rows.</p>;
  return (
    <div className={s.scroll}>
      <table className={s.table}>
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={s.stat}>
      <span className={s.statValue}>{value}</span>
      <span className={s.dim}>{label}</span>
    </div>
  );
}

function Spark({ points }: { points: { day: string; views: number }[] }) {
  if (points.length < 2) return <span className={s.dim}>-</span>;
  const max = Math.max(...points.map((p) => p.views), 1);
  const w = 120;
  const h = 28;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - (p.views / max) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`views from ${points[0].views} to ${points.at(-1)!.views}`}>
      <path d={d} fill="none" stroke="var(--pl-lapis)" strokeWidth={1.5} />
    </svg>
  );
}

function SendButton({ post, platform }: { post: SocialPost; platform: Platform }) {
  const sent = post.sent[platform];
  if (sent) return <Badge tone="malachite">{platform} sent {when(sent.at)}</Badge>;
  const missing = missingEnv(platform, process.env);
  const blocked = missing.length ? `Missing ${missing.join(", ")}` : !post.approved_at ? "Approve first" : post.slides.length === 0 ? "No slides uploaded" : null;
  return (
    <form action={sendToPlatform} className={s.send}>
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="platform" value={platform} />
      <Button type="submit" size="sm" variant={platform === "tiktok" ? "primary" : "secondary"} disabled={blocked !== null}>
        {LABEL[platform]}
      </Button>
      {blocked && <span className={s.blocked}>{blocked}</span>}
    </form>
  );
}

function ReviewCard({ post }: { post: SocialPost }) {
  return (
    <Card as="li" pad="lg" className={s.card}>
      <div className={s.meta}>
        <strong>{post.slug}</strong>
        <span>{post.platform}</span>
        <span>{when(post.scheduled_for)}</span>
        <Badge>{post.status.replaceAll("_", " ")}</Badge>
        {post.approved_at && <Badge tone="malachite">approved</Badge>}
      </div>
      <div className={s.slides}>
        {post.slides.map((path, i) => (
          <img key={path} src={storageUrl(path, process.env)} alt={`${post.slug} slide ${i + 1}`} className={s.slide} loading="lazy" />
        ))}
        {post.slides.length === 0 && <p className={s.dim}>No slides uploaded.</p>}
      </div>
      <form action={saveCaption} className={s.form}>
        <input type="hidden" name="postId" value={post.id} />
        <label className={s.dim} htmlFor={`caption-${post.id}`}>Caption</label>
        <textarea id={`caption-${post.id}`} name="caption" defaultValue={post.caption} maxLength={CAPTION_MAX} rows={4} className={s.caption} />
        <p className={s.tags}>{post.hashtags || "No hashtags."}</p>
        <div className={s.row}>
          <Button type="submit" size="sm" variant="quiet">Save caption</Button>
          {!post.approved_at && post.status !== "posted" && (
            <Button type="submit" size="sm" variant="success" formAction={approvePost}>Approve</Button>
          )}
          {post.status !== "posted" && (
            <Button type="submit" size="sm" variant="ghost" formAction={skipPost}>Skip</Button>
          )}
        </div>
      </form>
      <div className={s.row}>
        {PLATFORMS.map((p) => <SendButton key={p} post={post} platform={p} />)}
      </div>
    </Card>
  );
}

type Loaded = { posts: SocialPost[]; metrics: SocialMetric[]; outreach: OutreachRow[]; events: FunnelRow[]; error: string | null };

async function load(src: OpsSource | null, now: Date): Promise<Loaded> {
  const empty: Loaded = { posts: [], metrics: [], outreach: [], events: [], error: null };
  if (!src) return empty;
  const since = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  try {
    const [posts, metrics, outreach, events] = await Promise.all([src.posts(since(QUEUE_DAYS)), src.metrics(since(SOCIAL_DAYS)), src.outreach(), src.funnel(since(FUNNEL_DAYS))]);
    return { posts, metrics, outreach, events, error: null };
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : String(err) };
  }
}

const FUNNEL_HEAD = ["visits", "signup", "trial", "paid", "visit to paid"];
const cells = (c: FunnelCounts) => [...FUNNEL_STEPS.map((k) => c[k]), rate(c)];

function FunnelSection({ events }: { events: FunnelRow[] }) {
  const funnel = funnelReport(events);
  return (
    <section className={s.section}>
      <h2 className={s.h2}>Funnel</h2>
      <p className={s.dim}>Unique visitors per step, last {FUNNEL_DAYS} days, source is the first utm_source seen.</p>
      <div className={s.stats}>
        {FUNNEL_STEPS.map((k) => <Stat key={k} label={k} value={funnel.totals[k]} />)}
        <Stat label="visit to paid" value={rate(funnel.totals)} />
      </div>
      <Table head={["source", ...FUNNEL_HEAD]} rows={funnel.bySource.map((r) => [r.source, ...cells(r)])} />
      <Table head={["day", ...FUNNEL_HEAD]} rows={funnel.byDay.map((r) => [r.day, ...cells(r)])} />
    </section>
  );
}

function OutreachSection({ rows, now }: { rows: OutreachRow[]; now: Date }) {
  const pipeline = outreachSummary(rows, now);
  return (
    <section className={s.section}>
      <h2 className={s.h2}>Outreach</h2>
      <div className={s.stats}>
        {Object.entries(pipeline.byStatus).map(([k, n]) => <Stat key={k} label={k.replaceAll("_", " ")} value={n} />)}
      </div>
      <Table
        head={["contact", "kind", "channel", "status", "next touch"]}
        rows={pipeline.due.map((r) => [
          r.thread_url ? <a key="c" href={r.thread_url} target="_blank" rel="noreferrer">{r.contact}{r.org ? `, ${r.org}` : ""}</a> : `${r.contact}${r.org ? `, ${r.org}` : ""}`,
          r.kind,
          r.channel,
          r.status.replaceAll("_", " "),
          when(r.next_touch),
        ])}
      />
    </section>
  );
}

function SocialSection({ posts, metrics }: { posts: SocialPost[]; metrics: SocialMetric[] }) {
  const queue = reviewQueue(posts);
  const series = viewSeries(posts, metrics);
  return (
    <section className={s.section}>
      <h2 className={s.h2}>Social</h2>
      {queue.length === 0 && <p className={s.dim}>Review queue is empty. Run the carousel upload script.</p>}
      <ul className={s.queue}>
        {queue.map((p) => <ReviewCard key={p.id} post={p} />)}
      </ul>
      <Table head={["post", "platform", "views", "trend"]} rows={series.map((x) => [x.slug, x.platform, x.latest, <Spark key="s" points={x.points} />])} />
    </section>
  );
}

function Notices({ src, error, result, detail }: { src: OpsSource | null; error: string | null; result?: string; detail?: string }) {
  return (
    <>
      {!src && <p role="alert" className={s.error}>Data store offline. Missing {missingStoreEnv(process.env).join(", ")}.</p>}
      {error && <p role="alert" className={s.error}>Load failed: {error}</p>}
      {result && (
        <p role="status" className={result.endsWith("_ok") || result.endsWith("_sent") ? s.ok : s.error}>
          {result.replaceAll("_", " ")}{detail ? `: ${detail}` : ""}
        </p>
      )}
    </>
  );
}

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ result?: string; detail?: string }> }) {
  const admin = await requireAdmin();
  const q = await searchParams;
  const src = postgrestOps(process.env, fetch);
  const now = new Date();
  const data = await load(src, now);
  const today = todayQueue(data.posts, now);
  return (
    <main className={s.page}>
      <header className={s.head}>
        <div>
          <Eyebrow>Polingual ops</Eyebrow>
          <Title>Today</Title>
        </div>
        <form action={signOut} className={s.row}>
          <span className={s.dim}>{admin}</span>
          <Button type="submit" size="sm" variant="quiet">Sign out</Button>
        </form>
      </header>
      <Notices src={src} error={data.error} result={q.result} detail={q.detail} />
      <section className={s.section}>
        {today.length === 0 && <p className={s.dim}>Nothing scheduled today.</p>}
        <Table head={["post", "platform", "time", "status"]} rows={today.map((p) => [p.slug, p.platform, when(p.scheduled_for), p.status.replaceAll("_", " ")])} />
      </section>
      <FunnelSection events={data.events} />
      <OutreachSection rows={data.outreach} now={now} />
      <SocialSection posts={data.posts} metrics={data.metrics} />
    </main>
  );
}
