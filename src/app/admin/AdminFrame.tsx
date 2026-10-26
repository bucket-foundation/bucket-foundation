import Link from "next/link";
import type { ReactNode } from "react";

export const H2 = "small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3";
export const TH = "text-left px-2 py-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] whitespace-nowrap";
export const TD = "px-2 py-2 text-[13px] text-[color:var(--basalt)] align-top";
export const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
export const BUTTON = "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";

const SECTIONS = [
  { href: "/admin", label: "overview" },
  { href: "/admin/users", label: "users" },
  { href: "/admin/revenue", label: "revenue" },
  { href: "/admin/tracking", label: "tracking" },
  { href: "/admin/activity", label: "activity" },
];

export function pct(v: number | null): string {
  return v === null ? "-" : `${Math.round(v * 100)}%`;
}

export function when(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "-";
}

export default function AdminFrame({ title, staff, children }: { title: string; staff: string; children: ReactNode }) {
  return (
    <main className="px-4 md:px-6 pt-10 md:pt-16 pb-16">
      <div className="mx-auto w-full max-w-[1100px]">
        <nav aria-label="admin" className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="small-caps text-[12px] tracking-[0.14em] text-[color:var(--basalt-2)] underline-offset-4 hover:underline min-h-[44px] inline-flex items-center">
              {s.label}
            </Link>
          ))}
        </nav>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">{title}</h1>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">Signed in as {staff}</p>
        <div className="mt-8 flex flex-col gap-10">{children}</div>
      </div>
    </main>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--hairline)]">
            {head.map((h) => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[color:var(--hairline)]">
              {r.map((c, j) => (
                <td key={j} className={TD}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-[color:var(--basalt-3)]">No rows.</p>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <span className="font-display text-[24px] leading-none text-[color:var(--basalt)]">{value}</span>
      <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">{label}</span>
    </div>
  );
}

export function Unavailable() {
  return <p role="alert" className="text-[13px] text-[color:var(--crimson)]">The data store is not configured on this deploy.</p>;
}
