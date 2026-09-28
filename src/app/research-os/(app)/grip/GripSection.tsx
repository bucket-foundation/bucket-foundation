"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import type { Grip, GripAxis } from "@/lib/research-os/grip";

type Body = Grip & { certified: false; assessedItems: number };
type Load = { kind: "loading" } | { kind: "hidden" } | { kind: "error"; message: string } | { kind: "ready"; body: Body };

const LABEL: Record<string, string> = {
  "01-mathematics": "mathematics",
  "02-physics": "physics",
  "03-chemistry": "chemistry",
  "04-information": "information",
  "05-biophysics": "biophysics",
  "06-cosmology": "cosmology",
  "07-mind": "mind",
};

const SIZE = 320;
const C = SIZE / 2;
const R = 118;

function point(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function Sphere({ axes }: { axes: GripAxis[] }) {
  const n = axes.length;
  const shape = axes.map((a, i) => point(i, n, Math.max(a.radius, 0.02) * R).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[360px]" role="img" aria-label={axes.map((a) => `${LABEL[a.branch] ?? a.branch} ${Math.round(a.radius * 100)} percent`).join(", ")}>
      <defs>
        <radialGradient id="grip-shade" cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="var(--bone)" />
          <stop offset="100%" stopColor="var(--bone-2)" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R} fill="url(#grip-shade)" stroke="var(--hairline)" />
      {[0.25, 0.5, 0.75].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="var(--hairline)" strokeDasharray="2 3" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, n, R);
        const [lx, ly] = point(i, n, R + 18);
        return (
          <g key={a.branch}>
            <line x1={C} y1={C} x2={x} y2={y} stroke="var(--hairline)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--basalt-3)" style={{ fontVariant: "small-caps", letterSpacing: "0.12em" }}>
              {LABEL[a.branch] ?? a.branch}
            </text>
          </g>
        );
      })}
      <polygon points={shape} fill="var(--gold)" fillOpacity="0.35" stroke="var(--gold)" strokeWidth="1.5" />
      {axes.map((a, i) => {
        const [x, y] = point(i, n, a.radius * R);
        return a.radius > 0 ? <circle key={a.branch} cx={x} cy={y} r="3" fill="var(--basalt)" /> : null;
      })}
    </svg>
  );
}

export default function GripSection({ compact = false }: { compact?: boolean }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/research-os/grip", { cache: "no-store" });
        if (!live) return;
        if (!res.ok) {
          const transient = isTransientOutage(res.status, await readErrorCode(res));
          if (!live) return;
          if (compact && !transient) return setLoad({ kind: "hidden" });
          return setLoad({ kind: "error", message: transient ? `${OUTAGE_COPY.title}. ${OUTAGE_COPY.body}` : `The grip is unavailable (${res.status}).` });
        }
        setLoad({ kind: "ready", body: (await res.json()) as Body });
      } catch {
        if (live) setLoad(compact ? { kind: "hidden" } : { kind: "error", message: "The grip could not reach the server." });
      }
    })();
    return () => {
      live = false;
    };
  }, [compact]);

  if (load.kind === "hidden" || (load.kind === "loading" && compact)) return null;
  if (load.kind === "loading") return <p className="mt-6 text-[13px] text-[color:var(--basalt-3)]">Loading your grip.</p>;
  if (load.kind === "error") return <p role="alert" className="mt-6 text-[13px] text-[color:var(--basalt)]">{load.message}</p>;
  const g = load.body;

  return (
    <section aria-label="knowledge grip" className={`${compact ? "" : "mt-6 "}border border-[color:var(--hairline)] rounded-sm bg-[color:var(--bone)]/70 p-4 flex flex-col gap-4`}>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">knowledge grip</h2>
        <span className="font-display text-[28px] leading-none text-[color:var(--basalt)]">{(g.grip * 100).toFixed(1)}</span>
        <span className="text-[12px] text-[color:var(--basalt-3)]">of 100, the filled share of the sphere</span>
        {compact && (
          <Link href="/research-os/grip" className="ml-auto text-[12px] underline underline-offset-4 text-[color:var(--basalt-3)]">
            open
          </Link>
        )}
      </div>
      <p className="text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">
        Each spoke is a branch. Its length is how deep your assessed knowledge reaches with every prerequisite under it also assessed. {g.demonstratedTotal} of {g.catalogTotal} concepts shown in {g.assessedItems} auto-graded test answers. Self-assessed through Test yourself, uncertified. A catalog index for these seven decks.
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] items-start">
        <Sphere axes={g.axes} />
        <ul className="flex flex-col gap-3">
          {g.axes.map((a) => (
            <li key={a.branch} className="text-[13px]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[color:var(--basalt)]">{LABEL[a.branch] ?? a.branch}</span>
                <span className="text-[12px] text-[color:var(--basalt-3)]">
                  reach {Math.round(a.radius * 100)}% · coverage {a.demonstrated}/{a.total}
                </span>
              </div>
              {a.missing.length > 0 && (
                <div className="mt-0.5 text-[12px] text-[color:var(--basalt-2)]">
                  next:{" "}
                  {a.missing.map((m, i) => (
                    <span key={m.id}>
                      {i > 0 ? ", " : ""}
                      {m.learnHref ? (
                        <Link href={m.learnHref} className="underline underline-offset-4">{m.title}</Link>
                      ) : (
                        m.title
                      )}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
