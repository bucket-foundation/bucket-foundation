import Link from "next/link";
import { MAPS } from "./maps";

export default function Page() {
  return (
    <main className="stone-bone relative">
      <div className="mx-auto max-w-[1100px] px-4 py-14 md:px-6 md:py-24">
        <div className="small-caps mb-5 text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">§ Research · maps</div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.75rem)] uppercase leading-[1.05] text-[color:var(--basalt)]">
          research <span className="inlay-gold">maps.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          Figures drawn from the market research and the learning corpus. Each page exports a 2400 pixel image and a PDF.
        </p>
        <div className="carved-rule mt-10 max-w-xs" />
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {MAPS.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/research/maps/${m.slug}`}
                className="block h-full border border-[color:var(--hairline)] bg-[color:var(--bone)] p-7 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
              >
                <div className="font-display text-[20px] uppercase text-[color:var(--basalt)]">{m.title}</div>
                <p className="mt-3 text-[15px] leading-[1.6] text-[color:var(--basalt-2)]">{m.line}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
