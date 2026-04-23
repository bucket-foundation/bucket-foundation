import React from "react";

/**
 * Standard reading-width shell for interior pages (manifesto, protocol,
 * governance, about, join, canon/*). Maintains brand typography + spacing.
 */
export default function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
          {eyebrow && (
            <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">
              {eyebrow}
            </div>
          )}
          <h1 className="font-serif-display text-[clamp(2rem,5vw,4rem)] leading-[1.05] text-[color:var(--parchment)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 text-xl text-[color:var(--parchment-dim)] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-16">{children}</article>
    </main>
  );
}
