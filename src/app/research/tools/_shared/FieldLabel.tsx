import type { ReactNode } from "react";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">{children}</span>;
}
