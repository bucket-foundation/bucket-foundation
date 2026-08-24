/**
 * src/components/DepthLadder.tsx (bkt-a7v)
 * ------------------------------------------------------------------
 * The continuous L0→L5 depth ladder, rendered. Maps the pieces Bucket already
 * shipped onto a single visible, navigable climb:
 * Academy mastery (L1, L2) → Canon (L3, L4) → tools + research agent (L4, L5).
 *
 * Pure server component (no client state needed) using the site's stone/bone/
 * gold/aegean design tokens. Data + rung labels come from
 * src/lib/depth-ladder.ts (which vendors scale.py's L0, L5). The research agent
 * is the terminal rung, we LINK into it (/research/agent), never rebuild it.
 *
 * Props let a caller (e.g. the Academy mastery surface) pass the learner's
 * current rung to highlight their position and the on-ramp UP. Omitting it
 * renders the canonical, position-free ladder (e.g. on /mission).
 */
import Link from "next/link";
import {
  DEPTH_LADDER,
  LADDER_THESIS,
  type DepthLevel,
  type DepthRung,
  type LadderMode,
} from "@/lib/depth-ladder";

const MODE_LABEL: Record<LadderMode, string> = {
  consume: "consume",
  frontier: "frontier",
  produce: "produce",
};

// Tone per side of the consume↔produce divide, using existing CSS vars.
const MODE_ACCENT: Record<LadderMode, string> = {
  consume: "var(--aegean-deep)",
  frontier: "var(--gold-deep)",
  produce: "var(--basalt)",
};

export interface DepthLadderProps {
  /** highlight the learner's current rung + the next rung up, if known */
  currentLevel?: DepthLevel;
  /** show the one-paragraph mission thesis under the heading */
  showThesis?: boolean;
  /** show the cross-link to /mission */
  missionLink?: boolean;
  /** heading override (defaults to the canonical title) */
  heading?: string;
}

export default function DepthLadder({
  currentLevel,
  showThesis = true,
  missionLink = true,
  heading = "the depth ladder · mastery → frontier → producing knowledge",
}: DepthLadderProps) {
  const order: DepthLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];
  const curIdx = currentLevel ? order.indexOf(currentLevel) : -1;
  const nextIdx = curIdx >= 0 && curIdx < order.length - 1 ? curIdx + 1 : -1;

  return (
    <section aria-label="The L0 to L5 depth ladder" className="w-full">
      <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
        § {heading}
      </div>
      {showThesis && (
        <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-[color:var(--basalt-2)]">
          {LADDER_THESIS}
        </p>
      )}

      <ol className="mt-8 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
        {DEPTH_LADDER.map((rung) => {
          const isCurrent = rung.level === currentLevel;
          const isNext = order.indexOf(rung.level) === nextIdx;
          return (
            <Rung
              key={rung.level}
              rung={rung}
              isCurrent={isCurrent}
              isNext={isNext}
            />
          );
        })}
      </ol>

      {currentLevel && (
        <p className="mt-5 text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">
          You are around{" "}
          <strong className="text-[color:var(--basalt)]">{currentLevel}</strong>{" "}
          on this ladder.{" "}
          {nextIdx >= 0 ? (
            <>
              The on-ramp up is the{" "}
              <strong className="text-[color:var(--basalt)]">
                {MODE_LABEL[DEPTH_LADDER[nextIdx].mode]}
              </strong>{" "}
              rung — {DEPTH_LADDER[nextIdx].label}.
            </>
          ) : (
            <>You are at the terminal rung, producing new knowledge.</>
          )}{" "}
          The Academy gives an honest signal, not a certified rating, so your
          climb past L2 is the canon you read and the research you do, not a
          score.
        </p>
      )}

      {missionLink && (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em]">
          <Link
            href="/mission"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            why this ladder is the mission →
          </Link>
          <Link
            href="/research/agent"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the terminal rung · research agent →
          </Link>
        </div>
      )}
    </section>
  );
}

function Rung({
  rung,
  isCurrent,
  isNext,
}: {
  rung: DepthRung;
  isCurrent: boolean;
  isNext: boolean;
}) {
  const accent = MODE_ACCENT[rung.mode];
  return (
    <li
      className="bg-[color:var(--bone)] p-6 md:p-7 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
      style={
        isCurrent
          ? { borderLeft: `3px solid ${accent}` }
          : isNext
            ? { borderLeft: `3px solid var(--gold)` }
            : undefined
      }
    >
      <div className="flex items-baseline gap-4 flex-wrap">
        <span
          className="font-display text-[22px] leading-none"
          style={{ color: accent }}
        >
          {rung.level}
        </span>
        <span className="font-display uppercase text-[16px] tracking-[0.03em] text-[color:var(--basalt)]">
          {rung.label.replace(/^L\d\s+/, "")}
        </span>
        <span
          className="small-caps text-[10px] tracking-[0.14em]"
          style={{ color: accent }}
        >
          {MODE_LABEL[rung.mode]}
        </span>
        {isCurrent && (
          <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">
            ← you are here
          </span>
        )}
        {isNext && (
          <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--gold-deep)]">
            ← next rung up
          </span>
        )}
        <span className="ml-auto font-display text-[15px] text-[color:var(--basalt-3)]">
          {rung.worldAccess}{" "}
          <span className="small-caps text-[9px] tracking-[0.12em]">
            world access
          </span>
        </span>
      </div>
      <div className="w-8 h-0.5 mt-3" style={{ background: "var(--gold)" }} />
      <p className="mt-3 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
        {rung.gloss}
      </p>
      {rung.surfaces.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {rung.surfaces.map((s) => (
            <Link
              key={s.href + s.label}
              href={s.href}
              className="group flex items-baseline gap-3 text-[13px] text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)]"
            >
              <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 shrink-0">
                {s.label} →
              </span>
              <span className="leading-[1.55]">{s.note}</span>
            </Link>
          ))}
        </div>
      )}
      {rung.surfaces.length === 0 && (
        <p className="mt-3 text-[12px] text-[color:var(--basalt-3)] italic">
          The ladder begins here; Bucket&rsquo;s climb starts at the next rung.
        </p>
      )}
    </li>
  );
}
