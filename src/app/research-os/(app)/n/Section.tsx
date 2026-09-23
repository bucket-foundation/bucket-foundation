import type { ReactNode } from "react";

export default function Section({ id, level, title, meta, children }: { id: string; level?: string; title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="small-caps text-[11px] tracking-[0.18em] text-[color:var(--aegean-deep)]">
          {title}
          {level && <span className="ml-2 text-[color:var(--basalt-3)]">· {level}</span>}
        </h2>
        {meta && <div className="text-[12px] text-[color:var(--basalt-3)]">{meta}</div>}
      </div>
      {children}
    </section>
  );
}
