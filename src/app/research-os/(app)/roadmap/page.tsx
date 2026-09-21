import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/research-os/staff";
import {
  COST_LABEL,
  decisionsFor,
  type Stage as StageName,
  ROADMAP,
  STAGE_LABEL,
  STAGE_TEST,
  STAGES,
  countsByStage,
  itemsByStage,
  readyNow,
  roadmapProblems,
  type RoadmapItem,
  type Stage,
} from "@/lib/research-os/roadmap";

export const metadata: Metadata = { title: "Roadmap", robots: { index: false, follow: false } };

// The staged queue (learning/research-os/ROADMAP.md). The list itself is
// src/lib/research-os/roadmap.ts, so the page and the memo cannot drift.
// ?stage= shows one stage, ?epic= one epic.
//
// Staff only, the same test the shell uses to show the teaching nav: this
// is the internal order of the work, and it names the decisions waiting on
// the founder. A signed-in learner gets a 404.

export const dynamic = "force-dynamic";

const CARD =
  "border border-[color:var(--hairline)] rounded-sm p-4 bg-[color:var(--bone)]/70 flex flex-col gap-2";
const CHIP =
  "inline-flex items-center px-2 py-1 text-[11px] small-caps tracking-[0.12em] border border-[color:var(--hairline)] rounded-sm";

function statusChip(item: RoadmapItem) {
  if (item.status === "shipped") return { label: "shipped", tone: "text-[color:var(--basalt-3)]" };
  if (item.status === "partial") return { label: "in flight", tone: "text-[color:var(--basalt)]" };
  return { label: "open", tone: "text-[color:var(--basalt)]" };
}

function Item({
  item,
  blockedFirst,
  decisions,
}: {
  item: RoadmapItem;
  blockedFirst: string[];
  decisions: string[];
}) {
  const status = statusChip(item);
  const inherited = decisions.filter((d) => !(item.blockedBy ?? []).includes(d));
  return (
    <li className={CARD}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${CHIP} ${status.tone}`}>{status.label}</span>
        <span className="text-[13px] font-medium">{item.id}</span>
        <span className="text-[12px] text-[color:var(--basalt-3)]">{item.epic}</span>
        <span className="text-[12px] text-[color:var(--basalt-3)] ml-auto">{COST_LABEL[item.cost]}</span>
      </div>
      <p className="text-[14px] leading-snug">{item.title}</p>
      <p className="text-[13px] text-[color:var(--basalt-3)]">Unlocks: {item.unlocks}</p>
      {item.dependsOn.length > 0 && (
        <p className="text-[12px] text-[color:var(--basalt-3)]">
          After: {item.dependsOn.join(", ")}
          {blockedFirst.length > 0 && (
            <span className="text-[color:var(--basalt)]"> (waiting on {blockedFirst.join(", ")})</span>
          )}
        </p>
      )}
      {decisions.length > 0 && (
        <p className="text-[12px]">
          Waits on{" "}
          <Link
            className="underline underline-offset-4"
            href="https://github.com/bucket-foundation/bucket-foundation/blob/dev/docs/FOUNDER-DECISIONS.md"
          >
              {decisions.join(", ")}
          </Link>
          {inherited.length > 0
            ? `, ${inherited.join(" and ")} through what it rests on`
            : ""}
          , and only the founder answers that.
        </p>
      )}
    </li>
  );
}

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!(await isStaff(user))) notFound();

  const pick = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const stageParam = pick("stage");
  const stageFilter = STAGES.find((s) => s === stageParam);
  const epicFilter = (pick("epic") ?? "").slice(0, 40);
  const epics = Array.from(new Set(ROADMAP.map((i) => i.epic))).sort();
  const visible = ROADMAP.filter(
    (i) => (!stageFilter || i.stage === stageFilter) && (!epicFilter || i.epic === epicFilter),
  );
  const filtered = Boolean(stageFilter || epicFilter);
  const counts = countsByStage(visible);
  const ready = readyNow(visible, ROADMAP);
  const problems = roadmapProblems();
  const statusById = new Map(ROADMAP.map((i) => [i.id, i.status]));
  const shownStages: Stage[] = stageFilter ? [stageFilter] : STAGES;

  const hrefWith = (next: { stage?: StageName | null; epic?: string | null }) => {
    const params = new URLSearchParams();
    const stage = next.stage === undefined ? stageFilter : next.stage;
    const epic = next.epic === undefined ? epicFilter : next.epic;
    if (stage) params.set("stage", stage);
    if (epic) params.set("epic", epic);
    const query = params.toString();
    return query ? `/research-os/roadmap?${query}` : "/research-os/roadmap";
  };

  const filterLink = (label: string, href: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      aria-pressed={active}
      title={active ? "on, and another click clears it" : undefined}
      className={`${CHIP} min-h-[36px] ${active ? "bg-[color:var(--bone-2)]" : ""}`}
    >
      {label}
      {active ? " ×" : ""}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Research OS · roadmap"
        title="what ships next"
        lede="Every open Research OS item staged as MVP, near-term, or later, beside the shipped items they rest on. The founder sets the order between stages; the loop keeps the order inside one. Cost is in loop passes, one pass being one turn of the build loop."
      />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {filterLink("everything", "/research-os/roadmap", !stageFilter && !epicFilter)}
          {STAGES.map((s) =>
            filterLink(
              stageFilter === s
                ? STAGE_LABEL[s]
                : `${STAGE_LABEL[s]} · ${countsByStage(ROADMAP.filter((i) => !epicFilter || i.epic === epicFilter))[s].open} open`,
              hrefWith({ stage: stageFilter === s ? null : s }),
              stageFilter === s,
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">by epic</span>
          {epics.map((e) =>
            filterLink(
              epicFilter === e
                ? e
                : `${e} · ${ROADMAP.filter((i) => i.epic === e && i.status !== "shipped" && (!stageFilter || i.stage === stageFilter)).length}`,
              hrefWith({ epic: epicFilter === e ? null : e }),
              epicFilter === e,
            ),
          )}
        </div>
      </section>

      {problems.length > 0 && (
        <section className="border border-[color:var(--hairline)] rounded-sm p-4">
          <h2 className="text-[13px] small-caps tracking-[0.14em]">List problems</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13px]">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="border border-[color:var(--hairline)] rounded-sm p-4">
        <h2 className="text-[13px] small-caps tracking-[0.14em]">Ready to start</h2>
        <p className="mt-1 text-[13px] text-[color:var(--basalt-3)]">
          Nothing open in front of them, and no decision pending
          {filtered ? ", inside the filter above" : ""}.
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-[14px]">
          {ready.map((i) => (
            <li key={i.id}>
              <span className="font-medium">{i.id}</span>{" "}
              <span className="text-[color:var(--basalt-3)]">{STAGE_LABEL[i.stage]}</span>, {i.title}
            </li>
          ))}
          {ready.length === 0 && (
            <li className="text-[color:var(--basalt-3)]">
              {visible.length === 0 ? "Nothing matches the filter." : "Everything open here waits on something."}
            </li>
          )}
        </ul>
      </section>

      {visible.length === 0 && (
        <p className="text-[14px] text-[color:var(--basalt-3)]">
          {stageFilter && epicFilter
            ? `No ${epicFilter} item is staged ${STAGE_LABEL[stageFilter]}.`
            : "No item matches that filter."}{" "}
          <Link className="underline underline-offset-4" href="/research-os/roadmap">
            Clear the filters
          </Link>
          .
        </p>
      )}

      {shownStages.map((stage) => {
        const items = itemsByStage(stage, visible);
        if (items.length === 0) return null;
        return (
          <section key={stage} className="flex flex-col gap-3">
            <div>
              <h2 className="text-[15px] small-caps tracking-[0.14em]">{STAGE_LABEL[stage]}</h2>
              <p className="text-[13px] text-[color:var(--basalt-3)]">
                {counts[stage].open} open and {counts[stage].shipped} shipped. {STAGE_TEST[stage]}
              </p>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  blockedFirst={item.dependsOn.filter((d) => statusById.get(d) !== "shipped")}
                  decisions={decisionsFor(item)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
