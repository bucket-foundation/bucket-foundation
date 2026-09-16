/**
 * Research OS surface primitives. One set of tokens for every page inside
 * the app shell: a page header, a panel, and the three states every data
 * block passes through (loading, empty, error). Colors and type come from
 * globals.css variables so the app matches the rest of the site.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px] rounded-sm";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center px-4 py-2 text-[12px] small-caps tracking-[0.14em] border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:bg-[color:var(--bone-2)] min-h-[44px] rounded-sm";
export const LINK = "underline decoration-[color:var(--gold)] underline-offset-4 text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]";

export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow?: ReactNode; title: string; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{eyebrow}</div>}
        <h1 className="mt-1 font-display uppercase text-[clamp(1.4rem,3.6vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)] [text-wrap:balance]">{title}</h1>
        {lede && <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, meta, children, className = "" }: { title?: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={"bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 md:p-5 " + className}>
      {(title || meta) && (
        <div className="flex items-baseline justify-between gap-3 mb-3">
          {title && <h2 className="small-caps text-[11px] tracking-[0.18em] text-[color:var(--aegean-deep)]">{title}</h2>}
          {meta && <div className="text-[12px] text-[color:var(--basalt-3)]">{meta}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-4 text-[13px] text-[color:var(--basalt-3)]">
      <span aria-hidden className="inline-block w-3 h-3 rounded-full border border-[color:var(--gold-deep)] border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="py-6 text-center">
      <div className="text-[14px] text-[color:var(--basalt)]">{title}</div>
      {body && <p className="mt-1 text-[13px] leading-[1.6] text-[color:var(--basalt-3)] max-w-md mx-auto">{body}</p>}
      {action && (
        <Link href={action.href} className={BTN_SECONDARY + " mt-4"}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, retry }: { title?: string; body?: ReactNode; retry?: () => void }) {
  return (
    <div role="alert" className="py-4 border-l-2 border-[color:var(--crimson)] pl-4">
      <div className="text-[14px] text-[color:var(--basalt)]">{title}</div>
      {body && <p className="mt-1 text-[13px] leading-[1.6] text-[color:var(--basalt-3)]">{body}</p>}
      {retry && (
        <button type="button" onClick={retry} className={BTN_SECONDARY + " mt-3"}>
          try again
        </button>
      )}
    </div>
  );
}

/** A level chip for the five levels of interaction with the graph. */
export const STAGE_LABEL: Record<string, string> = {
  access: "Access",
  awareness: "Awareness",
  understanding: "Understanding",
  internalization: "Internalization",
  production: "Production",
};

export function StageChip({ stage }: { stage: string | null | undefined }) {
  const label = stage ? STAGE_LABEL[stage] ?? stage : "unseen";
  const tone = stage ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]";
  return <span className={"inline-block small-caps text-[10px] tracking-[0.14em] px-2 py-0.5 border rounded-sm " + tone}>{label}</span>;
}
