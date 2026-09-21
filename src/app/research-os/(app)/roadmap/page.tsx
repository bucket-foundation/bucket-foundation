import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import {
  COST_LABEL,
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

const CARD =
  "border border-[color:var(--hairline)] rounded-sm p-4 bg-[color:var(--bone)]/70 flex flex-col gap-2";
const CHIP =
  "inline-flex items-center px-2 py-1 text-[11px] small-caps tracking-[0.12em] border border-[color:var(--hairline)] rounded-sm";

function statusChip(item: RoadmapItem) {
  if (item.status === "shipped") return { label: "shipped", tone: "text-[color:var(--basalt-3)]" };
  if (item.status === "partial") return { label: "in flight", tone: "text-[color:var(--basalt)]" };
  return { label: "open", tone: "text-[color:var(--basalt)]" };
}

function Item({ item, blockedFirst }: { item: RoadmapItem; blockedFirst: string[] }) {
  const status = statusChip(item);
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
      {item.blockedBy && (
        <p className="text-[12px]">
          Waits on{" "}
          <Link className="underline underline-offset-4" href="https://github.com/bucket-foundation/bucket-foundation/blob/dev/docs/FOUNDER-DECISIONS.md">
            {item.blockedBy}
          </Link>
          , a decision only the founder makes.
        </p>
      )}
    </li>
  );
}

export default function RoadmapPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
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
  const counts = countsByStage();
  const ready = readyNow();
  const problems = roadmapProblems();
  const statusById = new Map(ROADMAP.map((i) => [i.id, i.status]));
  const shownStages: Stage[] = stageFilter ? [stageFilter] : STAGES;

  const filterLink = (label: string, href: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      className={`${CHIP} min-h-[36px] ${active ? "bg-[color:var(--bone-2)]" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Research OS · roadmap"
        title="what ships next"
        lede="Every queued item staged as MVP, near-term, or later, with what it depends on and what it unlocks. The founder sets the order between stages; the loop keeps the order inside one."
      />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {filterLink("all stages", "/research-os/roadmap", !stageFilter && !epicFilter)}
          {STAGES.map((s) =>
            filterLink(
              `${STAGE_LABEL[s]} · ${counts[s].open} open`,
              `/research-os/roadmap?stage=${s}`,
              stageFilter === s,
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {epics.map((e) =>
            filterLink(e, `/research-os/roadmap?epic=${encodeURIComponent(e)}`, epicFilter === e),
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
          Nothing open in front of them, and no decision pending.
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-[14px]">
          {ready.map((i) => (
            <li key={i.id}>
              <span className="font-medium">{i.id}</span>{" "}
              <span className="text-[color:var(--basalt-3)]">{STAGE_LABEL[i.stage]}</span>, {i.title}
            </li>
          ))}
          {ready.length === 0 && <li className="text-[color:var(--basalt-3)]">Everything open waits on something.</li>}
        </ul>
      </section>

      {shownStages.map((stage) => {
        const items = itemsByStage(stage, visible);
        if (items.length === 0) return null;
        return (
          <section key={stage} className="flex flex-col gap-3">
            <div>
              <h2 className="text-[15px] small-caps tracking-[0.14em]">
                {STAGE_LABEL[stage]}, {counts[stage].open} open and {counts[stage].shipped} shipped
              </h2>
              <p className="text-[13px] text-[color:var(--basalt-3)]">{STAGE_TEST[stage]}</p>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  blockedFirst={item.dependsOn.filter((d) => statusById.get(d) !== "shipped")}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
