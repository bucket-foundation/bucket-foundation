import Link from "next/link";

export default function MapFigure({
  eyebrow,
  title,
  deck,
  footer,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  deck: string;
  footer: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="stone-bone relative">
      <div className="mx-auto max-w-[2400px] px-4 py-8 md:px-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link href="/research/maps" className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            All research maps
          </Link>
          {actions}
        </div>
        <figure data-map-figure className="m-0 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 md:p-9">
          <header className="mb-7">
            <div className="small-caps mb-3 text-[11px] text-[color:var(--aegean-deep)]">{eyebrow}</div>
            <h1 className="font-display text-[clamp(1.6rem,3vw,3rem)] uppercase leading-[1.05] text-[color:var(--basalt)]">{title}</h1>
            <p className="mt-3 max-w-4xl text-[clamp(0.95rem,1.1vw,1.25rem)] leading-[1.55] text-[color:var(--basalt-2)]">{deck}</p>
          </header>
          {children}
          <figcaption className="mt-7 flex flex-wrap items-baseline justify-between gap-3 border-t border-[color:var(--hairline)] pt-4 text-[clamp(0.72rem,0.8vw,0.95rem)] text-[color:var(--basalt-3)]">
            <span data-map-footer>{footer}</span>
            <span className="small-caps text-[10px] text-[color:var(--aegean-deep)]">bucket.foundation</span>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}

export function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[clamp(0.72rem,0.8vw,0.95rem)] text-[color:var(--basalt-2)]">
      {swatch}
      {label}
    </span>
  );
}
