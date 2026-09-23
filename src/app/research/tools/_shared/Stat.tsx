import type { ReactNode } from "react";

export function Stat({ label, value, children }: { label: ReactNode; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
      {children}
    </div>
  );
}

export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  const base = "grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]";
  return <div className={className ? `${className} ${base}` : base}>{children}</div>;
}
